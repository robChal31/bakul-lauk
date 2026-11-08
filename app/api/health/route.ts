import { connection } from "next/server";
import { db } from "@/lib/db";
import { databaseProblem, runtimeInfo } from "@/lib/runtime-check";

/**
 * Diagnostik: memastikan koneksi ke Postgres/Supabase sehat dan memberi tahu
 * host database yang dipakai (password disamarkan).
 *
 * Buka /api/health setelah deploy.
 */
export async function GET() {
  // Paksa dieksekusi saat request, bukan di-prerender waktu build.
  await connection();

  try {
    const products = await db.get<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM products",
    );
    const sales = await db.get<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM sales",
    );

    return Response.json({
      ok: true,
      node: process.version,
      environment: runtimeInfo(),
      counts: {
        products: Number(products?.total ?? 0),
        sales: Number(sales?.total ?? 0),
      },
    });
  } catch (error) {
    const problem = await databaseProblem();

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        problem,
        environment: runtimeInfo(),
      },
      { status: 503 },
    );
  }
}
