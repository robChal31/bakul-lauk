import os from "node:os";
import { probeDatabase } from "./database-core";
import { DATABASE_IS_EPHEMERAL, DATABASE_LOCATION } from "./db-path";

export type RuntimeProblem = {
  title: string;
  detail: string;
  fix: string;
};

const MIN_NODE: [number, number, number] = [22, 13, 0];

function nodeVersion(): [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = process.versions.node
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  return [major, minor, patch];
}

function isBelowMinNode(): boolean {
  const [major, minor, patch] = nodeVersion();
  const [minMajor, minMinor, minPatch] = MIN_NODE;
  if (major !== minMajor) return major < minMajor;
  if (minor !== minMinor) return minor < minMinor;
  return patch < minPatch;
}

/**
 * Periksa prasyarat runtime yang paling sering membuat deploy gagal
 * (mis. di Netlify) dan kembalikan pesan yang bisa langsung ditindaklanjuti.
 */
export function detectRuntimeProblem(error?: unknown): RuntimeProblem | null {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (
    message.includes("node:sqlite") ||
    message.includes("ERR_UNKNOWN_BUILTIN_MODULE") ||
    message.includes("No such built-in module")
  ) {
    return {
      title: "Versi Node.js terlalu lama",
      detail: `Aplikasi butuh Node.js ≥ 22.13 (modul bawaan node:sqlite). Runtime yang dipakai: ${process.versions.node}.`,
      fix: 'Set env NODE_VERSION=22 di Netlify (Site configuration → Environment variables), lalu deploy ulang tanpa cache.',
    };
  }

  if (
    message.includes("unable to open database file") ||
    message.includes("EACCES") ||
    message.includes("EROFS") ||
    message.includes("read-only")
  ) {
    return {
      title: "Database tidak bisa ditulis",
      detail: `Filesystem function bersifat read-only. Lokasi database sekarang: ${DATABASE_LOCATION.file} (${DATABASE_LOCATION.source}).`,
      fix: "Set env DATABASE_PATH ke folder writable, mis. /tmp/kasirku/kasirku.db. Ingat: /tmp bersifat sementara dan hilang saat instance di-restart.",
    };
  }

  if (message.includes("SQLITE_CORRUPT") || message.includes("database disk image is malformed")) {
    return {
      title: "File database rusak",
      detail: `File SQLite tidak bisa dibaca: ${DATABASE_LOCATION.file}.`,
      fix: "Hapus file tersebut (atau jalankan `npm run db:reset`), lalu buka aplikasi lagi.",
    };
  }

  if (isBelowMinNode()) {
    return {
      title: "Versi Node.js terlalu lama",
      detail: `Runtime yang dipakai Node.js ${process.versions.node}, sedangkan minimal ≥ 22.13.`,
      fix: 'Set env NODE_VERSION=22 di Netlify (Site configuration → Environment variables).',
    };
  }

  return null;
}

/**
 * Penggabungan probe database + deteksi error: kalau DB tidak bisa dipakai,
 * kembalikan problem yang siap ditampilkan ke pengguna.
 */
let probeOk = false;

export function databaseProblem(): RuntimeProblem | null {
  // Hasil OK di-cache per proses supaya tidak membuka koneksi tambahan di
  // setiap request. Kegagalan selalu diperiksa ulang (mungkin sudah diperbaiki).
  if (probeOk) return null;
  const probe = probeDatabase();
  if (probe.ok) {
    probeOk = true;
    return null;
  }
  return detectRuntimeProblem(probe.error);
}

/** Ringkasan lingkungan untuk endpoint /api/health dan pesan error. */
export function runtimeInfo() {
  return {
    node: process.versions.node,
    nodeMinimal: MIN_NODE.join("."),
    platform: `${os.type()} ${os.release()}`,
    cwd: process.cwd(),
    tmpdir: os.tmpdir(),
    database: {
      path: DATABASE_LOCATION.file,
      dir: DATABASE_LOCATION.dir,
      source: DATABASE_LOCATION.source,
      ephemeral: DATABASE_IS_EPHEMERAL,
    },
  };
}
