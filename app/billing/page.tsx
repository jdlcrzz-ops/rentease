import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LEGAL } from "@/lib/legal";
import { formatPeso, requireOrg } from "@/lib/org";
import { PRICING } from "@/lib/pricing";
import { signOut } from "../login/actions";

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Billing />
    </Suspense>
  );
}

// Show a timestamp as a Philippine date
function day(ts: string | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function Billing() {
  await connection();
  // The owner must be able to open this page even when their access is locked
  const { access, orgName } = await requireOrg({ allowLocked: true });

  if (!access) {
    return (
      <main className="md-page">
        <h1 className="md-display">Billing</h1>
        <p className="md-banner-warn mt-4">
          Billing isn&apos;t set up yet. Run the 006 database update, then reload.
        </p>
      </main>
    );
  }

  let title = "Free trial";
  let detail = `${access.days_left} day${access.days_left === 1 ? "" : "s"} left. Your trial ends on ${day(access.trial_ends_at)}.`;
  let chip = "md-chip-vacant";

  if (access.status === "trialing" && !access.has_access) {
    title = "Your free trial has ended";
    detail = "Subscribe to keep using RentEase. Your data is safe and will be there when you come back.";
    chip = "md-chip-error";
  } else if (access.status === "active" && access.in_grace) {
    title = "Payment overdue";
    detail = `Your subscription ended on ${day(access.current_period_end)}. Please pay now to keep access.`;
    chip = "md-chip-reserved";
  } else if (access.status === "active" && access.has_access) {
    title = "Subscription active";
    detail = `Paid until ${day(access.current_period_end)} (${access.days_left} day${access.days_left === 1 ? "" : "s"} left).`;
  } else if (access.status === "active") {
    title = "Subscription ended";
    detail = `It ended on ${day(access.current_period_end)}. Pay to turn access back on. Your data is safe.`;
    chip = "md-chip-error";
  } else if (access.status === "canceled") {
    title = "Subscription canceled";
    detail = "Contact us if you would like to start again. Your data is safe.";
    chip = "md-chip-error";
  }

  const props = access.properties;
  const price = Number(access.price_per_property);

  return (
    <main className="md-page">
      {access.has_access && (
        <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
          &larr; Dashboard
        </Link>
      )}

      <header className="mb-6 mt-5">
        <p className="md-label md-muted">{orgName}</p>
        <h1 className="md-display">Billing</h1>
      </header>

      <section className="md-hero" style={{ borderRadius: "40px 40px 40px 12px" }}>
        <span className={`md-chip ${chip}`}>{title}</span>
        <p className="mt-3 text-lg">{detail}</p>
      </section>

      <section className="md-card mt-6">
        <h2 className="md-title">Your plan</h2>
        <p className="md-muted mt-1 text-sm">
          {formatPeso(price)} per property, per month. You have {props} propert
          {props === 1 ? "y" : "ies"}.
        </p>
        <div className="md-stat-value mt-3">
          {formatPeso(access.amount_due)}
          <span className="md-muted text-base font-normal"> / month</span>
        </div>
        {props === 0 && (
          <p className="md-muted mt-2 text-sm">
            This is the price for one property. Add a property from your
            dashboard.
          </p>
        )}
      </section>

      <section className="md-card md-stack mt-6">
        <h2 className="md-title">How to pay</h2>
        <ol className="md-muted list-decimal pl-5 text-sm">
          <li className="mb-1">
            Send {formatPeso(access.amount_due)} to: {PRICING.payTo}
          </li>
          <li className="mb-1">
            Message your payment screenshot and your business name ({orgName}) to{" "}
            {LEGAL.contactEmail}.
          </li>
          <li>
            We will confirm it and turn on your next 30 days, usually within one
            business day.
          </li>
        </ol>
        <p className="md-muted text-sm">
          Online payment by GCash and card is coming soon.
        </p>
      </section>

      {!access.has_access && (
        <form action={signOut} className="mt-6">
          <button className="md-btn md-btn-outlined md-btn-sm">Sign out</button>
        </form>
      )}
    </main>
  );
}
