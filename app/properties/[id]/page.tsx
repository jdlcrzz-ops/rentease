import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { formatDate, formatPeso, requireOrg, todayInManila } from "@/lib/org";
import { addRoom, deleteRoom, moveIn, moveOut } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default function PropertyPage(props: Props) {
  return (
    <Suspense fallback={<p className="md-page md-muted">Loading...</p>}>
      <Property {...props} />
    </Suspense>
  );
}

const chipClass: Record<string, string> = {
  vacant: "md-chip-vacant",
  occupied: "md-chip-occupied",
  reserved: "md-chip-reserved",
};

async function Property({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireOrg();
  const today = todayInManila();

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, address")
    .eq("id", id)
    .maybeSingle();
  if (!property) notFound();

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, floor")
    .eq("property_id", id)
    .order("created_at");

  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: beds } = roomIds.length
    ? await supabase
        .from("beds")
        .select("id, room_id, label, monthly_rate, status")
        .in("room_id", roomIds)
        .order("created_at")
    : { data: [] };

  // Current tenants in this property's beds
  const bedIds = (beds ?? []).map((b) => b.id);
  const { data: activeHere } = bedIds.length
    ? await supabase
        .from("occupancies")
        .select(
          "id, bed_id, tenant_id, move_in_date, monthly_rate, deposit_amount, due_day"
        )
        .is("move_out_date", null)
        .in("bed_id", bedIds)
    : { data: [] };

  // All active occupancies (to know which tenants are still free to move in)
  const { data: activeAll } = await supabase
    .from("occupancies")
    .select("tenant_id")
    .is("move_out_date", null);
  const busyTenantIds = new Set((activeAll ?? []).map((o) => o.tenant_id));

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name")
    .eq("archived", false)
    .order("full_name");
  const nameById = new Map((tenants ?? []).map((t) => [t.id, t.full_name]));
  const freeTenants = (tenants ?? []).filter((t) => !busyTenantIds.has(t.id));

  const occByBed = new Map((activeHere ?? []).map((o) => [o.bed_id, o]));
  const roomNameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));
  const vacantBeds = (beds ?? []).filter((b) => b.status === "vacant");

  return (
    <main className="md-page">
      <Link href="/dashboard" className="md-btn md-btn-tonal md-btn-sm">
        &larr; Dashboard
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="md-display">{property.name}</h1>
        {property.address && (
          <p className="md-muted mt-2">{property.address}</p>
        )}
      </header>

      {error && <p className="md-banner-error mb-4">{error}</p>}

      <section className="md-stack" style={{ gap: 16 }}>
        <h2 className="md-headline">Rooms and beds</h2>
        {(rooms ?? []).length === 0 && (
          <p className="md-muted">No rooms yet. Add your first room below.</p>
        )}
        {(rooms ?? []).map((room) => {
          const roomBeds = (beds ?? []).filter((b) => b.room_id === room.id);
          const hasTenants = roomBeds.some((b) => occByBed.has(b.id));
          return (
            <div key={room.id} className="md-card">
              <div className="flex items-baseline justify-between gap-3">
                <div className="md-title">{room.name}</div>
                {room.floor && (
                  <div className="md-muted text-sm">{room.floor}</div>
                )}
              </div>

              <div className="md-rows mt-3">
                {roomBeds.map((b) => {
                  const occ = occByBed.get(b.id);
                  const tenantName = occ ? nameById.get(occ.tenant_id) : null;
                  return (
                    <div key={b.id} className="md-row">
                      <div className="md-row-main">
                        <div>
                          <div className="font-medium">{b.label}</div>
                          <div className="md-muted text-sm">
                            {formatPeso(b.monthly_rate)} / month
                          </div>
                        </div>
                        <span className={`md-chip ${chipClass[b.status] ?? ""}`}>
                          {tenantName ?? b.status}
                        </span>
                      </div>

                      {occ && (
                        <details className="mt-3">
                          <summary className="md-btn md-btn-outlined md-btn-sm">
                            Tenant details
                          </summary>
                          <div className="mt-3 flex flex-col gap-3">
                            <p className="md-muted text-sm">
                              Moved in {formatDate(occ.move_in_date)} · Rent{" "}
                              {formatPeso(occ.monthly_rate)} · Deposit{" "}
                              {formatPeso(occ.deposit_amount)} · Due every{" "}
                              {occ.due_day}
                              {ordinal(occ.due_day)}
                            </p>
                            <form action={moveOut} className="flex flex-col gap-3">
                              <input
                                type="hidden"
                                name="property_id"
                                value={property.id}
                              />
                              <input
                                type="hidden"
                                name="occupancy_id"
                                value={occ.id}
                              />
                              <label className="md-labeled">
                                <span>Move-out date</span>
                                <input
                                  name="move_out_date"
                                  type="date"
                                  defaultValue={today}
                                  required
                                />
                              </label>
                              <button className="md-btn md-btn-danger md-btn-sm">
                                Move out {tenantName}
                              </button>
                            </form>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>

              {!hasTenants && (
                <details className="mt-4">
                  <summary className="md-btn md-btn-outlined md-btn-sm">
                    Delete room
                  </summary>
                  <form action={deleteRoom} className="mt-3 flex flex-col gap-3">
                    <p className="md-muted text-sm">
                      This removes {room.name} and all of its beds. This
                      can&apos;t be undone.
                    </p>
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="room_id" value={room.id} />
                    <button className="md-btn md-btn-danger md-btn-sm">
                      Yes, delete this room
                    </button>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </section>

      {/* ---------- Move in a tenant ---------- */}
      <form action={moveIn} className="md-card md-stack mt-8">
        <h2 className="md-title">Move in a tenant</h2>
        <input type="hidden" name="property_id" value={property.id} />

        {freeTenants.length === 0 ? (
          <p className="md-muted text-sm">
            No free tenants.{" "}
            <Link href="/tenants" className="underline">
              Add a tenant first
            </Link>
            .
          </p>
        ) : vacantBeds.length === 0 ? (
          <p className="md-muted text-sm">
            There are no vacant beds. Add a room or move someone out first.
          </p>
        ) : (
          <>
            <label className="md-labeled">
              <span>Tenant</span>
              <select name="tenant_id" required defaultValue="">
                <option value="" disabled>
                  Choose a tenant
                </option>
                {freeTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="md-labeled">
              <span>Bed</span>
              <select name="bed_id" required defaultValue="">
                <option value="" disabled>
                  Choose a vacant bed
                </option>
                {vacantBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {roomNameById.get(b.room_id)} · {b.label} ·{" "}
                    {formatPeso(b.monthly_rate)}
                  </option>
                ))}
              </select>
            </label>

            <label className="md-labeled">
              <span>Move-in date</span>
              <input
                name="move_in_date"
                type="date"
                defaultValue={today}
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="md-field">
                <input
                  name="monthly_rate"
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  placeholder=" "
                />
                <span>Monthly rent</span>
              </label>
              <label className="md-field">
                <input
                  name="deposit_amount"
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  placeholder=" "
                />
                <span>Deposit</span>
              </label>
              <label className="md-field">
                <input
                  name="due_day"
                  type="number"
                  min={1}
                  max={31}
                  placeholder=" "
                />
                <span>Due day (1-31)</span>
              </label>
              <label className="md-field">
                <input
                  name="grace_days"
                  type="number"
                  min={0}
                  max={30}
                  placeholder=" "
                />
                <span>Grace days</span>
              </label>
            </div>
            <label className="md-field">
              <input
                name="late_fee"
                type="number"
                min={0}
                max={100000}
                step="0.01"
                placeholder=" "
              />
              <span>Late fee (flat PHP amount)</span>
            </label>
            <p className="md-muted text-sm">
              Leave a field blank to use the default: the bed&apos;s rate, no
              deposit, the move-in day as the due day, 3 grace days and no late
              fee. Write late fees into your tenant agreement too.
            </p>
            <button className="md-btn md-btn-filled md-btn-block">
              Move in
            </button>
          </>
        )}
      </form>

      <form action={addRoom} className="md-card md-stack mt-8">
        <h2 className="md-title">Add a room</h2>
        <input type="hidden" name="property_id" value={property.id} />
        <label className="md-field">
          <input name="name" placeholder=" " required />
          <span>Room name (e.g. Room 1)</span>
        </label>
        <label className="md-field">
          <input name="floor" placeholder=" " />
          <span>Floor (optional)</span>
        </label>
        <label className="md-field">
          <input
            name="bed_count"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            placeholder=" "
            required
          />
          <span>Number of beds</span>
        </label>
        <label className="md-field">
          <input
            name="rate"
            type="number"
            min={0}
            max={1000000}
            step="0.01"
            defaultValue={1500}
            placeholder=" "
            required
          />
          <span>Monthly rate per bed (PHP)</span>
        </label>
        <button className="md-btn md-btn-filled md-btn-block">Add room</button>
      </form>
    </main>
  );
}

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th";
}
