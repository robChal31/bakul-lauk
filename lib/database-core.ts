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
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
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
