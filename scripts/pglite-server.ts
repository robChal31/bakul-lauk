/**
 * Server Postgres tiruan untuk pengujian lokal (PGlite + socket server).
 * Bukan untuk produksi — hanya supaya `npm run test:db` bisa diuji tanpa
 * memasang Postgres dan tanpa menyentuh project Supabase asli.
 *
 *   npm run test:pglite            → dengarkan di port 55432
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

async function main() {
  const port = Number(process.env.PGLITE_PORT ?? 55432);
  const db = await PGlite.create({
    dataDir: process.env.PGLITE_DIR ?? "/tmp/kasirku-pglite",
  });
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
  await server.start();
  console.log(`[pglite] Postgres uji siap di postgres://postgres@127.0.0.1:${port}/postgres`);

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("[pglite] gagal:", error);
  process.exit(1);
});
