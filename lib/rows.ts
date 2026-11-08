/**
 * `node:sqlite` mengembalikan baris dengan prototype null, yang tidak bisa
 * dikirim ke Server Component → Client Component. Helper ini menormalkannya
 * jadi objek biasa.
 */
export function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}
