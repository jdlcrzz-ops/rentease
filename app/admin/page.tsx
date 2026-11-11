import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/org";
import { adminSetSubscription } from "./actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default function AdminPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}

type Row = {
  org_id: string;
  business_name: string;
  owner_email: string | null;
  created_on: string;
  properties_count: number;
  beds_count: number;
  tenants_count: number;
  sub_status: "trialing" | "active" | "canceled";
  trial_end: string;
  period_end: string | null;
  price: number;
  has_access: boolean;
};

function day(ts: string | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function Admin({ searchParams }: Props) {
  await connection();
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (isAdmin !== true) notFound();

  const { data, error: listError } = await supabase.rpc("admin_list_businesses");
  const rows = (data ?? []) as Row[];

  const trialing = rows.filter((r) => r.sub_status === "trialing").length;
  const paying = rows.filter((r) => r.sub_status === "active").length;
  const mrr = rows
    .filter((r) => r.sub_status === "active")
    .reduce((sum, r) => sum + Number(r.price) * Math.max(r.properties_count, 1), 0);

  return (
    <main className="md-page">
      <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Dashboard
      </Link>
      <header className="mb-6 mt-5">
        <h1 className="md-display">Admin</h1>
        <p className="md-muted mt-2">All businesses and their subscriptions.</p>
      </header>

      {listError && <p className="md-banner-error mb-4">{listError.message}</p>}
      {error && <p className="md-banner-error mb-4">{error}</p>}
      {message && <p className="md-banner-ok mb-4">{message}</p>}

      <section className="grid grid-cols-3 gap-3">
        <div className="md-stat">
          <div className="md-label md-muted">Trialing</div>
          <div className="md-stat-value">{trialing}</div>
        </div>
        <div className="md-stat">
          <div className="md-label md-muted">Paying</div>
          <div className="md-stat-value">{paying}</div>
        </div>
        <div className="md-stat">
          <div className="md-label md-muted">Monthly</div>
          <div className="md-stat-value">{formatPeso(mrr)}</div>
        </div>
      </section>

      <section className="md-stack mt-6">
        {rows.length === 0 && <p className="md-muted">No businesses yet.</p>}
        {rows.map((r) => {
          const owes = Number(r.price) * Math.max(r.properties_count, 1);
          let chip = "md-chip-occupied";
          let label = `Trial until ${day(r.trial_end)}`;
          if (r.sub_status === "active") {
            chip = "md-chip-vacant";
            label = `Paid until ${day(r.period_end)}`;
          } else if (r.sub_status === "canceled") {
            chip = "md-chip-error";
            label = "Canceled";
          }
          if (!r.has_access && r.sub_status !== "canceled") chip = "md-chip-error";

          return (
            <div key={r.org_id} className="md-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="md-title">{r.business_name}</div>
                  <div className="md-muted text-sm">{r.owner_email ?? "no email"}</div>
                </div>
                <span className={`md-chip ${chip}`}>{label}</span>
              </div>

              <p className="md-muted mt-2 text-sm">
                {r.properties_count} propert{r.properties_count === 1 ? "y" : "ies"} ·{" "}
                {r.beds_count} beds · {r.tenants_count} tenants · Joined{" "}
                {day(r.created_on)} · Bills {formatPeso(owes)}/month
                {!r.has_access && " · Locked out"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={adminSetSubscription}>
                  <input type="hidden" name="org_id" value={r.org_id} />
                  <input type="hidden" name="action" value="mark_paid" />
                  <input type="hidden" name="days" value="30" />
                  <button className="md-btn md-btn-filled md-btn-sm">
                    Mark paid +30 days
                  </button>
                </form>
                {r.sub_status !== "active" && (
                  <form action={adminSetSubscription}>
                    <input type="hidden" name="org_id" value={r.org_id} />
                    <input type="hidden" name="action" value="extend_trial" />
                    <input type="hidden" name="days" value="14" />
                    <button className="md-btn md-btn-tonal md-btn-sm">
                      Extend trial +14 days
                    </button>
                  </form>
                )}
                {r.sub_status !== "canceled" && (
                  <form action={adminSetSubscription}>
                    <input type="hidden" name="org_id" value={r.org_id} />
                    <input type="hidden" name="action" value="cancel" />
                    <button className="md-btn md-btn-danger md-btn-sm">Cancel</button>
                  </form>
                )}
              </div>

              <form action={adminSetSubscription} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="org_id" value={r.org_id} />
                <input type="hidden" name="action" value="set_price" />
                <label className="md-field" style={{ maxWidth: 200 }}>
                  <input
                    name="price"
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={Number(r.price)}
                    placeholder=" "
                    required
                  />
                  <span>Price per property</span>
                </label>
                <button className="md-btn md-btn-outlined md-btn-sm">Set price</button>
              </form>
            </div>
          );
        })}
      </section>
    </main>
  );
}
