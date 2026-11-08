/**
 * Uji keamanan data: memastikan seed hanya berjalan saat database kosong,
 * dan data yang sudah ada tidak pernah terhapus oleh build, restart, atau seed.
 *
 * Jalankan: npm run test:db
 */
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../lib/database-core.ts";

import { clearAllTables } from "../lib/reset.ts";
import { SCHEMA } from "../lib/schema.ts";

// Uji ini WAJIB memakai database sementara, bukan data asli aplikasi.
const REAL_DB = path.join(process.cwd(), "data", "kasirku.db");
if (!process.env.DATABASE_PATH || path.resolve(process.env.DATABASE_PATH) === REAL_DB) {
  console.error(
    "Batal: jalankan lewat `npm run test:db` (script ini mengisi DATABASE_PATH ke DB sementara).",
  );
  process.exit(1);
}
const DB_FILE = path.resolve(process.env.DATABASE_PATH);
const dir = path.dirname(DB_FILE);

let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? "✓" : "✗"} ${label}${ok ? "" : ` (dapat ${actual}, harus ${expected})`}`,
  );
}

function main() {
  let conn = openDatabase();

  const getDb = () => conn;
  const closeDb = () => {
    if (conn.isOpen) conn.close();
  };

  const count = (table: string) =>
    Number(
      (getDb().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number })
        .c,
    );

  console.log(`\nDB uji (sementara): ${DB_FILE}\n`);

  // 1. Database kosong → seed otomatis (data awal)
  check("DB kosong di-seed: akun", count("users"), 2);
  check("DB kosong di-seed: produk", count("products"), 10);
  check("DB kosong di-seed: transaksi > 0", count("sales") > 0, true);

  // 2. Tambah data valid, lalu restart (koneksi ditutup & dibuka) → aman
  getDb()
    .prepare(
      `INSERT INTO expenses (title, amount, category, note, user_name, payment_source, spent_at, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .run("DATA VALID", 500000, "lainnya", "pemilik", "kas", Date.now(), Date.now());

  const expensesBefore = count("expenses");
  const productsBefore = count("products");

  closeDb(); // simulasi server restart
  conn = openDatabase(); // koneksi baru: tidak boleh seed ulang

  check("Data valid bertahan setelah restart", count("expenses"), expensesBefore);
  check("Produk tidak terduplikasi saat restart", count("products"), productsBefore);
  check(
    "Baris data valid masih ada",
    Number(
      (
        getDb()
          .prepare("SELECT COUNT(*) AS c FROM expenses WHERE title = ?")
          .get("DATA VALID") as { c: number }
      ).c,
    ),
    1,
  );

  // 3. Tidak ada seed otomatis hanya karena proses baru / build
  for (let i = 0; i < 3; i++) {
    closeDb();
    conn = openDatabase();
  }
  check("Buka-tutup koneksi berulang tetap aman", count("expenses"), expensesBefore);

  // 4. Semua tabel dikosongkan → dianggap DB kosong → seed ulang
  closeDb();
  conn = openDatabase();
  clearAllTables(conn);
  closeDb();
  conn = openDatabase();
  check("DB kosong kembali di-seed ulang", count("users"), 2);

  // 5. File DB baru dengan skema saja → tidak otomatis menimpa apa pun
  closeDb();
  const freshPath = path.join(dir, "fresh.db");
  if (existsSync(freshPath)) rmSync(freshPath);
  const fresh = new DatabaseSync(freshPath);
  fresh.exec(SCHEMA);
  const freshUsers = Number(
    (fresh.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c,
  );
  fresh.close();
  check("File baru tanpa runtime = tetap kosong", freshUsers, 0);

  closeDb();
}

// Mulai dari kondisi bersih agar hasil uji dapat diulang.
mkdirSync(dir, { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${DB_FILE}${suffix}`;
  if (existsSync(file)) rmSync(file);
}

try {
  main();
} catch (error) {
  failed++;
  console.error("✗ Uji error:", error);
} finally {
  rmSync(dir, { recursive: true, force: true });
  console.log(failed === 0 ? "\nSemua uji lolos.\n" : `\n${failed} uji gagal.\n`);
  process.exit(failed === 0 ? 0 : 1);
}
