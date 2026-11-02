"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fail = (msg: string): never =>
    redirect(`/reset-password?error=${encodeURIComponent(msg)}`);

  if (password.length < 8) fail("Please use at least 8 characters.");
  if (password !== confirm) fail("The two passwords don't match.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "Your reset link has expired. Please request a new one."
      )}`
    );

  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error.message);

  // Sign out every other device that was using the old password
  await supabase.auth.signOut({ scope: "others" });

  redirect("/dashboard");
}
