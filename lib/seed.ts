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

const CATEGORIES = ["Makanan", "Minuman", "Snack", "Sembako"];

const PRODUCTS: Array<{
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  weight: number;
}> = [
  { name: "Nasi Ayam Geprek", sku: "MKN-01", category: "Makanan", price: 15000, cost: 9000, stock: 40, weight: 18 },
  { name: "Nasi Telur Dadar", sku: "MKN-02", category: "Makanan", price: 12000, cost: 6500, stock: 35, weight: 14 },
  { name: "Mie Goreng Spesial", sku: "MKN-03", category: "Makanan", price: 13000, cost: 7000, stock: 30, weight: 12 },
  { name: "Nasi Uduk Komplit", sku: "MKN-04", category: "Makanan", price: 17000, cost: 10000, stock: 24, weight: 10 },
  { name: "Sate Ayam (10 tusuk)", sku: "MKN-05", category: "Makanan", price: 20000, cost: 12500, stock: 6, weight: 9 },
  { name: "Tahu Goreng (5 pcs)", sku: "MKN-06", category: "Makanan", price: 6000, cost: 3000, stock: 50, weight: 8 },
  { name: "Es Teh Manis", sku: "MNM-01", category: "Minuman", price: 5000, cost: 1500, stock: 120, weight: 22 },
  { name: "Es Jeruk", sku: "MNM-02", category: "Minuman", price: 7000, cost: 2500, stock: 90, weight: 14 },
  { name: "Kopi Hitam", sku: "MNM-03", category: "Minuman", price: 6000, cost: 2000, stock: 80, weight: 11 },
  { name: "Air Mineral 600ml", sku: "MNM-04", category: "Minuman", price: 4000, cost: 2200, stock: 100, weight: 16 },
  { name: "Teh Botol", sku: "MNM-05", category: "Minuman", price: 5000, cost: 3500, stock: 60, weight: 12 },
  { name: "Keripik Singkong", sku: "SNK-01", category: "Snack", price: 8000, cost: 5000, stock: 45, weight: 9 },
  { name: "Pisang Goreng (3 pcs)", sku: "SNK-02", category: "Snack", price: 7000, cost: 3500, stock: 36, weight: 8 },
  { name: "Kacang Goreng", sku: "SNK-03", category: "Snack", price: 6000, cost: 3500, stock: 0, weight: 6 },
  { name: "Telur Ayam (per kg)", sku: "SMB-01", category: "Sembako", price: 28000, cost: 24500, stock: 20, weight: 5 },
  { name: "Beras Premium 5kg", sku: "SMB-02", category: "Sembako", price: 68000, cost: 61000, stock: 3, weight: 4 },
  { name: "Minyak Goreng 1L", sku: "SMB-03", category: "Sembako", price: 18000, cost: 15500, stock: 25, weight: 6 },
  { name: "Gula Pasir 1kg", sku: "SMB-04", category: "Sembako", price: 16000, cost: 14000, stock: 22, weight: 5 },
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
  { title: "Belanja sayur & bumbu", amount: 185000, category: "bahan baku" },
  { title: "Gas LPG 3kg (2 tabung)", amount: 44000, category: "operasional" },
  { title: "Isi ulang air galon", amount: 20000, category: "operasional" },
  { title: "Beli ayam 5 kg", amount: 190000, category: "bahan baku" },
  { title: "Plastik kemasan & kresek", amount: 35000, category: "perlengkapan" },
  { title: "Token listrik", amount: 100000, category: "operasional" },
  { title: "Servis kulkas", amount: 150000, category: "perawatan" },
  { title: "Beli beras 25 kg", amount: 320000, category: "bahan baku" },
  { title: "Es batu & sirup", amount: 45000, category: "bahan baku" },
  { title: "Sewa lapak mingguan", amount: 200000, category: "sewa" },
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
  insertSettings.run("store_name", "Warung Bu Sari");
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
  const DAYS = 21;

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
      const baseCount = 12 + Math.floor(rand() * 10) + (weekend ? 5 : 0);
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
        const itemCount = 1 + Math.floor(rand() * 3);
        const chosen = new Map<number, { product: (typeof pool)[number]; qty: number }>();
        for (let i = 0; i < itemCount; i++) {
          const product = pool[Math.floor(rand() * pool.length)];
          const qty = 1 + Math.floor(rand() * (product.price > 20000 ? 1 : 3));
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
