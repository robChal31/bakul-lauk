import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { jakartaDay, shiftDay } from "./format";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

// PRNG deterministik agar data demo selalu sama.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = ["Lauk Matang", "Ikan Segar", "Ikan Olahan"];

// Katalog demo sengaja kecil: 10 produk lauk & ikan saja.
const PRODUCTS: Array<{
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  weight: number;
}> = [
  { name: "Ayam Goreng (potong)", sku: "LKK-01", category: "Lauk Matang", price: 12000, cost: 8500, stock: 24, weight: 20 },
  { name: "Ikan Kembung Goreng", sku: "LKK-02", category: "Lauk Matang", price: 10000, cost: 7000, stock: 18, weight: 16 },
  { name: "Ikan Tongkol Balado", sku: "LKK-03", category: "Lauk Matang", price: 13000, cost: 9000, stock: 14, weight: 14 },
  { name: "Telur Balado", sku: "LKK-04", category: "Lauk Matang", price: 7000, cost: 4000, stock: 25, weight: 12 },
  { name: "Tempe & Tahu Goreng (5 pcs)", sku: "LKK-05", category: "Lauk Matang", price: 6000, cost: 3000, stock: 30, weight: 10 },
  { name: "Ikan Nila Segar (per kg)", sku: "IKN-01", category: "Ikan Segar", price: 38000, cost: 30000, stock: 8, weight: 9 },
  { name: "Ikan Lele Segar (per kg)", sku: "IKN-02", category: "Ikan Segar", price: 26000, cost: 20000, stock: 12, weight: 7 },
  { name: "Udang Segar (per kg)", sku: "IKN-03", category: "Ikan Segar", price: 85000, cost: 70000, stock: 4, weight: 5 },
  { name: "Ikan Asin Peda (pack)", sku: "IKO-01", category: "Ikan Olahan", price: 15000, cost: 11000, stock: 20, weight: 6 },
  { name: "Kerupuk Ikan (pack)", sku: "IKO-02", category: "Ikan Olahan", price: 8000, cost: 5000, stock: 0, weight: 4 },
];

const CUSTOMERS = [
  "Umum",
  "Umum",
  "Umum",
  "Umum",
  "Bu Rina",
  "Mas Adi",
  "Pak Yusuf",
  "Dewi",
  "Kak Sari",
  "Om Budi",
];

const EXPENSES: Array<{ title: string; amount: number; category: string }> = [
  { title: "Belanja ikan kembung 5 kg", amount: 175000, category: "bahan baku" },
  { title: "Ikan nila & lele dari pasar", amount: 240000, category: "bahan baku" },
  { title: "Bumbu, cabai & bawang", amount: 95000, category: "bahan baku" },
  { title: "Gas LPG 3kg (2 tabung)", amount: 44000, category: "operasional" },
  { title: "Token listrik", amount: 100000, category: "operasional" },
  { title: "Plastik & kertas pembungkus", amount: 35000, category: "perlengkapan" },
];

const PAYMENTS = ["cash", "cash", "cash", "cash", "qris", "qris", "transfer"];

