if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { probeDatabase } from "./bootstrap";
import { hasDatabaseUrl } from "./sql";

export type RuntimeProblem = {
  title: string;
  detail: string;
  fix: string;
};

/** Samarkan connection string supaya password tidak pernah tampil. */
export function maskedDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw) return "(belum di-set)";
  try {
    const url = new URL(raw);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "(format tidak valid)";
  }
}

export function detectRuntimeProblem(error?: unknown): RuntimeProblem | null {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("DATABASE_URL belum di-set") || message.includes("DATABASE_URL")) {
    return {
      title: "Database belum dikonfigurasi",
      detail:
        "Aplikasi butuh connection string Postgres/Supabase di environment variable DATABASE_URL.",
      fix:
        "Buka Supabase → Project Settings → Database → Connection string (Connection pooling), " +
        "lalu tambahkan env DATABASE_URL di Netlify (Site configuration → Environment variables) dan redeploy.",
    };
  }

  if (
    message.includes("password authentication failed") ||
    message.includes("SASL") ||
    message.includes("role \"") ||
    message.includes("does not exist")
  ) {
    return {
      title: "Kredensial database ditolak",
      detail: "Postgres menolak login: username/password pada DATABASE_URL salah atau sudah direset.",
      fix:
        "Salin ulang connection string dari Supabase (Database → Connection string) dan perbarui env DATABASE_URL.",
    };
  }

  if (
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timeout")
  ) {
    return {
      title: "Tidak bisa menghubungi database",
      detail: "Host pada DATABASE_URL tidak bisa dijangkau dari server aplikasi.",
      fix:
        "Pakai connection string **Connection pooling** (host …pooler.supabase.com, port 6543). " +
        "Kalau project Supabase baru di-pause karena lama tidak dipakai, buka dashboard untuk mengaktifkannya lagi.",
    };
  }

  if (message.includes("relation") && message.includes("does not exist")) {
    return {
      title: "Tabel belum dibuat",
      detail: "Database tersambung tetapi skema/tabel Kasirku belum ada.",
      fix: "Jalankan `npm run db:setup` (atau tempel supabase/schema.sql di SQL Editor Supabase).",
    };
  }

  if (message.includes("self signed certificate") || message.includes("certificate")) {
    return {
      title: "Sertifikat SSL database ditolak",
      detail: "Koneksi TLS ke Postgres gagal diverifikasi.",
      fix:
        "Pastikan DATABASE_URL memakai `?sslmode=require`, dan jangan mengarahkan ke proxy yang mengubah sertifikat.",
    };
  }

  return null;
}

/** Gabungan cek env + probe koneksi. */
export async function databaseProblem(): Promise<RuntimeProblem | null> {
  if (!hasDatabaseUrl()) return detectRuntimeProblem(new Error("DATABASE_URL belum di-set"));
  const probe = await probeDatabase();
  return probe.ok ? null : detectRuntimeProblem(probe.error);
}

export function runtimeInfo() {
  return {
    node: process.versions.node,
    platform: `${process.platform} ${process.arch}`,
    databaseUrl: maskedDatabaseUrl(),
    driver: "postgres (node-postgres via porsager/postgres)",
  };
}
