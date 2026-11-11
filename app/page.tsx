import Link from "next/link";
import type { Metadata } from "next";
import { PRICING } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "RentEase | Rent collection for boarding houses and apartments",
  description:
    "Track rooms, tenants, monthly bills and payments in one place. Tenants send GCash proof from a private link. Free for 30 days.",
};

const FEATURES = [
  {
    title: "Every room and bed at a glance",
    text: "See which beds are vacant, occupied or reserved, and who is staying where.",
  },
  {
    title: "Monthly bills, made for you",
    text: "Bills are created on each tenant's due day, with a late fee added after your grace period.",
  },
  {
    title: "GCash proof without the chat chaos",
    text: "Tenants open a private link, see what they owe and send a screenshot. You approve it in one tap.",
  },
  {
    title: "Reminders in one tap",
    text: "See who is due soon or overdue, with a ready-made text that opens in your phone's messages.",
  },
  {
    title: "Works on your phone",
    text: "Nothing to install, for you or your tenants. Open it in any browser.",
  },
  {
    title: "Your records stay yours",
    text: "Each business only ever sees its own data, and payment screenshots are stored privately.",
  },
];

const STEPS = [
  { n: "1", title: "Add your place", text: "Create your property, rooms and beds with their monthly rates." },
  { n: "2", title: "Move tenants in", text: "Add tenants, pick a bed, and set the due day, deposit and late fee." },
  { n: "3", title: "Let it run", text: "Bills and late fees are handled. Share each tenant's link, then approve payments as they come in." },
];

const FAQ = [
  {
    q: "Do my tenants need to install an app or make an account?",
    a: "No. Each tenant gets a private link they open in their phone's browser. They can see their own bills and send proof of payment.",
  },
  {
    q: "Does RentEase collect the rent money?",
    a: "No. Tenants pay you directly by GCash, Maya, bank transfer or cash, like they do now. RentEase keeps the records and helps you confirm payments.",
  },
  {
    q: "What happens after the free trial?",
    a: `You choose whether to subscribe. The price is PHP ${PRICING.pricePerProperty} per property per month, paid by GCash or bank transfer. If you don't subscribe, access pauses but your data is kept.`,
  },
  {
    q: "Is my data private?",
    a: "Yes. Each business can only see its own records. Read our Privacy Notice for details on what we collect and how it is protected.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. There is no contract. You can stop paying whenever you want.",
  },
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-5">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3">
        <span className="md-title">RentEase</span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="md-btn md-btn-outlined md-btn-sm">
            Sign in
          </Link>
          <Link href="/signup" className="md-btn md-btn-filled md-btn-sm">
            Start free trial
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="md-hero mt-8" style={{ padding: "40px 28px 36px" }}>
        <p className="md-label" style={{ opacity: 0.75 }}>
          For boarding houses, apartments and bed spaces
        </p>
        <h1 className="md-display mt-2">Collect rent without the chasing.</h1>
        <p className="mt-4 max-w-xl text-lg" style={{ opacity: 0.85 }}>
          Track every room, tenant and monthly bill. Tenants send their GCash
          proof from a private link, and you approve it in one tap.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="md-btn md-btn-filled">
            Start your {PRICING.trialDays}-day free trial
          </Link>
          <a href="#pricing" className="md-btn md-btn-tonal">
            See pricing
          </a>
        </div>
        <p className="mt-3 text-sm" style={{ opacity: 0.75 }}>
          No credit card needed.
        </p>
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="md-headline">How it works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="md-card">
              <span className="md-chip md-chip-vacant">{s.n}</span>
              <div className="md-title mt-3">{s.title}</div>
              <p className="md-muted mt-1 text-sm">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mt-14">
        <h2 className="md-headline">Everything you need to run your rooms</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="md-card">
              <div className="md-title">{f.title}</div>
              <p className="md-muted mt-1 text-sm">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-14">
        <h2 className="md-headline">Simple pricing</h2>
        <div className="md-card mt-5 max-w-md">
          <p className="md-label md-muted">Per property</p>
          <div className="md-display mt-1">
            ₱{PRICING.pricePerProperty}
            <span className="md-title md-muted"> / month</span>
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            <li>✓ {PRICING.trialDays}-day free trial, no credit card</li>
            <li>✓ All features included</li>
            <li>✓ Add as many rooms, beds and tenants as you need</li>
            <li>✓ Cancel any time</li>
          </ul>
          <Link href="/signup" className="md-btn md-btn-filled md-btn-block mt-6">
            Start free trial
          </Link>
          <p className="md-muted mt-3 text-xs">
            One property means one boarding house, apartment building or
            compound. A second location is billed as a second property.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="md-headline">Questions</h2>
        <div className="md-stack mt-5">
          {FAQ.map((item) => (
            <details key={item.q} className="md-card">
              <summary className="md-title cursor-pointer">{item.q}</summary>
              <p className="md-muted mt-2 text-sm">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="md-hero mt-14" style={{ borderRadius: "40px 40px 14px 40px" }}>
        <h2 className="md-headline">Ready to stop chasing rent?</h2>
        <p className="mt-2" style={{ opacity: 0.85 }}>
          Set up your first property in a few minutes.
        </p>
        <Link href="/signup" className="md-btn md-btn-filled mt-5">
          Start your free trial
        </Link>
      </section>

      <footer className="md-muted mt-10 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>© RentEase</span>
        <span>
          <Link href="/terms" className="md-link">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="md-link">
            Privacy Notice
          </Link>
        </span>
      </footer>
    </div>
  );
}
