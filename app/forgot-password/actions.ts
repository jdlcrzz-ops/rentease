"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/forgot-password?error=Please enter your email");

  // Build our own address so the link works on localhost and on the live site
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    const tooMany =
      error.status === 429 || /rate limit|after \d+ seconds/i.test(error.message);
    const msg = tooMany
      ? "Please wait a minute before asking for another email."
      : `We couldn't send the email right now. Please try again in a few minutes. (${error.message})`;
    redirect(`/forgot-password?error=${encodeURIComponent(msg)}`);
  }

  // Same answer whether or not the email has an account, so nobody can
  // use this form to discover who is registered.
  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "If that email has an account, a reset link is on its way. Check your inbox and spam folder."
    )}`
  );
}
