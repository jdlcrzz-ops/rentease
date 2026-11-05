import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { CopyButton } from "@/components/copy-button";
import { formatDate, formatPeso, requireOrg, todayInManila } from "@/lib/org";
import {
  addDays,
  buildMessage,
  daysBetween,
  shouldRemind,
  smsHref,
  stageFor,
  type Stage,
} from "@/lib/reminders";
import { markReminderSent } from "./actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default function RemindersPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Reminders searchParams={searchParams} />
    </Suspense>
  );
}

type Item = {
  billId: string;
  stage: Stage;
  tenantName: string;
  where: string;
  balance: number;
  dueDate: string;
  daysFromDue: number;
  phone: string | null;
  message: string;
};

const GROUPS: { stage: Stage; title: string; chip: string }[] = [
  { stage: "overdue", title: "Overdue", chip: "md-chip-error" },
  { stage: "due_today", title: "Due today", chip: "md-chip-reserved" },
  { stage: "upcoming", title: "Due soon (next 3 days)", chip: "md-chip-occupied" },
];

async function Reminders({ searchParams }: Props) {
  await connection();
  const { error, message } = await searchParams;
  const { supabase, orgId } = await requireOrg();
  const today = todayInManila();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  const business = org?.name ?? "Your landlord";

  const { data: bills, error: billsError } = await supabase
    .from("bill_details")
    .select(
      "id, tenant_id, tenant_name, property_name, room_name, bed_label, period_start, due_date, total_amount, paid_amount, late_fee_amount"
    )
    .in("status", ["unpaid", "partial", "overdue"]);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, phone, portal_token")
    .eq("archived", false);
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));

  // Payments the tenant already sent that are waiting for approval
  const { data: pending } = await supabase
    .from("payments")
    .select("bill_id, amount")
    .eq("status", "pending");
  const pendingByBill = new Map<string, number>();
  for (const p of pending ?? [])
    pendingByBill.set(p.bill_id, (pendingByBill.get(p.bill_id) ?? 0) + Number(p.amount));

  // Reminders you already marked as sent
  const { data: logs } = await supabase
    .from("reminder_log")
    .select("bill_id, stage, sent_on")
    .gte("sent_on", addDays(today, -60));
  const sentOn = new Map<string, string[]>();
  for (const l of logs ?? []) {
    const key = `${l.bill_id}:${l.stage}`;
    sentOn.set(key, [...(sentOn.get(key) ?? []), l.sent_on]);
  }

  const items: Item[] = [];
  let alreadySent = 0;
  let waitingApproval = 0;

  for (const b of bills ?? []) {
    const balanceCents =
      Math.round(Number(b.total_amount) * 100) - Math.round(Number(b.paid_amount) * 100);
    if (balanceCents <= 0) continue;
    const balance = balanceCents / 100;

    const stage = stageFor(b.due_date, today);
    if (!stage) continue;

    if (Math.round((pendingByBill.get(b.id) ?? 0) * 100) >= balanceCents) {
      waitingApproval += 1;
      continue;
    }
    if (!shouldRemind(stage, sentOn.get(`${b.id}:${stage}`) ?? [], today)) {
      alreadySent += 1;
      continue;
    }

    const tenant = tenantById.get(b.tenant_id);
    const link = tenant ? `${origin}/t/${tenant.portal_token}` : origin;

    items.push({
      billId: b.id,
      stage,
      tenantName: b.tenant_name,
      where: `${b.property_name} · ${b.room_name} · ${b.bed_label}`,
      balance,
      dueDate: b.due_date,
      daysFromDue: daysBetween(today, b.due_date),
      phone: tenant?.phone ?? null,
      message: buildMessage({
        stage,
        fullName: b.tenant_name,
        business,
        balance,
        lateFee: Number(b.late_fee_amount),
        periodStart: b.period_start,
        dueDate: b.due_date,
        today,
        link,
      }),
    });
  }

  items.sort((a, b) => a.daysFromDue - b.daysFromDue);

  return (
    <main className="md-page">
      <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Dashboard
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="md-display">Reminders</h1>
        <p className="md-muted mt-2">
          Tenants who need a nudge today. Tap Text, or copy the message for
          Messenger, then mark it as sent.
        </p>
      </header>

      {billsError && (
        <p className="md-banner-error mb-4">
          Couldn&apos;t load bills: {billsError.message}
        </p>
      )}
      {error && <p className="md-banner-error mb-4">{error}</p>}
      {message && <p className="md-banner-ok mb-4">{message}</p>}

      {items.length === 0 && (
        <section className="md-card">
          <div className="md-title">You&apos;re all caught up</div>
          <p className="md-muted mt-1 text-sm">
            No one needs a reminder right now.
          </p>
        </section>
      )}

      {GROUPS.map((g) => {
        const list = items.filter((i) => i.stage === g.stage);
        if (list.length === 0) return null;
        return (
          <section key={g.stage} className="md-stack mb-8">
            <h2 className="md-headline">
              {g.title} ({list.length})
            </h2>
            {list.map((i) => (
              <div key={i.billId} className="md-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="md-title">{i.tenantName}</div>
                    <div className="md-muted text-sm">{i.where}</div>
                  </div>
                  <span className={`md-chip ${g.chip}`}>{formatPeso(i.balance)}</span>
                </div>
                <div className="md-muted mt-1 text-sm">
                  Due {formatDate(i.dueDate)}
                  {i.daysFromDue < 0 &&
                    ` · ${Math.abs(i.daysFromDue)} day${Math.abs(i.daysFromDue) === 1 ? "" : "s"} overdue`}
                </div>

                <details className="mt-3">
                  <summary className="md-btn md-btn-outlined md-btn-sm">
                    See message
                  </summary>
                  <p className="md-muted mt-3 whitespace-pre-line text-sm">
                    {i.message}
                  </p>
                </details>

                <div className="mt-4 flex flex-wrap gap-2">
                  {i.phone ? (
                    <a
                      href={smsHref(i.phone, i.message)}
                      className="md-btn md-btn-filled md-btn-sm"
                    >
                      Text {i.phone}
                    </a>
                  ) : (
                    <span className="md-chip md-chip-reserved">
                      No mobile number saved
                    </span>
                  )}
                  <CopyButton text={i.message} label="Copy for Messenger" />
                  <form action={markReminderSent}>
                    <input type="hidden" name="bill_id" value={i.billId} />
                    <input type="hidden" name="stage" value={i.stage} />
                    <button className="md-btn md-btn-outlined md-btn-sm">
                      Mark as sent
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {(alreadySent > 0 || waitingApproval > 0) && (
        <p className="md-muted text-sm">
          {alreadySent > 0 &&
            `${alreadySent} already reminded (overdue ones come back every 3 days). `}
          {waitingApproval > 0 &&
            `${waitingApproval} paid and waiting for your approval on the Bills page.`}
        </p>
      )}
    </main>
  );
}
