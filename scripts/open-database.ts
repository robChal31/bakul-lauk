/**
 * Cek cepat koneksi database (dipakai script lain & untuk debug manual):
 *   npx tsx scripts/open-database.ts
 */
import { ensureSchema } from "../lib/bootstrap";
import { closeSql } from "../lib/sql";
import { maskedDatabaseUrl } from "../lib/runtime-check";

async function main() {
  console.log(`[kasirku] DATABASE_URL: ${maskedDatabaseUrl()}`);
  await ensureSchema();
  console.log("[kasirku] Skema siap.");
  await closeSql();
}

main().catch(async (error) => {
  console.error("[kasirku] Gagal:", error instanceof Error ? error.message : error);
  await closeSql();
  process.exitCode = 1;
});
