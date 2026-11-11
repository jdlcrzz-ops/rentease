import type { SupabaseClient } from "@supabase/supabase-js";

export type Access = {
  status: "trialing" | "active" | "canceled";
  has_access: boolean;
  days_left: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  price_per_property: number;
  properties: number;
  amount_due: number;
  in_grace: boolean;
};

// Asks the database whether this business may use the app right now.
// Returns null if the check could not run (for example, before the
// 006 database update is applied), so nobody is locked out by mistake.
export async function getAccess(
  supabase: SupabaseClient,
  orgId: string
): Promise<Access | null> {
  const { data, error } = await supabase.rpc("get_access", { org: orgId });
  if (error || !data) return null;
  return data as Access;
}
