import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_PATH } from "./db-path";
import { SCHEMA } from "./schema";
import { seedDatabase } from "./seed";

/**
 * Buka file SQLite + siapkan pragma & skema. Tidak pernah mengisi data,
 * sehingga aman dipakai script CLI yang butuh kontrol penuh.
 */
export function createConnection(file = DATABASE_PATH): DatabaseSync {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
  } catch {
    // Folder tidak bisa dibuat (filesystem read-only). Error asli akan muncul
    // dari konstruktor DatabaseSync dengan pesan yang lebih jelas.
  }

  const db = new DatabaseSync(file);
  // WAL tidak bisa dipakai di sebagian filesystem jaringan / read-only;
  // abaikan kalau tidak didukung, data tetap aman dengan journal default.
  try {
    db.exec("PRAGMA journal_mode = WAL;");
  } catch {
    /* no-op */
  }
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

/**
 * Koneksi untuk runtime aplikasi. Seed data demo HANYA dijalankan ketika
 * database benar-benar kosong (tabel `users` kosong). Database yang sudah
 * berisi data tidak pernah disentuh — baik saat build, restart, maupun PR.
 */
export function openDatabase(file = DATABASE_PATH): DatabaseSync {
  const db = createConnection(file);

  const row = db.prepare("SELECT COUNT(*) AS total FROM users").get() as {
    total: number;
  };
  if (!row || Number(row.total) === 0) {
    seedDatabase(db);
    console.log(`[kasirku] Database kosong — data demo dibuat di ${file}`);
  }

  return db;
}

/**
 * Cek cepat apakah database bisa dibuka & dibaca, tanpa melempar error.
 * Dipakai halaman supaya bisa menampilkan instruksi perbaikan saat
 * filesystem read-only (mis. Netlify) atau Node terlalu lama.
 */
export function probeDatabase(
  file = DATABASE_PATH,
): { ok: true } | { ok: false; error: unknown } {
  try {
    const db = createConnection(file);
    db.prepare("SELECT 1 AS ok").get();
    db.close();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
