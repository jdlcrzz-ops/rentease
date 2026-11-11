"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";

export async function addTenant(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect("/tenants?error=Please enter the tenant's name");

  const { supabase, orgId } = await requireOrg();
  const { error } = await supabase.from("tenants").insert({
    organization_id: orgId,
    full_name: fullName,
    phone: text("phone"),
    email: text("email"),
    emergency_contact_name: text("emergency_contact_name"),
    emergency_contact_phone: text("emergency_contact_phone"),
  });

  if (error) redirect(`/tenants?error=${encodeURIComponent(error.message)}`);
  redirect("/tenants");
}

// What tenants see on their page: where to send payments.
export async function savePaymentInstructions(formData: FormData) {
  const text = String(formData.get("payment_instructions") ?? "").trim();
  if (text.length > 1000)
    redirect("/tenants?error=Payment details are too long (max 1000 characters)");

  const { supabase, orgId } = await requireOrg();
  const { error } = await supabase
    .from("organizations")
    .update({ payment_instructions: text || null })
    .eq("id", orgId);

  if (error) redirect(`/tenants?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenants");
  redirect(`/tenants?message=${encodeURIComponent("Payment details saved.")}`);
}

// Makes the old link stop working and creates a new private link.
export async function regeneratePortalLink(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) redirect("/tenants");

  const newToken = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
  const { supabase } = await requireOrg();
  const { error } = await supabase
    .from("tenants")
    .update({ portal_token: newToken })
    .eq("id", tenantId);

  if (error) redirect(`/tenants?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenants");
  redirect(
    `/tenants?message=${encodeURIComponent("New link created. The old link no longer works.")}`
  );
}

// Change a tenant's name or contact details.
export async function updateTenant(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const tenantId = String(formData.get("tenant_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!tenantId) redirect("/tenants");
  if (!fullName) redirect("/tenants?error=The tenant's name can't be empty");

  const { supabase } = await requireOrg();
  const { error } = await supabase
    .from("tenants")
    .update({
      full_name: fullName,
      phone: text("phone"),
      email: text("email"),
      emergency_contact_name: text("emergency_contact_name"),
      emergency_contact_phone: text("emergency_contact_phone"),
    })
    .eq("id", tenantId);

  if (error) redirect(`/tenants?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenants");
  redirect(`/tenants?message=${encodeURIComponent("Tenant updated.")}`);
}

// Hide a tenant who has left. Their old bills and payments are kept.
export async function archiveTenant(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) redirect("/tenants");

  const { supabase } = await requireOrg();

  const { data: stay } = await supabase
    .from("occupancies")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("move_out_date", null)
    .limit(1)
    .maybeSingle();
  if (stay)
    redirect(
      `/tenants?error=${encodeURIComponent("Move this tenant out of their bed first.")}`
    );

  const { data: owed } = await supabase
    .from("bill_details")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", ["unpaid", "partial", "overdue"])
    .limit(1)
    .maybeSingle();
  if (owed)
    redirect(
      `/tenants?error=${encodeURIComponent("This tenant still has an unpaid bill. Record or approve their payment first.")}`
    );

  const { error } = await supabase
    .from("tenants")
    .update({ archived: true })
    .eq("id", tenantId);
  if (error) redirect(`/tenants?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/tenants");
  redirect(`/tenants?message=${encodeURIComponent("Tenant archived.")}`);
}
