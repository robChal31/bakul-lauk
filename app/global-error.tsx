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
    "Terjadi kesalahan di server. Coba muat ulang halaman; data di SQLite tetap aman.";
  let fix =
    "Kalau error berulang, buka /api/health untuk melihat detail lingkungan.";

  if (message.includes("node:sqlite") || message.includes("ERR_UNKNOWN_BUILTIN_MODULE")) {
    title = "Versi Node.js terlalu lama";
    detail =
      "Aplikasi memakai modul bawaan node:sqlite yang butuh Node.js 22.13 atau lebih baru.";
    fix = "Set env NODE_VERSION=22 di Netlify, lalu deploy ulang tanpa cache.";
  } else if (
    message.includes("unable to open database file") ||
    message.includes("EACCES") ||
    message.includes("read-only")
  ) {
    title = "Database tidak bisa ditulis";
    detail =
      "Filesystem function di serverless bersifat read-only sehingga file SQLite tidak bisa dibuat.";
    fix =
      "Set env DATABASE_PATH=/tmp/kasirku/kasirku.db (atau volume persistent), lalu deploy ulang.";
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
