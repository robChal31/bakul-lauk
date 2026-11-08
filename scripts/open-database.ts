import type { DatabaseSync } from "node:sqlite";
import { createConnection } from "../lib/database-core.ts";

/** Buka (dan buat jika perlu) file SQLite di luar runtime Next.js. */
export function openDatabase(): DatabaseSync {
  return createConnection();
}

export function printSummary(db: DatabaseSync) {
  const count = (table: string) =>
    Number((db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total);

  console.log(
    `  akun: ${count("users")} · produk: ${count("products")} · transaksi: ${count("sales")} · pengeluaran: ${count("expenses")}`,
  );
}
