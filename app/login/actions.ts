"use server";

import { redirect } from "next/navigation";
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
  if (String(formData.get("password") ?? "").length < 8)
    redirect(
      `/login?error=${encodeURIComponent("Please use a password with at least 8 characters.")}`
    );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

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
