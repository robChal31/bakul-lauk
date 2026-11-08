import "server-only";
import { LOW_STOCK_THRESHOLD } from "./constants";
import { db } from "./db";
import { jakartaDay, shiftDay } from "./format";

export function dayStart(day: string): number {
  return new Date(`${day}T00:00:00+07:00`).getTime();
}

export function dayEnd(day: string): number {
  return dayStart(shiftDay(day, 1)) - 1;
}

export type Product = {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category_name: string | null;
  price: number;
  cost: number;
  stock: number;
  is_active: number;
};

export function listCategories() {
  return db.all<{ id: number; name: string; total: number }>(
    `SELECT c.id, c.name, COUNT(p.id) AS total
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id
     ORDER BY c.name`,
  );
}

export function listProducts(): Product[] {
  return db.all<Product>(
    `SELECT p.id, p.name, p.sku, p.category_id, c.name AS category_name,
            p.price, p.cost, p.stock, p.is_active
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.is_active DESC, p.name COLLATE NOCASE ASC`,
  );
}

export type DailySummary = {
  omzet: number;
  trx: number;
  items: number;
  laba: number;
  diskon: number;
  cash: number;
  qris: number;
  transfer: number;
};

export function dailySummary(day: string): DailySummary {
  const from = dayStart(day);
  const to = dayEnd(day);
  const head = db.get<{
    omzet: number;
    trx: number;
    diskon: number;
    cash: number;
    qris: number;
    transfer: number;
  }>(
    `SELECT COALESCE(SUM(total), 0) AS omzet,
            COUNT(*) AS trx,
            COALESCE(SUM(discount), 0) AS diskon,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total END), 0) AS cash,
            COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total END), 0) AS qris,
            COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total END), 0) AS transfer
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN ? AND ?`,
    from,
    to,
  );
  const detail = db.get<{ items: number; laba: number }>(
    `SELECT COALESCE(SUM(i.qty), 0) AS items,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) - COALESCE(
              (SELECT SUM(discount) FROM sales WHERE voided = 0 AND created_at BETWEEN ? AND ?), 0
            ) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN ? AND ?`,
    from,
    to,
    from,
    to,
  );
  return {
    omzet: head?.omzet ?? 0,
    trx: head?.trx ?? 0,
    diskon: head?.diskon ?? 0,
    cash: head?.cash ?? 0,
    qris: head?.qris ?? 0,
    transfer: head?.transfer ?? 0,
    items: detail?.items ?? 0,
    laba: detail?.laba ?? 0,
  };
}

export type SeriesPoint = {
  day: string;
  omzet: number;
  trx: number;
  laba: number;
};

export function salesSeries(days = 7, endDay = jakartaDay()): SeriesPoint[] {
  const start = shiftDay(endDay, -(days - 1));
  const rows = db.all<{ day: string; omzet: number; trx: number }>(
    `SELECT date(created_at / 1000, 'unixepoch', '+7 hours') AS day,
            SUM(total) AS omzet,
            COUNT(*) AS trx
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day`,
    dayStart(start),
    dayEnd(endDay),
  );
  const profit = db.all<{ day: string; laba: number }>(
    `SELECT date(s.created_at / 1000, 'unixepoch', '+7 hours') AS day,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN ? AND ?
     GROUP BY day`,
    dayStart(start),
    dayEnd(endDay),
  );
  const profitMap = new Map(profit.map((row) => [row.day, row.laba]));
  const map = new Map(rows.map((row) => [row.day, row]));

  const out: SeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDay(start, i);
    const row = map.get(day);
    out.push({
      day,
      omzet: row?.omzet ?? 0,
      trx: row?.trx ?? 0,
      laba: profitMap.get(day) ?? 0,
    });
  }
  return out;
}

export type SaleRow = {
  id: number;
  code: string;
  customer_name: string | null;
  cashier_name: string;
  total: number;
  payment_method: string;
  voided: number;
  created_at: number;
  item_count: number;
};

export function recentSales(limit = 6): SaleRow[] {
  return db.all<SaleRow>(
    `SELECT s.id, s.code, s.customer_name, s.cashier_name, s.total,
            s.payment_method, s.voided, s.created_at,
            (SELECT COALESCE(SUM(qty), 0) FROM sale_items WHERE sale_id = s.id) AS item_count
     FROM sales s
     ORDER BY s.created_at DESC
     LIMIT ?`,
    limit,
  );
}

