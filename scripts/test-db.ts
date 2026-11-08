/**
 * Uji lapisan data.
 *
 * 1. Uji logika murni (tanpa database): hash password demo & batas hari Jakarta.
 * 2. Kalau DATABASE_URL di-set: uji end-to-end ke Postgres — skema, seed saat
 *    kosong, data bertahan setelah koneksi dibuka-tutup, checkout atomik.
 *
 * Jalankan:
 *   npm run test:db                                  (logika saja)
 *   DATABASE_URL=postgres://... npm run test:db      (+ end-to-end)
 *
 * Peringatan: uji end-to-end MENGHAPUS tabel di database yang ditunjuk.
 * Pakai database uji terpisah, jangan database produksi.
 */
import { ensureSchema } from "../lib/bootstrap";
import { DEMO_USERS } from "../lib/demo/accounts";
import { dayEnd, dayStart } from "../lib/day-range";
import { verifyPassword } from "../lib/password";
import { closeSql, getSql } from "../lib/sql";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed++;
    console.log(`✓ ${label}`);
  } else {
    failed++;
    console.error(`✗ ${label}`, extra ?? "");
  }
}

function pureTests() {
  console.log("== Uji logika murni ==");
  check("hash demo admin menerima admin123", verifyPassword("admin123", DEMO_USERS[0].password_hash));
  check("hash demo admin menolak password salah", !verifyPassword("salah", DEMO_USERS[0].password_hash));
  check("hash demo kasir menerima kasir123", verifyPassword("kasir123", DEMO_USERS[1].password_hash));
  check(
    "rentang hari Jakarta tepat 24 jam",
    dayEnd("2026-01-15") - dayStart("2026-01-15") === 86_400_000 - 1,
    dayEnd("2026-01-15") - dayStart("2026-01-15"),
  );
}

async function databaseTests() {
  console.log("\n== Uji end-to-end Postgres ==");
  // Ambil ulang pool setiap kali: setelah closeSql() instance lama sudah mati.
  let sql = getSql();

  await sql.unsafe("DROP TABLE IF EXISTS sale_items, sales, products, categories, expenses, settings, users CASCADE");
  await sql.unsafe("DROP FUNCTION IF EXISTS create_sale(bigint,text,text,bigint,text,bigint,text,jsonb)");
  await sql.unsafe("DROP FUNCTION IF EXISTS void_sale(bigint)");
  await sql.unsafe("DROP FUNCTION IF EXISTS delete_sale(bigint)");
  await sql.unsafe("DROP FUNCTION IF EXISTS adjust_stock(bigint,integer)");

  await ensureSchema();
  const users = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM users`;
  check("database kosong di-seed otomatis", Number(users[0].total) === 2, users);

  const products = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM products`;
  check("10 produk demo dibuat", Number(products[0].total) === 10, products);

  const sales = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM sales`;
  check("transaksi demo dibuat", Number(sales[0].total) > 0, sales);

  // Tutup & buka koneksi: data harus tetap ada (tidak ada seed ulang).
  await closeSql();
  await ensureSchema();
  sql = getSql();
  const after = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM sales`;
  check("data bertahan setelah koneksi dibuka-tutup", Number(after[0].total) === Number(sales[0].total));
  const usersAfter = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM users`;
  check("tidak ada duplikasi user saat bootstrap ulang", Number(usersAfter[0].total) === 2);

  // Checkout atomik lewat RPC.
  const [target] = await sql<{ id: number; stock: number; price: number }[]>`
    SELECT id, stock, price FROM products WHERE stock >= 2 ORDER BY id LIMIT 1`;
  const [sale] = await sql<{ sale_id: number; code: string }[]>`
    SELECT sale_id, code FROM create_sale(
      1, 'Uji Otomatis', 'Umum', 0, 'cash', ${target.price * 2}, NULL,
      ${JSON.stringify([{ productId: target.id, qty: 2 }])}::text::jsonb)`;
  check("create_sale mengembalikan kode transaksi", /^TRX-\d{6}-\d{4}$/.test(sale?.code ?? ""), sale);

  const [stockNow] = await sql<{ stock: number }[]>`SELECT stock FROM products WHERE id = ${target.id}`;
  check("stok berkurang sesuai qty", Number(stockNow.stock) === target.stock - 2, stockNow);

  await sql`SELECT void_sale(${sale.sale_id})`;
  const [stockBack] = await sql<{ stock: number }[]>`SELECT stock FROM products WHERE id = ${target.id}`;
  check("void_sale mengembalikan stok", Number(stockBack.stock) === target.stock, stockBack);

  let rejected = false;
  try {
    await sql`SELECT create_sale(1, 'Uji', NULL, 0, 'cash', 0, NULL,
      ${JSON.stringify([{ productId: target.id, qty: 999999 }])}::text::jsonb)`;
  } catch {
    rejected = true;
  }
  check("checkout melebihi stok ditolak", rejected);
}

async function main() {
  pureTests();

  if (process.env.DATABASE_URL) {
    try {
      await databaseTests();
    } catch (error) {
      failed++;
      console.error("✗ uji database gagal:", error instanceof Error ? error.message : error);
    }
    await closeSql();
  } else {
    console.log("\n(DATABASE_URL tidak di-set → uji end-to-end dilewati)");
  }

  console.log(`\n${passed} lolos, ${failed} gagal.`);
  if (failed > 0) process.exitCode = 1;
}

main();
