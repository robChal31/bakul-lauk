import { accessSync, constants, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const DATABASE_FILENAME = "kasirku.db";

export type DatabaseLocation = {
  /** Path lengkap ke file SQLite. */
  file: string;
  /** Folder tempat file SQLite disimpan. */
  dir: string;
  /**
   * `true` kalau file disimpan di penyimpanan sementara (mis. `/tmp` di
   * serverless/Netlify). Data akan hilang saat instance di-restart.
   */
  ephemeral: boolean;
  /** Dari mana lokasi ini ditentukan: env, project, atau fallback sementara. */
  source: "env" | "project" | "temporary";
};

function isWritableDir(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function isServerless(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_DEV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

/**
 * Tentukan lokasi database.
 *
 * Urutan prioritas:
 * 1. `DATABASE_PATH` (paling eksplisit, dipakai kalau mau volume persistent).
 * 2. `data/` di dalam project — dipakai saat lokal / server biasa.
 * 3. `$TMPDIR/kasirku` — filesystem function serverless (Netlify) read-only,
 *    jadi harus jatuh ke sini agar aplikasi tidak error 500.
 */
export function resolveDatabaseLocation(): DatabaseLocation {
  const override = process.env.DATABASE_PATH?.trim();
  if (override) {
    const file = path.resolve(override);
    return {
      file,
      dir: path.dirname(file),
      ephemeral: false,
      source: "env",
    };
  }

  const projectDir = path.join(process.cwd(), "data");
  // Di serverless, folder project memang read-only; langsung ke /tmp supaya
  // tidak gagal, dan agar build tidak menulis database ke folder deploy.
  if (!isServerless() && isWritableDir(projectDir)) {
    return {
      file: path.join(projectDir, DATABASE_FILENAME),
      dir: projectDir,
      ephemeral: false,
      source: "project",
    };
  }

  const temporaryDir = path.join(os.tmpdir(), "kasirku");
  return {
    file: path.join(temporaryDir, DATABASE_FILENAME),
    dir: temporaryDir,
    ephemeral: true,
    source: "temporary",
  };
}

export const DATABASE_LOCATION = resolveDatabaseLocation();

/** Lokasi file SQLite. Bisa dipindah lewat env `DATABASE_PATH`. */
export const DATABASE_PATH = DATABASE_LOCATION.file;

/** `true` kalau data disimpan di penyimpanan sementara (hilang saat restart). */
export const DATABASE_IS_EPHEMERAL = DATABASE_LOCATION.ephemeral;
