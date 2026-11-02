"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/org";

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/dashboard?error=Please enter a business name");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
  });

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createProperty(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (!name) redirect("/dashboard?error=Please enter a property name");

  const { supabase, orgId } = await requireOrg();
  const { data, error } = await supabase
    .from("properties")
    .insert({ organization_id: orgId, name, address: address || null })
    .select("id")
    .single();

  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  redirect(`/properties/${data.id}`);
}
