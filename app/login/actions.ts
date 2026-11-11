"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LEGAL } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fail = (msg: string): never =>
    redirect(`/signup?error=${encodeURIComponent(msg)}`);

  if (formData.get("agree") !== "on")
    fail("Please agree to the Terms and Privacy Notice to continue.");
  if (password.length < 8) fail("Please use a password with at least 8 characters.");

  // Where the confirmation link should send people (works locally and live)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${proto}://${host}/auth/confirm?next=/dashboard`,
      // Keep proof of which terms were accepted, and when
      data: {
        accepted_terms_version: LEGAL.version,
        accepted_terms_at: new Date().toISOString(),
      },
    },
  });

  if (error) fail(error.message);

  // If email confirmation is ON in Supabase, there is no session yet.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Account created. Check your email to confirm, then sign in.")}`
    );
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
