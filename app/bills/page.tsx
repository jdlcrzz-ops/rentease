import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  formatDate,
  formatMonth,
  formatPeso,
  requireOrg,
  todayInManila,
} from "@/lib/org";
import {
  approvePayment,
  recordPayment,
  refreshBills,
  rejectPayment,
} from "./actions";

type Props = {
  searchParams: Promise<{ filter?: string; error?: string; message?: string }>;
};

export default function BillsPage(props: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Bills {...props} />
    </Suspense>
  );
}

const OPEN = ["unpaid", "partial", "overdue"];

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function Bills({ searchParams }: Props) {
  await connection();
  const sp = await searchParams;
  const filter = ["open", "paid", "all"].includes(sp.filter ?? "")
    ? (sp.filter as string)
    : "open";
  const { supabase } = await requireOrg();
  const today = todayInManila();
  const monthStart = `${today.slice(0, 7)}-01`;

  // Bills to show
  let query = supabase
    .from("bill_details")
    .select("*")
    .neq("status", "void")
    .order("due_date", { ascending: false })
    .limit(150);
  if (filter === "open") query = query.in("status", OPEN);
  if (filter === "paid") query = query.eq("status", "paid");
  const { data: bills, error: billsError } = await query;

  // Summary numbers always come from ALL open bills
  const { data: openBills } = await supabase
    .from("bill_details")
    .select("total_amount, paid_amount, due_date, grace_days")
    .in("status", OPEN);

  let outstanding = 0;
  let overdueCount = 0;
  for (const b of openBills ?? []) {
    outstanding += Number(b.total_amount) - Number(b.paid_amount);
    if (today > addDays(b.due_date, Number(b.grace_days ?? 0))) overdueCount += 1;
  }

  const { data: monthPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "approved")
    .gte("paid_at", monthStart);
  const collected = (monthPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  // Recent payments with who paid
  const { data: recent } = await supabase
    .from("payments")
    .select("id, bill_id, amount, method, paid_at, reference_no")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);
  const recentIds = (recent ?? []).map((p) => p.bill_id);
  const { data: recentBills } = recentIds.length
    ? await supabase
        .from("bill_details")
        .select("id, tenant_name, period_start")
        .in("id", recentIds)
    : { data: [] };
  const billById = new Map((recentBills ?? []).map((b) => [b.id, b]));

  // Payments tenants sent from their portal, waiting for approval
  const { data: pending } = await supabase
    .from("payments")
    .select("id, bill_id, amount, method, reference_no, proof_path, paid_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(30);
  const pendingBillIds = (pending ?? []).map((p) => p.bill_id);
  const { data: pendingBills } = pendingBillIds.length
    ? await supabase
        .from("bill_details")
        .select("id, tenant_name, period_start, bed_label, room_name, property_name")
        .in("id", pendingBillIds)
    : { data: [] };
  const pendingBillById = new Map((pendingBills ?? []).map((b) => [b.id, b]));

  const proofPaths = (pending ?? [])
    .map((p) => p.proof_path as string | null)
    .filter((x): x is string => !!x);
  const proofUrlByPath = new Map<string, string>();
  if (proofPaths.length) {
    const { data: signed } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrls(proofPaths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) proofUrlByPath.set(item.path, item.signedUrl);
    }
  }

  const tabs = [
    { key: "open", label: "Open" },
    { key: "paid", label: "Paid" },
    { key: "all", label: "All" },
  ];

  return (
    <main className="md-page">
      <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Dashboard
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="md-display">Bills</h1>
        <p className="md-muted mt-2">
          {formatMonth(monthStart)} · who owes, who paid.
        </p>
      </header>

      {billsError && (
        <p className="md-banner-error mb-4">
          Couldn&apos;t load your bills: {billsError.message}. If this mentions
          &quot;bill_details&quot;, run 003b_bill_details_view.sql in Supabase.
        </p>
      )}
      {sp.error && <p className="md-banner-error mb-4">{sp.error}</p>}
      {sp.message && <p className="md-banner-ok mb-4">{sp.message}</p>}

      {(pending ?? []).length > 0 && (
        <section className="md-stack mb-8">
          <h2 className="md-headline">
            Needs your review ({(pending ?? []).length})
          </h2>
          {(pending ?? []).map((p) => {
            const bill = pendingBillById.get(p.bill_id);
            const url = p.proof_path ? proofUrlByPath.get(p.proof_path) : undefined;
            return (
              <div key={p.id} className="md-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="md-title">{bill?.tenant_name ?? "Tenant"}</div>
                    <div className="md-muted text-sm">
                      {bill
                        ? `${bill.property_name} · ${bill.room_name} · ${bill.bed_label} · ${formatMonth(bill.period_start)}`
                        : ""}
                    </div>
                  </div>
                  <div className="md-stat-value">{formatPeso(p.amount)}</div>
                </div>
                <div className="md-muted mt-2 text-sm">
                  {String(p.method).replace("_", " ")}
                  {p.reference_no ? ` · Ref ${p.reference_no}` : ""}
                  {" · "}
                  {formatDate(p.paid_at)}
                </div>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="mt-3 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Proof of payment" className="md-proof" />
                  </a>
                ) : (
                  <p className="md-muted mt-3 text-sm">No image found.</p>
                )}
                <div className="mt-4 flex gap-2">
                  <form action={approvePayment}>
                    <input type="hidden" name="payment_id" value={p.id} />
                    <button className="md-btn md-btn-filled md-btn-sm">
                      Approve
                    </button>
                  </form>
                  <form action={rejectPayment}>
                    <input type="hidden" name="payment_id" value={p.id} />
                    <button className="md-btn md-btn-danger md-btn-sm">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <div className="md-stat">
          <div className="md-label md-muted">Collected</div>
          <div className="md-stat-value">{formatPeso(collected)}</div>
        </div>
        <div className="md-stat">
          <div className="md-label md-muted">Outstanding</div>
          <div className="md-stat-value">{formatPeso(outstanding)}</div>
        </div>
        <div className="md-stat">
          <div className="md-label md-muted">Overdue</div>
          <div className="md-stat-value">{overdueCount}</div>
        </div>
      </section>

      <form action={refreshBills} className="mt-5">
        <button className="md-btn md-btn-filled md-btn-block">
          Update bills
        </button>
        <p className="md-muted mt-2 text-sm">
          Creates this month&apos;s bills for every current tenant and adds late
          fees to bills that are past their grace period. Safe to press any
          time.
        </p>
      </form>

      <nav className="mb-4 mt-8 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/bills?filter=${t.key}`}
            className={`md-btn md-btn-sm ${
              filter === t.key ? "md-btn-filled" : "md-btn-tonal"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="md-stack">
        {(bills ?? []).length === 0 && (
          <p className="md-muted">
            {filter === "open"
              ? "No open bills. Press Update bills to create this month's bills."
              : "Nothing here yet."}
          </p>
        )}

        {(bills ?? []).map((b) => {
          const total = Number(b.total_amount);
          const paid = Number(b.paid_amount);
          const balance = Math.round((total - paid) * 100) / 100;
          const pastDue = today > addDays(b.due_date, Number(b.grace_days ?? 0));
          const isOverdue = balance > 0 && pastDue;

          let label = "Due";
          let chip = "md-chip-occupied";
          if (b.status === "paid") {
            label = "Paid";
            chip = "md-chip-vacant";
          } else if (isOverdue) {
            label = "Overdue";
            chip = "md-chip-error";
          } else if (b.status === "partial") {
            label = "Partial";
            chip = "md-chip-reserved";
          }

          return (
            <div key={b.id} className="md-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="md-title">{b.tenant_name}</div>
                  <div className="md-muted text-sm">
                    {b.property_name} · {b.room_name} · {b.bed_label}
                  </div>
                </div>
                <span className={`md-chip ${chip}`}>{label}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="md-label md-muted">
                    {formatMonth(b.period_start)}
                  </div>
                  <div className="md-stat-value">{formatPeso(total)}</div>
                </div>
                <div className="text-right text-sm md-muted">
                  <div>Due {formatDate(b.due_date)}</div>
                  <div>
                    Paid {formatPeso(paid)}
                    {balance > 0 && ` · Balance ${formatPeso(balance)}`}
                  </div>
                  {Number(b.late_fee_amount) > 0 && (
                    <div>Includes late fee {formatPeso(b.late_fee_amount)}</div>
                  )}
                </div>
              </div>

              {balance > 0 && (
                <details className="mt-4">
                  <summary className="md-btn md-btn-outlined md-btn-sm">
                    Record payment
                  </summary>
                  <form
                    action={recordPayment}
                    className="mt-3 flex flex-col gap-3"
                  >
                    <input type="hidden" name="bill_id" value={b.id} />
                    <input type="hidden" name="filter" value={filter} />
                    <label className="md-field">
                      <input
                        name="amount"
                        type="number"
                        min={0.01}
                        max={balance}
                        step="0.01"
                        defaultValue={balance}
                        placeholder=" "
                        required
                      />
                      <span>Amount received (PHP)</span>
                    </label>
                    <label className="md-labeled">
                      <span>Method</span>
                      <select name="method" required defaultValue="cash">
                        <option value="cash">Cash</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank_transfer">Bank transfer</option>
                      </select>
                    </label>
                    <label className="md-labeled">
                      <span>Date received</span>
                      <input
                        name="paid_at"
                        type="date"
                        defaultValue={today}
                        required
                      />
                    </label>
                    <label className="md-field">
                      <input name="reference_no" placeholder=" " />
                      <span>Reference number (optional)</span>
                    </label>
                    <button className="md-btn md-btn-filled md-btn-sm">
                      Save payment
                    </button>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </section>

      {(recent ?? []).length > 0 && (
        <section className="md-card mt-8">
          <h2 className="md-title">Recent payments</h2>
          <div className="md-rows mt-2">
            {(recent ?? []).map((p) => {
              const bill = billById.get(p.bill_id);
              return (
                <div key={p.id} className="md-row">
                  <div className="md-row-main">
                    <div>
                      <div className="font-medium">
                        {bill?.tenant_name ?? "Tenant"}
                      </div>
                      <div className="md-muted text-sm">
                        {bill ? formatMonth(bill.period_start) : ""} ·{" "}
                        {String(p.method).replace("_", " ")} ·{" "}
                        {formatDate(p.paid_at)}
                        {p.reference_no ? ` · Ref ${p.reference_no}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold">{formatPeso(p.amount)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
