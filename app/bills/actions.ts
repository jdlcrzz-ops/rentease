"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";

const METHODS = ["cash", "gcash", "maya", "bank_transfer"];
const isDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

function fail(msg: string, filter = "open"): never {
  redirect(`/bills?filter=${filter}&error=${encodeURIComponent(msg)}`);
}

// Creates this month's bills, adds late fees, refreshes statuses.
export async function refreshBills() {
  const { supabase, orgId } = await requireOrg();
  const { data, error } = await supabase.rpc("refresh_bills", { org: orgId });
  if (error) fail(error.message);

  const created = data?.created ?? 0;
  const fees = data?.late_fees ?? 0;
  revalidatePath("/bills");
  redirect(
    `/bills?message=${encodeURIComponent(
      `Done. ${created} new bill(s) created and ${fees} late fee(s) applied.`
    )}`
  );
}

export async function recordPayment(formData: FormData) {
  const billId = String(formData.get("bill_id") ?? "");
  const filter = String(formData.get("filter") ?? "open");
  const method = String(formData.get("method") ?? "");
  const paidAt = String(formData.get("paid_at") ?? "");
  const reference = String(formData.get("reference_no") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!billId) redirect("/bills");
  if (!METHODS.includes(method)) fail("Please choose a payment method", filter);
  if (!isDate(paidAt)) fail("Please enter a valid payment date", filter);
  if (!Number.isFinite(amount) || amount <= 0)
    fail("Please enter an amount greater than 0", filter);

  const { supabase, orgId, user } = await requireOrg();

  const { data: bill, error: billError } = await supabase
    .from("bill_details")
    .select("id, total_amount, paid_amount, status")
    .eq("id", billId)
    .maybeSingle();
  if (billError) fail(`Couldn't load the bill: ${billError.message}`, filter);
  if (!bill) fail("That bill was not found", filter);
  if (bill.status === "void") fail("This bill was voided", filter);

  // Work in centavos to avoid decimal rounding problems
  const balance =
    Math.round(Number(bill.total_amount) * 100) -
    Math.round(Number(bill.paid_amount) * 100);
  const cents = Math.round(amount * 100);
  if (cents > balance)
    fail(
      `That is more than the remaining balance of ${(balance / 100).toFixed(2)}`,
      filter
    );

  const { error } = await supabase.from("payments").insert({
    organization_id: orgId,
    bill_id: billId,
    amount: cents / 100,
    method,
    status: "approved",
    reference_no: reference || null,
    paid_at: paidAt,
    approved_by: user.id,
  });
  if (error) fail(error.message, filter);

  revalidatePath("/bills");
  redirect(
    `/bills?filter=${filter}&message=${encodeURIComponent("Payment recorded.")}`
  );
}

// ---------- Review payments that tenants sent from their portal ----------
export async function approvePayment(formData: FormData) {
  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) redirect("/bills");

  const { supabase, user } = await requireOrg();

  const { data: pay } = await supabase
    .from("payments")
    .select("id, bill_id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (!pay || pay.status !== "pending") fail("This payment was already reviewed");

  const { data: bill, error: billError } = await supabase
    .from("bill_details")
    .select("total_amount, paid_amount")
    .eq("id", pay.bill_id)
    .maybeSingle();
  if (billError) fail(`Couldn't load the bill: ${billError.message}`);
  if (!bill) fail("The bill for this payment was not found");

  const balance =
    Math.round(Number(bill.total_amount) * 100) -
    Math.round(Number(bill.paid_amount) * 100);
  if (Math.round(Number(pay.amount) * 100) > balance)
    fail(
      "This is more than what the bill still owes (you may have already recorded a payment). Reject it instead."
    );

  const { error } = await supabase
    .from("payments")
    .update({ status: "approved", approved_by: user.id })
    .eq("id", paymentId);
  if (error) fail(error.message);

  revalidatePath("/bills");
  redirect(`/bills?message=${encodeURIComponent("Payment approved.")}`);
}

export async function rejectPayment(formData: FormData) {
  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) redirect("/bills");

  const { supabase } = await requireOrg();
  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", paymentId)
    .eq("status", "pending");
  if (error) fail(error.message);

  revalidatePath("/bills");
  redirect(`/bills?message=${encodeURIComponent("Payment rejected.")}`);
}
