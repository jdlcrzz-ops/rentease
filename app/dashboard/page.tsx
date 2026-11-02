import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { createBusiness, createProperty } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

// The outer page is a quick shell; the real content streams in behind Suspense.
export default function DashboardPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Props) {
  // Tell Next.js this part must be rendered at request time (per visitor).
  await connection();
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1)
    .maybeSingle();

  // Properties plus simple bed counts
  const { data: properties } = business
    ? await supabase
        .from("properties")
        .select("id, name, address")
        .order("created_at")
    : { data: [] };
  const { data: rooms } = business
    ? await supabase.from("rooms").select("id, property_id")
    : { data: [] };
  const { data: beds } = business
    ? await supabase.from("beds").select("room_id, status")
    : { data: [] };

  const stats = new Map<string, { rooms: number; beds: number; occupied: number }>();
  const roomToProperty = new Map<string, string>();
  for (const r of rooms ?? []) {
    roomToProperty.set(r.id, r.property_id);
    const s = stats.get(r.property_id) ?? { rooms: 0, beds: 0, occupied: 0 };
    s.rooms += 1;
    stats.set(r.property_id, s);
  }
  for (const b of beds ?? []) {
    const pid = roomToProperty.get(b.room_id);
    if (!pid) continue;
    const s = stats.get(pid) ?? { rooms: 0, beds: 0, occupied: 0 };
    s.beds += 1;
    if (b.status === "occupied") s.occupied += 1;
    stats.set(pid, s);
  }

  let totalBeds = 0;
  let totalOccupied = 0;
  for (const s of stats.values()) {
    totalBeds += s.beds;
    totalOccupied += s.occupied;
  }
  const occupancyPct = totalBeds ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <main className="md-page">
      <header className="mb-6 flex items-center justify-between">
        <span className="md-title">RentEase</span>
        <div className="flex items-center gap-2">
          <Link href="/bills" className="md-btn md-btn-tonal md-btn-sm">
            Bills
          </Link>
          <Link href="/tenants" className="md-btn md-btn-tonal md-btn-sm">
            Tenants
          </Link>
          <form action={signOut}>
            <button className="md-btn md-btn-outlined md-btn-sm">Sign out</button>
          </form>
        </div>
      </header>

      {error && <p className="md-banner-error mb-4">{error}</p>}

      {business ? (
        <div className="md-stack" style={{ gap: 24 }}>
          <section className="md-hero">
            <p className="md-label" style={{ opacity: 0.75 }}>
              Your business
            </p>
            <h1 className="md-display mt-1">{business.name}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="md-chip md-chip-stat">
                {(properties ?? []).length} properties
              </span>
              <span className="md-chip md-chip-stat">{totalBeds} beds</span>
              <span className="md-chip md-chip-stat">
                {occupancyPct}% occupied
              </span>
            </div>
            <p className="mt-4 text-sm" style={{ opacity: 0.75 }}>
              Signed in as {user.email}
            </p>
          </section>

          <section className="md-stack">
            <h2 className="md-headline">Properties</h2>
            {(properties ?? []).length === 0 ? (
              <p className="md-muted">
                No properties yet. Add your first one below.
              </p>
            ) : (
              (properties ?? []).map((p) => {
                const s = stats.get(p.id) ?? { rooms: 0, beds: 0, occupied: 0 };
                const pct = s.beds ? Math.round((s.occupied / s.beds) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="md-card md-card-link"
                  >
                    <div className="md-title">{p.name}</div>
                    {p.address && (
                      <div className="md-muted text-sm">{p.address}</div>
                    )}
                    <div className="md-progress mt-4">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                    <div className="md-muted mt-2 text-sm">
                      {s.rooms} rooms, {s.beds} beds, {s.occupied} occupied
                    </div>
                  </Link>
                );
              })
            )}
          </section>

          <form action={createProperty} className="md-card md-stack">
            <h2 className="md-title">Add a property</h2>
            <label className="md-field">
              <input name="name" placeholder=" " required />
              <span>Property name (e.g. Main Boarding House)</span>
            </label>
            <label className="md-field">
              <input name="address" placeholder=" " />
              <span>Address (optional)</span>
            </label>
            <button className="md-btn md-btn-filled md-btn-block">
              Add property
            </button>
          </form>
        </div>
      ) : (
        <section className="md-card md-stack">
          <h1 className="md-headline">Set up your rental business</h1>
          <p className="md-muted">
            What should we call your business or property group?
          </p>
          <form action={createBusiness} className="md-stack">
            <label className="md-field">
              <input name="name" placeholder=" " required />
              <span>Business name</span>
            </label>
            <button className="md-btn md-btn-filled md-btn-block">
              Create my business
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
