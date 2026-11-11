"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function adminSetSubscription(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const action = String(formData.get("action") ?? "");
  const daysRaw = String(formData.get("days") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_subscription", {
    org: orgId,
    action,
    days: daysRaw === "" ? null : Number(daysRaw),
    new_price: priceRaw === "" ? null : Number(priceRaw),
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent("Updated.")}`);
}
