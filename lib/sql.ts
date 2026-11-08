// `server-only` hanya untuk build Next; script CLI (tsx) perlu menonaktifkannya.
if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import postgres, { type Sql } from "postgres";

declare global {
  // Satu pool per proses. Di serverless (Netlify) proses bisa di-reuse, jadi
  // pool disimpan di globalThis supaya tidak dibuat ulang di setiap request.
  var __kasirkuSql: Sql | undefined;
}

/** Ambil connection string Postgres/Supabase dari environment. */
export function databaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.POSTGRES_URL ??
    "";

  if (!url) {
    throw new Error(
      "DATABASE_URL belum di-set. Untuk Supabase, salin connection string dari " +
        "Project Settings → Database → Connection string (pakai Connection pooling), " +
        "lalu simpan sebagai env DATABASE_URL.",
    );
  }
  return url;
}

/** Apakah aplikasi sudah dikonfigurasi untuk Postgres? */
export function hasDatabaseUrl(): boolean {
  try {
    databaseUrl();
    return true;
  } catch {
    return false;
  }
}

/**
 * Deteksi apakah host database memakai pooler Supabase (Supavisor, port 6543)
 * atau host serverless lain. Prepared statement tidak didukung di sana, jadi
 * semuanya dimatikan. Untuk Postgres biasa (mis. database uji) tetap aktif.
 */
function isPooler(url: string): boolean {
  return (
    /pooler\.supabase\.(com|net)/.test(url) ||
    /:6543\b/.test(url) ||
    /neon\.tech|render\.com|railway\.app/.test(url)
  );
}

export function getSql(): Sql {
  if (!globalThis.__kasirkuSql) {
    const url = databaseUrl();
    globalThis.__kasirkuSql = postgres(url, {
      prepare: !isPooler(url),
      // Host lokal (database uji) tanpa TLS; semua host remote wajib TLS
      // (Supabase menolak koneksi tanpa SSL).
      ssl:
        url.includes("localhost") ||
        url.includes("127.0.0.1") ||
        url.includes("sslmode=disable")
          ? false
          : "require",
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
      idle_timeout: 20,
      connect_timeout: 15,
      onnotice: () => {},
      // Nominal rupiah disimpan BIGINT; kembalikan sebagai number (aman sampai
      // 9 kuadriliun, jauh di atas kebutuhan warung).
      types: {
        bigint: {
          to: 20,
          from: [20],
          serialize: (value: number | string) => String(value),
          parse: (value: string) => Number(value),
        },
      },
    });
  }
  return globalThis.__kasirkuSql;
}

/** Tutup pool (dipakai script CLI). */
export async function closeSql() {
  if (globalThis.__kasirkuSql) {
    await globalThis.__kasirkuSql.end({ timeout: 5 });
    globalThis.__kasirkuSql = undefined;
  }
}

export type SqlClient = Sql;
