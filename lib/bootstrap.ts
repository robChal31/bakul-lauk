if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { db } from "./db";
import { isDatabaseEmpty, schemaSql, seedDatabase } from "./seed";
import { getSql } from "./sql";

declare global {
  var __kasirkuBootstrap: Promise<void> | undefined;
}

async function bootstrap() {
  // 1) Skema (idempoten: CREATE TABLE/INDEX IF NOT EXISTS).
  //    Jalankan `npm run db:setup` sekali setelah membuat project Supabase;
  //    blok ini hanya jaring pengaman kalau belum sempat.
  await getSql().unsafe(schemaSql());

  // 2) Seed HANYA bila database benar-benar kosong. Data valid tidak pernah
  //    ditimpa — berlaku juga saat build, restart, atau pull request.
  if (await isDatabaseEmpty()) {
    await seedDatabase();
    console.log("[kasirku] Database kosong — data demo dibuat.");
  }
}

/**
 * Pastikan skema siap & data demo tersedia. Hasilnya di-cache per proses
 * sehingga hanya berjalan sekali per instance (bukan tiap request).
 */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__kasirkuBootstrap) {
    globalThis.__kasirkuBootstrap = bootstrap().catch((error) => {
      // Jangan simpan kegagalan: request berikutnya boleh mencoba lagi.
      globalThis.__kasirkuBootstrap = undefined;
      throw error;
    });
  }
  return globalThis.__kasirkuBootstrap;
}

/** Cek koneksi + skema benar-benar bisa dipakai (tanpa melempar error). */
export async function probeDatabase(): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    await ensureSchema();
    await db.get("SELECT 1 AS ok");
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Kosongkan semua data (dipakai `npm run db:reset` / `db:seed`). */
export async function clearAllData() {
  await ensureSchema();
  await getSql().unsafe(
    "TRUNCATE TABLE sale_items, sales, products, categories, expenses, settings, users RESTART IDENTITY CASCADE",
  );
}
