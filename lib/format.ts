export const TIME_ZONE = "Asia/Jakarta";

function parts(ts: number): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(ts))) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

/** Tanggal kalender (zona Asia/Jakarta) dalam format YYYY-MM-DD. */
export function jakartaDay(ts: number = Date.now()): string {
  const p = parts(ts);
  return `${p.year}-${p.month}-${p.day}`;
}

export function shiftDay(day: string, delta: number): string {
  const base = new Date(`${day}T00:00:00+07:00`).getTime();
  return jakartaDay(base + delta * 24 * 60 * 60 * 1000);
}

export function formatIDR(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value || 0))}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

export function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)}, ${formatTime(ts)}`;
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${day}T00:00:00+07:00`));
}

export function formatDayShort(day: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(`${day}T00:00:00+07:00`));
}

export function formatWeekday(day: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${day}T00:00:00+07:00`));
}

export function relativeDay(day: string, today: string): string {
  if (day === today) return "Hari ini";
  if (day === shiftDay(today, -1)) return "Kemarin";
  return formatDayLabel(day);
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Kartu Debit",
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}
