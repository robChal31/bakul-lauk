import { shiftDay } from "./format";

/**
 * Batas hari menurut zona waktu Jakarta (UTC+7). Dipisah dari lib/queries.ts
 * (yang memuat `server-only`) supaya bisa dipakai script CLI & unit test.
 */
export function dayStart(day: string): number {
  return new Date(`${day}T00:00:00+07:00`).getTime();
}

export function dayEnd(day: string): number {
  return dayStart(shiftDay(day, 1)) - 1;
}
