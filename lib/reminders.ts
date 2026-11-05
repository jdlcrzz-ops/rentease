// Pure helper functions for payment reminders (no database access here).

export type Stage = "upcoming" | "due_today" | "overdue";

const pesoFmt = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function peso(n: number) {
  // Show centavos only when there are some
  return Number.isInteger(n)
    ? pesoFmt.format(n).replace(/\.00$/, "")
    : pesoFmt.format(n);
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
  });
}

function monthName(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

/** Whole days from one YYYY-MM-DD date to another (to minus from). */
export function daysBetween(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Which kind of reminder (if any) does this bill need today? */
export function stageFor(dueDate: string, today: string): Stage | null {
  const days = daysBetween(today, dueDate); // positive = due in the future
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  if (days <= 3) return "upcoming";
  return null;
}

/**
 * Should we show this reminder? `sentOn` lists the dates a reminder of the
 * SAME stage was already marked as sent for this bill.
 * - due soon / due today: once per bill
 * - overdue: again every 3 days
 */
export function shouldRemind(stage: Stage, sentOn: string[], today: string) {
  if (stage !== "overdue") return sentOn.length === 0;
  if (sentOn.length === 0) return true;
  const last = [...sentOn].sort().at(-1) as string;
  return daysBetween(last, today) >= 3;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "there";
}

/** Link that opens the phone's text app with the message already typed. */
export function smsHref(phone: string, body: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

export function buildMessage(p: {
  stage: Stage;
  fullName: string;
  business: string;
  balance: number;
  lateFee: number;
  periodStart: string;
  dueDate: string;
  today: string;
  link: string;
}) {
  const name = firstName(p.fullName);
  const days = daysBetween(p.today, p.dueDate);
  const month = monthName(p.periodStart);
  const lines: string[] = [];

  if (p.stage === "upcoming") {
    lines.push(
      `Hi ${name}! Friendly reminder: your rent of ${peso(p.balance)} for ${month} is due on ${longDate(p.dueDate)} (${days === 1 ? "tomorrow" : `in ${days} days`}).`
    );
  } else if (p.stage === "due_today") {
    lines.push(
      `Hi ${name}! Friendly reminder: your rent of ${peso(p.balance)} for ${month} is due today.`
    );
  } else {
    const late = Math.abs(days);
    lines.push(
      `Hi ${name}, your rent for ${month} was due on ${longDate(p.dueDate)} and is now ${late} day${late === 1 ? "" : "s"} overdue. Balance: ${peso(p.balance)}${p.lateFee > 0 ? ` (includes late fee of ${peso(p.lateFee)})` : ""}.`
    );
  }

  lines.push(`You can see your bill and send your proof of payment here: ${p.link}`);
  lines.push(`Thank you! - ${p.business}`);
  return lines.join("\n\n");
}
