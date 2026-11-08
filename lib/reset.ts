import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { DATABASE_PATH } from "./db-path";

const TABLES_IN_ORDER = [
  "sale_items",
  "sales",
  "products",
  "categories",
  "expenses",
  "expense_categories",
  "settings",
  "users",
];

/** Kosongkan semua tabel + reset AUTOINCREMENT (file DB dipertahankan). */
export function clearAllTables(conn: DatabaseSync) {
  conn.exec("PRAGMA foreign_keys = OFF;");
  for (const table of TABLES_IN_ORDER) {
    conn.exec(`DELETE FROM ${table};`);
  }
  conn.exec("DELETE FROM sqlite_sequence;");
  conn.exec("PRAGMA foreign_keys = ON;");
}

/** Hapus file database beserta -wal/-shm/-journal-nya. */
export function removeDatabaseFiles() {
  for (const suffix of ["", "-shm", "-wal", "-journal"]) {
    const file = `${DATABASE_PATH}${suffix}`;
    if (existsSync(file)) rmSync(file);
  }
  return path.dirname(DATABASE_PATH);
}
