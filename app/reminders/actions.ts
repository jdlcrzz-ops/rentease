"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";

const STAGES = ["upcoming", "due_today", "overdue"];

export async function markReminderSent(formData: FormData) {
  const billId = String(formData.get("bill_id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!billId || !STAGES.includes(stage))
    redirect("/reminders?error=Something went wrong. Please try again.");

  const { supabase, orgId } = await requireOrg();
  const { error } = await supabase
    .from("reminder_log")
    .insert({ organization_id: orgId, bill_id: billId, stage });

  if (error) redirect(`/reminders?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/reminders");
  redirect(`/reminders?message=${encodeURIComponent("Marked as sent.")}`);
}
