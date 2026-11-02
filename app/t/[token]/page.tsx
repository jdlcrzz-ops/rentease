import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMonth, formatPeso, todayInManila } from "@/lib/org";
import { submitProof } from "./actions";

// Keep these private pages out of search engines
export const metadata: Metadata = {
  title: "My rent",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

type PortalBill = {
  id: string;
  period_start: string;
  due_date: string;
  total_amount: number;
  late_fee_amount: number;
  status: string;
  paid_amount: number;
  pending_amount: number;
};

type PortalData = {
  tenant_name: string;
  business_name: string;
  payment_instructions: string | null;
  stay: { property: string; room: string; bed: string } | null;
  bills: PortalBill[];
};

export default function PortalPage(props: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Portal {...props} />
    </Suspense>
  );
}

async function Portal({ params, searchParams }: Props) {
  await connection();
  const { token } = await params;
  const { error, message } = await searchParams;
  const today = todayInManila();

  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_get", { p_token: token });
  const portal = data as PortalData | null;

  if (!portal) {
    return (
      <main className="md-page flex min-h-screen flex-col justify-center">
        <h1 className="md-headline">This link isn&apos;t valid</h1>
        <p className="md-muted mt-2">
          It may have been replaced. Please ask your landlord for a new link.
        </p>
      </main>
    );
  }

  const bills = portal.bills ?? [];

  return (
    <main className="md-page">
      <header className="mb-6">
        <p className="md-label md-muted">{portal.business_name}</p>
        <h1 className="md-display">Hi, {portal.tenant_name.split(" ")[0]}</h1>
        {portal.stay && (
          <p className="md-muted mt-2">
            {portal.stay.property} · {portal.stay.room} · {portal.stay.bed}
          </p>
        )}
      </header>

      {error && <p className="md-banner-error mb-4">{error}</p>}
      {message && <p className="md-banner-ok mb-4">{message}</p>}

      {portal.payment_instructions && (
        <section className="md-hero mb-6" style={{ borderRadius: "32px 32px 32px 12px" }}>
          <p className="md-label" style={{ opacity: 0.75 }}>
            How to pay
          </p>
          <p className="mt-2 whitespace-pre-line">{portal.payment_instructions}</p>
        </section>
      )}

      <section className="md-stack">
        <h2 className="md-headline">Your bills</h2>
        {bills.length === 0 && (
          <p className="md-muted">No bills yet. They will show up here.</p>
        )}

        {bills.map((b) => {
          const total = Number(b.total_amount);
          const paid = Number(b.paid_amount);
          const pending = Number(b.pending_amount);
          const balance = Math.round((total - paid) * 100) / 100;
          const canPay = balance - pending > 0.009;
          const pastDue = balance > 0 && today > b.due_date;

          let label = "Due";
          let chip = "md-chip-occupied";
          if (balance <= 0) {
            label = "Paid";
            chip = "md-chip-vacant";
          } else if (pastDue) {
            label = "Past due";
            chip = "md-chip-error";
          }

          return (
            <div key={b.id} className="md-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="md-label md-muted">{formatMonth(b.period_start)}</div>
                  <div className="md-stat-value">{formatPeso(total)}</div>
                </div>
                <span className={`md-chip ${chip}`}>{label}</span>
              </div>

              <div className="md-muted mt-2 text-sm">
                <div>Due {formatDate(b.due_date)}</div>
                {Number(b.late_fee_amount) > 0 && (
                  <div>Includes late fee {formatPeso(b.late_fee_amount)}</div>
                )}
                <div>
                  Paid {formatPeso(paid)}
                  {balance > 0 && ` · Balance ${formatPeso(balance)}`}
                </div>
                {pending > 0 && (
                  <div>Waiting for owner to confirm: {formatPeso(pending)}</div>
                )}
              </div>

              {canPay && (
                <details className="mt-4">
                  <summary className="md-btn md-btn-filled md-btn-sm">
                    Send proof of payment
                  </summary>
                  <form action={submitProof} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="bill_id" value={b.id} />
                    <label className="md-field">
                      <input
                        name="amount"
                        type="number"
                        min={0.01}
                        max={balance - pending}
                        step="0.01"
                        defaultValue={Math.round((balance - pending) * 100) / 100}
                        placeholder=" "
                        required
                      />
                      <span>Amount you paid (PHP)</span>
                    </label>
                    <label className="md-labeled">
                      <span>How did you pay?</span>
                      <select name="method" required defaultValue="gcash">
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank_transfer">Bank transfer</option>
                      </select>
                    </label>
                    <label className="md-field">
                      <input name="reference_no" placeholder=" " maxLength={60} />
                      <span>Reference number (optional)</span>
                    </label>
                    <label className="md-labeled">
                      <span>Screenshot or photo of your payment</span>
                      <input
                        name="proof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                      />
                    </label>
                    <button className="md-btn md-btn-filled md-btn-block">
                      Send
                    </button>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </section>

      <p className="md-muted mt-8 text-xs">
        This page is private to you. Please don&apos;t share the link.
      </p>
    </main>
  );
}
