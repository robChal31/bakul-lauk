/**
 * Terapkan supabase/schema.sql ke database pada DATABASE_URL.
 * Idempoten — aman dijalankan berulang (`npm run db:setup`).
 */
import { closeSql, getSql } from "../lib/sql";
import { maskedDatabaseUrl } from "../lib/runtime-check";
import { isDatabaseEmpty, schemaSql, seedDatabase } from "../lib/seed";

async function main() {
  console.log(`[kasirku] Menyiapkan skema di ${maskedDatabaseUrl()} …`);
  await getSql().unsafe(schemaSql());
  console.log("[kasirku] Skema siap (tabel + fungsi RPC).");

  const withSeed = process.argv.includes("--seed");
  if (withSeed) {
    if (await isDatabaseEmpty()) {
      await seedDatabase();
      console.log("[kasirku] Database kosong → data demo dibuat.");
    } else {
      console.log("[kasirku] Database sudah berisi data → seed dilewati (pakai db:seed untuk reset).");
    }
  }

  await closeSql();
}

main().catch(async (error) => {
  console.error("[kasirku] Gagal:", error instanceof Error ? error.message : error);
  await closeSql();
  process.exitCode = 1;
});
