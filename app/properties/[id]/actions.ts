"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
// Blank input -> null, otherwise a number.
const num = (v: FormDataEntryValue | null) =>
  v === null || String(v).trim() === "" ? null : Number(v);

export async function addRoom(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const floor = String(formData.get("floor") ?? "").trim();
  const bedCount = Number(formData.get("bed_count"));
  const rate = Number(formData.get("rate"));
  const back = `/properties/${propertyId}`;
  function fail(msg: string): never {
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  if (!propertyId) redirect("/dashboard");
  if (!name) fail("Please enter a room name");
  if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > 20)
    fail("Number of beds must be a whole number from 1 to 20");
  if (!Number.isFinite(rate) || rate < 0 || rate > 1000000)
    fail("Monthly rate must be between 0 and 1,000,000");

  const { supabase, orgId } = await requireOrg();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      organization_id: orgId,
      property_id: propertyId,
      name,
      floor: floor || null,
    })
    .select("id")
    .single();
  if (roomError) fail(roomError.message);

  const bedRows = Array.from({ length: bedCount }, (_, i) => ({
    organization_id: orgId,
    room_id: room.id,
    label: `Bed ${i + 1}`,
    monthly_rate: rate,
  }));
  const { error: bedError } = await supabase.from("beds").insert(bedRows);
  if (bedError) fail(bedError.message);

  revalidatePath(back);
  redirect(back);
}

export async function deleteRoom(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  const roomId = String(formData.get("room_id") ?? "");
  const back = `/properties/${propertyId}`;

  if (!propertyId || !roomId) redirect("/dashboard");

  const { supabase } = await requireOrg();
  // Beds are removed automatically with their room.
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);

  if (error) {
    const msg =
      error.code === "23503"
        ? "This room has tenants or billing history, so it can't be deleted."
        : error.message;
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(back);
  redirect(back);
}

export async function moveIn(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  const tenantId = String(formData.get("tenant_id") ?? "");
  const bedId = String(formData.get("bed_id") ?? "");
  const moveInDate = String(formData.get("move_in_date") ?? "");
  const back = `/properties/${propertyId}`;
  function fail(msg: string): never {
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  if (!propertyId) redirect("/dashboard");
  if (!tenantId) fail("Please choose a tenant");
  if (!bedId) fail("Please choose a bed");
  if (!isDate(moveInDate)) fail("Please enter a valid move-in date");

  const { supabase, orgId } = await requireOrg();

  const { data: bed } = await supabase
    .from("beds")
    .select("id, monthly_rate, status")
    .eq("id", bedId)
    .maybeSingle();
  if (!bed) fail("That bed was not found");
  if (bed.status === "occupied") fail("That bed already has a tenant");

  const { data: existing } = await supabase
    .from("occupancies")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("move_out_date", null)
    .limit(1)
    .maybeSingle();
  if (existing) fail("This tenant already has a bed. Move them out first.");

  // Blank fields fall back to sensible defaults.
  const rate = num(formData.get("monthly_rate")) ?? Number(bed.monthly_rate ?? 0);
  const deposit = num(formData.get("deposit_amount")) ?? 0;
  const dueDay = num(formData.get("due_day")) ?? Number(moveInDate.slice(8, 10));
  const graceDays = num(formData.get("grace_days")) ?? 3;
  const lateFee = num(formData.get("late_fee")) ?? 0;

  if (!Number.isFinite(rate) || rate < 0 || rate > 1000000)
    fail("Monthly rate must be between 0 and 1,000,000");
  if (!Number.isFinite(deposit) || deposit < 0 || deposit > 1000000)
    fail("Deposit must be between 0 and 1,000,000");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
    fail("Due day must be a whole number from 1 to 31");
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 30)
    fail("Grace days must be a whole number from 0 to 30");
  if (!Number.isFinite(lateFee) || lateFee < 0 || lateFee > 100000)
    fail("Late fee must be between 0 and 100,000");

  const { error } = await supabase.from("occupancies").insert({
    organization_id: orgId,
    tenant_id: tenantId,
    bed_id: bedId,
    move_in_date: moveInDate,
    monthly_rate: rate,
    deposit_amount: deposit,
    due_day: dueDay,
    grace_days: graceDays,
    late_fee: lateFee,
  });
  if (error)
    fail(error.code === "23505" ? "That bed already has a tenant" : error.message);

  revalidatePath(back);
  redirect(back);
}

export async function moveOut(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  const occupancyId = String(formData.get("occupancy_id") ?? "");
  const moveOutDate = String(formData.get("move_out_date") ?? "");
  const back = `/properties/${propertyId}`;
  function fail(msg: string): never {
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  if (!propertyId || !occupancyId) redirect("/dashboard");
  if (!isDate(moveOutDate)) fail("Please enter a valid move-out date");

  const { supabase } = await requireOrg();

  const { data: occ } = await supabase
    .from("occupancies")
    .select("id, move_in_date, move_out_date")
    .eq("id", occupancyId)
    .maybeSingle();
  if (!occ || occ.move_out_date) fail("This tenant has already moved out");
  if (moveOutDate < occ.move_in_date)
    fail("Move-out date can't be before the move-in date");

  const { error } = await supabase
    .from("occupancies")
    .update({ move_out_date: moveOutDate })
    .eq("id", occupancyId);
  if (error) fail(error.message);

  revalidatePath(back);
  redirect(back);
}
