import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed";

export const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "kasirku.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'kasir',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  sku         TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  cost        INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT    NOT NULL UNIQUE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cashier_name   TEXT    NOT NULL,
  customer_name  TEXT,
  subtotal       INTEGER NOT NULL DEFAULT 0,
  discount       INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT    NOT NULL DEFAULT 'cash',
  amount_paid    INTEGER NOT NULL DEFAULT 0,
  change_due     INTEGER NOT NULL DEFAULT 0,
  note           TEXT,
  voided         INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  cost         INTEGER NOT NULL DEFAULT 0,
  qty          INTEGER NOT NULL,
  line_total   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS expenses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  amount        INTEGER NOT NULL,
  category      TEXT    NOT NULL DEFAULT 'operasional',
  note          TEXT,
  user_name     TEXT,
  payment_source TEXT   NOT NULL DEFAULT 'kas',
  spent_at      INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);
`;

declare global {
  var __kasirkuDb: DatabaseSync | undefined;
}

function openDatabase(): DatabaseSync {
  mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);

  const row = db.prepare("SELECT COUNT(*) AS total FROM users").get() as {
    total: number;
  };
  if (!row || Number(row.total) === 0) {
    seedDatabase(db);
  }

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__kasirkuDb) {
    globalThis.__kasirkuDb = openDatabase();
  }
  return globalThis.__kasirkuDb;
}

/**
 * `node:sqlite` mengembalikan baris dengan prototype null, yang tidak bisa
 * dikirim ke Client Component. Helper ini menormalkan hasilnya jadi objek biasa.
 */
function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

/** Helper kecil supaya pemanggilan query lebih ringkas. */
export const db = {
  all<T>(sql: string, ...params: unknown[]): T[] {
    const rows = getDb()
      .prepare(sql)
      .all(...(params as never[]));
    return rows.map((row) => plain<T>(row));
  },
  get<T>(sql: string, ...params: unknown[]): T | undefined {
    const row = getDb()
      .prepare(sql)
      .get(...(params as never[]));
    return row ? plain<T>(row) : undefined;
  },
  run(sql: string, ...params: unknown[]) {
    return getDb()
      .prepare(sql)
      .run(...(params as never[]));
  },
  tx<T>(fn: () => T): T {
    const conn = getDb();
    conn.exec("BEGIN");
    try {
      const result = fn();
      conn.exec("COMMIT");
      return result;
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  },
};
