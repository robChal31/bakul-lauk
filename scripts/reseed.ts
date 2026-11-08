/**
 * Reset penuh: kosongkan semua tabel lalu isi ulang data demo.
 * Setara `npm run db:seed` untuk Postgres (tidak ada file yang dihapus).
 */
import { clearAllData } from "../lib/bootstrap";
import { seedDatabase } from "../lib/seed";
import { closeSql } from "../lib/sql";
import { maskedDatabaseUrl } from "../lib/runtime-check";

async function main() {
  console.log(`[kasirku] Database: ${maskedDatabaseUrl()}`);
  console.log("[kasirku] TRUNCATE semua tabel…");
  await clearAllData();
  console.log("[kasirku] Menulis data demo…");
  await seedDatabase();
  console.log("[kasirku] Reset selesai. Login demo: admin / admin123 · kasir / kasir123");
  await closeSql();
}

main().catch(async (error) => {
  console.error("[kasirku] Gagal:", error instanceof Error ? error.message : error);
  await closeSql();
  process.exitCode = 1;
});