export function listSales(options: {
  day?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}): SaleRow[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (options.day) {
    where.push("s.created_at BETWEEN ? AND ?");
    params.push(dayStart(options.day), dayEnd(options.day));
  }
  if (options.from && options.to) {
    where.push("s.created_at BETWEEN ? AND ?");
    params.push(dayStart(options.from), dayEnd(options.to));
  }
  if (options.q) {
    const like = `%${options.q}%`;
    where.push(
      `(s.code LIKE ? OR s.customer_name LIKE ? OR s.cashier_name LIKE ? OR EXISTS (
        SELECT 1 FROM sale_items i WHERE i.sale_id = s.id AND i.product_name LIKE ?
      ))`,
    );
    params.push(like, like, like, like);
  }

  return db.all<SaleRow>(
    `SELECT s.id, s.code, s.customer_name, s.cashier_name, s.total,
            s.payment_method, s.voided, s.created_at,
            (SELECT COALESCE(SUM(qty), 0) FROM sale_items WHERE sale_id = s.id) AS item_count
     FROM sales s
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.created_at DESC
     LIMIT ?`,
    ...params,
    options.limit ?? 200,
  );
}

export type SaleDetail = {
  id: number;
  code: string;
  cashier_name: string;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change_due: number;
  note: string | null;
  voided: number;
  created_at: number;
};

export type SaleItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  price: number;
  qty: number;
  line_total: number;
};

export function getSale(id: number): { sale: SaleDetail; items: SaleItem[] } | null {
  const sale = db.get<SaleDetail>(
    `SELECT id, code, cashier_name, customer_name, subtotal, discount, total,
            payment_method, amount_paid, change_due, note, voided, created_at
     FROM sales WHERE id = ?`,
    id,
  );
  if (!sale) return null;
  const items = db.all<SaleItem>(
    `SELECT id, product_id, product_name, price, qty, line_total
     FROM sale_items WHERE sale_id = ? ORDER BY id`,
    id,
  );
  return { sale, items };
}

export function salesForDay(day: string): SaleRow[] {
  return listSales({ day });
}

export function lowStockProducts(threshold = LOW_STOCK_THRESHOLD, limit = 6) {
  return db.all<{ id: number; name: string; stock: number }>(
    `SELECT id, name, stock FROM products
     WHERE is_active = 1 AND stock <= ?
     ORDER BY stock ASC, name ASC
     LIMIT ?`,
    threshold,
    limit,
  );
}

export function topProducts(from: number, to: number, limit = 5) {
  return db.all<{ product_name: string; qty: number; omzet: number; laba: number }>(
    `SELECT i.product_name,
            SUM(i.qty) AS qty,
            SUM(i.line_total) AS omzet,
            SUM((i.price - i.cost) * i.qty) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN ? AND ?
     GROUP BY i.product_name
     ORDER BY qty DESC, omzet DESC
     LIMIT ?`,
    from,
    to,
    limit,
  );
}

export function paymentBreakdown(from: number, to: number) {
  return db.all<{ payment_method: string; total: number; trx: number }>(
    `SELECT payment_method, SUM(total) AS total, COUNT(*) AS trx
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN ? AND ?
     GROUP BY payment_method
     ORDER BY total DESC`,
    from,
    to,
  );
}

export type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  user_name: string | null;
  spent_at: number;
};

export function listExpenses(from: number, to: number): Expense[] {
  return db.all<Expense>(
    `SELECT id, title, amount, category, note, user_name, spent_at
     FROM expenses
     WHERE spent_at BETWEEN ? AND ?
     ORDER BY spent_at DESC`,
    from,
    to,
  );
}

export type ReportTotals = {
  omzet: number;
  trx: number;
  items: number;
  labaKotor: number;
  diskon: number;
  pengeluaran: number;
  trxVoid: number;
};

export function reportTotals(from: number, to: number): ReportTotals {
  const head = db.get<{ omzet: number; trx: number; diskon: number; trxVoid: number }>(
    `SELECT COALESCE(SUM(CASE WHEN voided = 0 THEN total END), 0) AS omzet,
            COALESCE(SUM(CASE WHEN voided = 0 THEN 1 ELSE 0 END), 0) AS trx,
            COALESCE(SUM(CASE WHEN voided = 0 THEN discount END), 0) AS diskon,
            COALESCE(SUM(CASE WHEN voided = 1 THEN 1 ELSE 0 END), 0) AS trxVoid
     FROM sales WHERE created_at BETWEEN ? AND ?`,
    from,
    to,
  );
  const detail = db.get<{ items: number; labaKotor: number }>(
    `SELECT COALESCE(SUM(i.qty), 0) AS items,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) AS labaKotor
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN ? AND ?`,
    from,
    to,
  );
  const expense = db.get<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE spent_at BETWEEN ? AND ?`,
    from,
    to,
  );
  return {
    omzet: head?.omzet ?? 0,
    trx: head?.trx ?? 0,
    diskon: head?.diskon ?? 0,
    trxVoid: head?.trxVoid ?? 0,
    items: detail?.items ?? 0,
    labaKotor: (detail?.labaKotor ?? 0) - (head?.diskon ?? 0),
    pengeluaran: expense?.total ?? 0,
  };
}

export function expenseByCategory(from: number, to: number) {
  return db.all<{ category: string; total: number }>(
    `SELECT category, SUM(amount) AS total
     FROM expenses WHERE spent_at BETWEEN ? AND ?
     GROUP BY category ORDER BY total DESC`,
    from,
    to,
  );
}
