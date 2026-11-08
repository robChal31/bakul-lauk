"use client";

import { useEffect } from "react";

/**
 * Error boundary tingkat atas. Menampilkan pesan yang bisa ditindaklanjuti
 * (mis. masalah Node.js / database di Netlify), bukan layar kosong
 * "This page couldn't load".
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[kasirku] global error:", error);
  }, [error]);

  const message = error?.message ?? "";

  let title = "Aplikasi gagal dimuat";
  let detail =
    "Terjadi kesalahan di server. Coba muat ulang halaman; data di database tetap aman.";
  let fix =
    "Kalau error berulang, buka /api/health untuk melihat detail lingkungan.";

  if (message.includes("DATABASE_URL")) {
    title = "Database belum dikonfigurasi";
    detail =
      "Aplikasi butuh connection string Postgres/Supabase di env DATABASE_URL.";
    fix =
      "Set env DATABASE_URL (connection string pooler Supabase) di Netlify, lalu redeploy.";
  } else if (
    message.includes("password authentication failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT")
  ) {
    title = "Tidak bisa terhubung ke database";
    detail = "Koneksi ke Postgres/Supabase gagal dari server aplikasi.";
    fix =
      "Periksa DATABASE_URL (pakai host pooler port 6543) dan pastikan project Supabase aktif.";
  }

  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0 }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "#f4f5f7",
            color: "#18181b",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h1 style={{ fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>
              {title}
            </h1>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: "#52525b",
                marginTop: 8,
              }}
            >
              {detail}
            </p>
            <div
              style={{
                marginTop: 12,
                background: "#fafafa",
                border: "1px solid #f4f4f5",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#71717a",
                  margin: 0,
                }}
              >
                Cara memperbaiki
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: "6px 0 0" }}>
                {fix}
              </p>
            </div>
            {error?.digest ? (
              <p
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color: "#a1a1aa",
                  marginTop: 10,
                }}
              >
                kode error: {error.digest}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: "#059669",
                  color: "#fff",
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Coba lagi
              </button>
              <a
                href="/api/health"
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "#fff",
                  color: "#3f3f46",
                  fontSize: 14.5,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                Diagnostik
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
