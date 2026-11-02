"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;
const METHODS = ["gcash", "maya", "bank_transfer"];

// A tenant sends a screenshot of their payment. The owner approves it later.
export async function submitProof(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const billId = String(formData.get("bill_id") ?? "");
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference_no") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const file = formData.get("proof");
  const back = `/t/${encodeURIComponent(token)}`;

  function fail(msg: string): never {
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  if (!token || !billId) fail("Something went wrong. Please try again.");
  if (!METHODS.includes(method)) fail("Please choose how you paid");
  if (!Number.isFinite(amount) || amount <= 0)
    fail("Please enter the amount you paid");
  if (!(file instanceof File) || file.size === 0)
    fail("Please attach a screenshot or photo of your payment");
  if (file.size > MAX_BYTES)
    fail("That image is too large. Please use one under 5 MB.");
  const ext = EXT[file.type];
  if (!ext) fail("Please upload a JPG, PNG or WEBP image");

  const supabase = await createClient();

  // Each tenant's files live in their own folder, named by their private token
  const path = `${token}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) fail("We couldn't upload your image. Please try again.");

  const { error } = await supabase.rpc("portal_submit_payment", {
    p_token: token,
    p_bill: billId,
    p_amount: amount,
    p_method: method,
    p_reference: reference,
    p_proof_path: path,
  });
  if (error) fail(error.message);

  redirect(
    `${back}?message=${encodeURIComponent(
      "Thank you! Your payment was sent. The owner will confirm it soon."
    )}`
  );
}
