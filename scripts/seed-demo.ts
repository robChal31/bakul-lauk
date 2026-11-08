/**
 * Isi ulang data demo. Menghapus data yang ada (`npm run db:seed`).
 * Untuk mencoba cepat tanpa risiko, jalankan pada database uji.
 */
import { clearAllData } from "../lib/bootstrap";
import { seedDatabase } from "../lib/seed";
import { closeSql } from "../lib/sql";
import { maskedDatabaseUrl } from "../lib/runtime-check";

async function main() {
  console.log(`[kasirku] Database: ${maskedDatabaseUrl()}`);
  console.log("[kasirku] Mengosongkan tabel…");
  await clearAllData();
  console.log("[kasirku] Menulis data demo…");
  await seedDatabase();
  console.log("[kasirku] Selesai. Login demo: admin / admin123 · kasir / kasir123");
  await closeSql();
}

main().catch(async (error) => {
  console.error("[kasirku] Gagal:", error instanceof Error ? error.message : error);
  await closeSql();
  process.exitCode = 1;
});
