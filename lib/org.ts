import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user and their business, or sends them to the right page.
export async function requireOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row Level Security means this only returns businesses the user belongs to.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1)
    .maybeSingle();
  if (!org) redirect("/dashboard");

  return { supabase, user, orgId: org.id as string, orgName: org.name as string };
}

export function formatPeso(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined || amount === "") return "-";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

// Today's date in the Philippines as YYYY-MM-DD (only call after connection()).
export function todayInManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonth(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}