export function seedDatabase(conn: DatabaseSync) {
  const now = Date.now();
  const today = jakartaDay(now);
  const rand = mulberry32(20260101);

  const insertUser = conn.prepare(
    "INSERT INTO users (name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  insertUser.run("Pemilik Warung", "admin", hashPassword("admin123"), "owner", now);
  insertUser.run("Kasir Demo", "kasir", hashPassword("kasir123"), "kasir", now);

  const insertSettings = conn.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?)",
  );
  insertSettings.run("store_name", "Warung Lauk Bu Sari");
  insertSettings.run("store_address", "Jl. Melati No. 12, Jakarta Selatan");
  insertSettings.run("store_phone", "0812-3456-7890");
  insertSettings.run("receipt_note", "Terima kasih sudah belanja 🙏");
  insertSettings.run("low_stock_threshold", "10");

  const insertExpenseCategory = conn.prepare(
    "INSERT INTO expense_categories (name) VALUES (?)",
  );
  for (const name of [
    "bahan baku",
    "operasional",
    "perlengkapan",
    "perawatan",
    "sewa",
    "lainnya",
  ]) {
    insertExpenseCategory.run(name);
  }

  const insertCategory = conn.prepare("INSERT INTO categories (name) VALUES (?)");
  const categoryIds = new Map<string, number>();
  for (const name of CATEGORIES) {
    const result = insertCategory.run(name);
    categoryIds.set(name, Number(result.lastInsertRowid));
  }

  const insertProduct = conn.prepare(
    `INSERT INTO products (name, sku, category_id, price, cost, stock, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  const productRows: Array<{
    id: number;
    name: string;
    price: number;
    cost: number;
    weight: number;
  }> = [];
  for (const p of PRODUCTS) {
    const result = insertProduct.run(
      p.name,
      p.sku,
      categoryIds.get(p.category) ?? null,
      p.price,
      p.cost,
      p.stock,
      now,
    );
    productRows.push({
      id: Number(result.lastInsertRowid),
      name: p.name,
      price: p.price,
      cost: p.cost,
      weight: p.weight,
    });
  }
  const pool = productRows.flatMap((p) =>
    Array.from({ length: p.weight }, () => p),
  );

  const insertSale = conn.prepare(
    `INSERT INTO sales (code, user_id, cashier_name, customer_name, subtotal, discount, total,
       payment_method, amount_paid, change_due, note, voided, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`,
  );
  const insertItem = conn.prepare(
    `INSERT INTO sale_items (sale_id, product_id, product_name, price, cost, qty, line_total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  let sequence = 1;
  const DAYS = 14;

  conn.exec("BEGIN");
  try {
    for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
      const day = shiftDay(today, -dayOffset);
      // Hari ini: transaksi hanya sampai jam sekarang (supaya terasa wajar).
      const isToday = dayOffset === 0;
      const nowJakartaHour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          hour12: false,
        }).format(new Date(now)),
      );
      const weekend = [0, 6].includes(
        new Date(`${day}T12:00:00+07:00`).getDay(),
      );
      const baseCount = 5 + Math.floor(rand() * 5) + (weekend ? 3 : 0);
      const count = isToday
        ? Math.max(2, Math.round(baseCount * Math.min(1, (nowJakartaHour - 6) / 14)))
        : baseCount;

      const stamps: number[] = [];
      // Untuk hari ini, sebar transaksi hanya sampai jam sekarang.
      const lastHour = isToday ? Math.max(8, nowJakartaHour) : 20;
      for (let i = 0; i < count; i++) {
        const hour = 7 + Math.floor(rand() * Math.max(1, lastHour - 7));
        const minute = Math.floor(rand() * 60);
        const stamp = new Date(
          `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`,
        ).getTime();
        if (stamp <= now) stamps.push(stamp);
      }
      stamps.sort((a, b) => a - b);

      for (const stamp of stamps) {
        const itemCount = 1 + Math.floor(rand() * 2);
        const chosen = new Map<number, { product: (typeof pool)[number]; qty: number }>();
        for (let i = 0; i < itemCount; i++) {
          const product = pool[Math.floor(rand() * pool.length)];
          const qty = 1 + Math.floor(rand() * 2);
          const existing = chosen.get(product.id);
          if (existing) existing.qty += qty;
          else chosen.set(product.id, { product, qty });
        }

        let subtotal = 0;
        for (const { product, qty } of chosen.values()) {
          subtotal += product.price * qty;
        }
        const discount = rand() > 0.88 ? Math.round((subtotal * 0.05) / 500) * 500 : 0;
        const total = subtotal - discount;
        const method = PAYMENTS[Math.floor(rand() * PAYMENTS.length)];
        const paid =
          method === "cash" ? Math.ceil(total / 5000) * 5000 : total;
        const cashier = rand() > 0.45 ? "Pemilik Warung" : "Kasir Demo";
        const customer = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
        const codeDate = day.replaceAll("-", "").slice(2);
        const code = `TRX-${codeDate}-${String(sequence++).padStart(4, "0")}`;

        const sale = insertSale.run(
          code,
          1,
          cashier,
          customer === "Umum" ? null : customer,
          subtotal,
          discount,
          total,
          method,
          paid,
          paid - total,
          stamp,
        );
        const saleId = Number(sale.lastInsertRowid);
        for (const { product, qty } of chosen.values()) {
          insertItem.run(
            saleId,
            product.id,
            product.name,
            product.price,
            product.cost,
            qty,
            product.price * qty,
          );
        }
      }
    }

    const insertExpense = conn.prepare(
      `INSERT INTO expenses (title, amount, category, note, user_name, payment_source, spent_at, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
    );
    EXPENSES.forEach((expense, index) => {
      const day = shiftDay(today, -(index % 14));
      const stamp = new Date(`${day}T10:30:00+07:00`).getTime();
      insertExpense.run(
        expense.title,
        expense.amount,
        expense.category,
        "Pemilik Warung",
        index % 3 === 0 ? "transfer" : "kas",
        stamp,
        stamp,
      );
    });

    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
