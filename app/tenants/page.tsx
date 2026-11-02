import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { requireOrg } from "@/lib/org";
import {
  addTenant,
  regeneratePortalLink,
  savePaymentInstructions,
} from "./actions";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default function TenantsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Tenants searchParams={searchParams} />
    </Suspense>
  );
}

async function Tenants({ searchParams }: Props) {
  await connection();
  const { error, message } = await searchParams;
  const { supabase, orgId } = await requireOrg();

  // Build full links like https://yourapp.com/t/<token>
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("payment_instructions")
    .eq("id", orgId)
    .maybeSingle();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email, portal_token")
    .eq("archived", false)
    .order("full_name");

  // Where is each tenant staying right now?
  const { data: active } = await supabase
    .from("occupancies")
    .select("tenant_id, bed_id")
    .is("move_out_date", null);
  const { data: beds } = await supabase.from("beds").select("id, label, room_id");
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, property_id");
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name");

  const bedById = new Map((beds ?? []).map((b) => [b.id, b]));
  const roomById = new Map((rooms ?? []).map((r) => [r.id, r]));
  const propById = new Map((properties ?? []).map((p) => [p.id, p]));

  function stayingAt(tenantId: string) {
    const occ = (active ?? []).find((o) => o.tenant_id === tenantId);
    if (!occ) return null;
    const bed = bedById.get(occ.bed_id);
    const room = bed ? roomById.get(bed.room_id) : undefined;
    const prop = room ? propById.get(room.property_id) : undefined;
    return [prop?.name, room?.name, bed?.label].filter(Boolean).join(" · ");
  }

  return (
    <main className="md-page">
      <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Dashboard
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="md-display">Tenants</h1>
        <p className="md-muted mt-2">
          Add tenants, then share their private link so they can see their bills
          and send proof of payment.
        </p>
      </header>

      {error && <p className="md-banner-error mb-4">{error}</p>}
      {message && <p className="md-banner-ok mb-4">{message}</p>}

      <form action={savePaymentInstructions} className="md-card md-stack mb-6">
        <h2 className="md-title">Where should tenants pay?</h2>
        <p className="md-muted text-sm">
          Shown on every tenant&apos;s page. Example: GCash 0917 123 4567 (Juan D.),
          or your bank name and account number.
        </p>
        <label className="md-field">
          <textarea
            name="payment_instructions"
            placeholder=" "
            maxLength={1000}
            defaultValue={org?.payment_instructions ?? ""}
          />
          <span>Payment details</span>
        </label>
        <button className="md-btn md-btn-tonal md-btn-sm">Save payment details</button>
      </form>

      <section className="md-stack">
        {(tenants ?? []).length === 0 && (
          <p className="md-muted">No tenants yet. Add your first one below.</p>
        )}
        {(tenants ?? []).map((t) => {
          const where = stayingAt(t.id);
          const link = `${origin}/t/${t.portal_token}`;
          return (
            <div key={t.id} className="md-card">
              <div className="md-title">{t.full_name}</div>
              <div className="md-muted text-sm">
                {[t.phone, t.email].filter(Boolean).join(" · ") || "No contact info"}
              </div>
              <div className="mt-3">
                {where ? (
                  <span className="md-chip md-chip-occupied">{where}</span>
                ) : (
                  <span className="md-chip md-chip-reserved">No bed assigned</span>
                )}
              </div>

              <details className="mt-4">
                <summary className="md-btn md-btn-outlined md-btn-sm">
                  Tenant link
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <p className="md-muted text-sm">
                    Send this link to {t.full_name} by Messenger or text. Anyone
                    with the link can see this tenant&apos;s bills, so treat it like
                    a password.
                  </p>
                  <input className="md-readonly" readOnly value={link} />
                  <form action={regeneratePortalLink}>
                    <input type="hidden" name="tenant_id" value={t.id} />
                    <button className="md-btn md-btn-danger md-btn-sm">
                      Create a new link (old one stops working)
                    </button>
                  </form>
                </div>
              </details>
            </div>
          );
        })}
      </section>

      <form action={addTenant} className="md-card md-stack mt-8">
        <h2 className="md-title">Add a tenant</h2>
        <label className="md-field">
          <input name="full_name" placeholder=" " required />
          <span>Full name</span>
        </label>
        <label className="md-field">
          <input name="phone" type="tel" placeholder=" " />
          <span>Mobile number (optional)</span>
        </label>
        <label className="md-field">
          <input name="email" type="email" placeholder=" " />
          <span>Email (optional)</span>
        </label>
        <label className="md-field">
          <input name="emergency_contact_name" placeholder=" " />
          <span>Emergency contact name (optional)</span>
        </label>
        <label className="md-field">
          <input name="emergency_contact_phone" type="tel" placeholder=" " />
          <span>Emergency contact number (optional)</span>
        </label>
        <p className="md-muted text-sm">
          Please don&apos;t enter government ID numbers here.
        </p>
        <button className="md-btn md-btn-filled md-btn-block">Add tenant</button>
      </form>
    </main>
  );
}
