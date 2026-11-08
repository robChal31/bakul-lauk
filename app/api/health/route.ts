import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { DATABASE_IS_EPHEMERAL, DATABASE_LOCATION } from "@/lib/db-path";
import { detectRuntimeProblem, runtimeInfo } from "@/lib/runtime-check";

/**
 * Diagnostik singkat: memastikan koneksi SQLite sehat dan memberi tahu di
 * mana file database berada (penting di lingkungan serverless seperti Netlify).
 *
 * Buka /api/health setelah deploy.
 */
export async function GET() {
  // Paksa dieksekusi saat request, bukan di-prerender waktu build, supaya
  // informasi path & isi database mencerminkan runtime sebenarnya.
  await connection();

  const environment = runtimeInfo();

  try {
    const db = getDb();
    const products = db
      .prepare("SELECT COUNT(*) AS total FROM products")
      .get() as { total: number };
    const sales = db
      .prepare("SELECT COUNT(*) AS total FROM sales")
      .get() as { total: number };

    return Response.json({
      ok: true,
      node: process.version,
      environment,
      database: {
        path: DATABASE_LOCATION.file,
        source: DATABASE_LOCATION.source,
        ephemeral: DATABASE_IS_EPHEMERAL,
      },
      counts: {
        products: Number(products.total),
        sales: Number(sales.total),
      },
      warning: DATABASE_IS_EPHEMERAL
        ? "Data disimpan di penyimpanan sementara: akan kembali ke data demo setelah instance di-restart. Set env DATABASE_PATH ke volume persistent untuk data permanen."
        : undefined,
    });
  } catch (error) {
    const problem = detectRuntimeProblem(error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        problem,
        environment,
        database: {
          path: DATABASE_LOCATION.file,
          source: DATABASE_LOCATION.source,
          ephemeral: DATABASE_IS_EPHEMERAL,
        },
      },
      { status: 503 },
    );
  }
}
