if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { LOW_STOCK_THRESHOLD } from "./constants";
import { db } from "./db";
import { dayEnd, dayStart } from "./day-range";
import { jakartaDay, shiftDay } from "./format";

export { dayEnd, dayStart };

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

export async function listCategories() {
  return db.all<{ id: number; name: string; total: number }>(
    `SELECT c.id, c.name, COUNT(p.id)::int AS total
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id, c.name
     ORDER BY c.name`,
  );
}

export async function listProducts(): Promise<Product[]> {
  return db.all<Product>(
    `SELECT p.id, p.name, p.sku, p.category_id, c.name AS category_name,
            p.price, p.cost, p.stock, p.is_active::int AS is_active
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.is_active DESC, lower(p.name) ASC`,
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

export async function dailySummary(day: string): Promise<DailySummary> {
  const from = dayStart(day);
  const to = dayEnd(day);

  const head = await db.get<{
    omzet: number;
    trx: number;
    diskon: number;
    cash: number;
    qris: number;
    transfer: number;
  }>(
    `SELECT COALESCE(SUM(total), 0) AS omzet,
            COUNT(*)::int AS trx,
            COALESCE(SUM(discount), 0) AS diskon,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total END), 0) AS cash,
            COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total END), 0) AS qris,
            COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total END), 0) AS transfer
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN $1 AND $2`,
    from,
    to,
  );

  const detail = await db.get<{ items: number; laba: number }>(
    `SELECT COALESCE(SUM(i.qty), 0)::int AS items,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) - COALESCE(
              (SELECT SUM(discount) FROM sales WHERE voided = 0 AND created_at BETWEEN $1 AND $2), 0
            ) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN $1 AND $2`,
    from,
    to,
  );

  return {
    omzet: Number(head?.omzet ?? 0),
    trx: Number(head?.trx ?? 0),
    diskon: Number(head?.diskon ?? 0),
    cash: Number(head?.cash ?? 0),
    qris: Number(head?.qris ?? 0),
    transfer: Number(head?.transfer ?? 0),
    items: Number(detail?.items ?? 0),
    laba: Number(detail?.laba ?? 0),
  };
}

export type SeriesPoint = {
  day: string;
  omzet: number;
  trx: number;
  laba: number;
};

export async function salesSeries(days = 7, endDay = jakartaDay()): Promise<SeriesPoint[]> {
  const start = shiftDay(endDay, -(days - 1));
  const from = dayStart(start);
  const to = dayEnd(endDay);

  const rows = await db.all<{ day: string; omzet: number; trx: number }>(
    `SELECT to_char(to_timestamp(created_at / 1000.0) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
            SUM(total) AS omzet,
            COUNT(*)::int AS trx
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN $1 AND $2
     GROUP BY 1
     ORDER BY 1`,
    from,
    to,
  );

  const profit = await db.all<{ day: string; laba: number }>(
    `SELECT to_char(to_timestamp(s.created_at / 1000.0) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN $1 AND $2
     GROUP BY 1`,
    from,
    to,
  );

  const profitMap = new Map(profit.map((row) => [row.day, Number(row.laba)]));
  const map = new Map(rows.map((row) => [row.day, row]));

  const out: SeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDay(start, i);
    const row = map.get(day);
    out.push({
      day,
      omzet: Number(row?.omzet ?? 0),
      trx: Number(row?.trx ?? 0),
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

const SALE_ROW_COLUMNS = `s.id, s.code, s.customer_name, s.cashier_name, s.total,
       s.payment_method, s.voided::int AS voided, s.created_at,
       (SELECT COALESCE(SUM(qty), 0) FROM sale_items WHERE sale_id = s.id)::int AS item_count`;

export async function recentSales(limit = 6): Promise<SaleRow[]> {
  return db.all<SaleRow>(
    `SELECT ${SALE_ROW_COLUMNS}
     FROM sales s
     ORDER BY s.created_at DESC
     LIMIT $1`,
    limit,
  );
}

export async function listSales(options: {
  day?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}): Promise<SaleRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (options.day) {
    params.push(dayStart(options.day), dayEnd(options.day));
    where.push(`s.created_at BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  if (options.from && options.to) {
    params.push(dayStart(options.from), dayEnd(options.to));
    where.push(`s.created_at BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  if (options.q) {
    const like = `%${options.q}%`;
    params.push(like, like, like, like);
    const base = params.length - 3;
    const [p1, p2, p3, p4] = [base, base + 1, base + 2, base + 3];
    where.push(
      `(s.code ILIKE $${p1} OR s.customer_name ILIKE $${p2} OR s.cashier_name ILIKE $${p3} OR EXISTS (
        SELECT 1 FROM sale_items i WHERE i.sale_id = s.id AND i.product_name ILIKE $${p4}
      ))`,
    );
  }

  params.push(options.limit ?? 200);

  return db.all<SaleRow>(
    `SELECT ${SALE_ROW_COLUMNS}
     FROM sales s
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.created_at DESC
     LIMIT $${params.length}`,
    ...params,
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

export async function getSale(
  id: number,
): Promise<{ sale: SaleDetail; items: SaleItem[] } | null> {
  const sale = await db.get<SaleDetail>(
    `SELECT id, code, cashier_name, customer_name, subtotal, discount, total,
            payment_method, amount_paid, change_due, note, voided::int AS voided, created_at
     FROM sales WHERE id = $1`,
    id,
  );
  if (!sale) return null;

  const items = await db.all<SaleItem>(
    `SELECT id, product_id, product_name, price, qty, line_total
     FROM sale_items WHERE sale_id = $1 ORDER BY id`,
    id,
  );
  return { sale, items };
}

export async function salesForDay(day: string): Promise<SaleRow[]> {
  return listSales({ day });
}

export async function lowStockProducts(threshold = LOW_STOCK_THRESHOLD, limit = 6) {
  return db.all<{ id: number; name: string; stock: number }>(
    `SELECT id, name, stock FROM products
     WHERE is_active = 1 AND stock <= $1
     ORDER BY stock ASC, name ASC
     LIMIT $2`,
    threshold,
    limit,
  );
}

export async function topProducts(from: number, to: number, limit = 5) {
  return db.all<{ product_name: string; qty: number; omzet: number; laba: number }>(
    `SELECT i.product_name,
            SUM(i.qty)::int AS qty,
            SUM(i.line_total) AS omzet,
            SUM((i.price - i.cost) * i.qty) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN $1 AND $2
     GROUP BY i.product_name
     ORDER BY qty DESC, omzet DESC
     LIMIT $3`,
    from,
    to,
    limit,
  );
}

export async function paymentBreakdown(from: number, to: number) {
  return db.all<{ payment_method: string; total: number; trx: number }>(
    `SELECT payment_method, SUM(total) AS total, COUNT(*)::int AS trx
     FROM sales
     WHERE voided = 0 AND created_at BETWEEN $1 AND $2
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

export async function listExpenses(from: number, to: number): Promise<Expense[]> {
  return db.all<Expense>(
    `SELECT id, title, amount, category, note, user_name, spent_at
     FROM expenses
     WHERE spent_at BETWEEN $1 AND $2
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

export async function reportTotals(from: number, to: number): Promise<ReportTotals> {
  const head = await db.get<{
    omzet: number;
    trx: number;
    diskon: number;
    trxVoid: number;
  }>(
    `SELECT COALESCE(SUM(CASE WHEN voided = 0 THEN total END), 0) AS omzet,
            COALESCE(SUM(CASE WHEN voided = 0 THEN 1 ELSE 0 END), 0)::int AS trx,
            COALESCE(SUM(CASE WHEN voided = 0 THEN discount END), 0) AS diskon,
            COALESCE(SUM(CASE WHEN voided = 1 THEN 1 ELSE 0 END), 0)::int AS trxvoid
     FROM sales WHERE created_at BETWEEN $1 AND $2`,
    from,
    to,
  );

  const detail = await db.get<{ items: number; laba: number }>(
    `SELECT COALESCE(SUM(i.qty), 0)::int AS items,
            COALESCE(SUM((i.price - i.cost) * i.qty), 0) AS laba
     FROM sale_items i
     JOIN sales s ON s.id = i.sale_id
     WHERE s.voided = 0 AND s.created_at BETWEEN $1 AND $2`,
    from,
    to,
  );

  const expense = await db.get<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE spent_at BETWEEN $1 AND $2`,
    from,
    to,
  );

  return {
    omzet: Number(head?.omzet ?? 0),
    trx: Number(head?.trx ?? 0),
    diskon: Number(head?.diskon ?? 0),
    trxVoid: Number(head?.trxVoid ?? 0),
    items: Number(detail?.items ?? 0),
    labaKotor: Number(detail?.laba ?? 0) - Number(head?.diskon ?? 0),
    pengeluaran: Number(expense?.total ?? 0),
  };
}

export async function expenseByCategory(from: number, to: number) {
  return db.all<{ category: string; total: number }>(
    `SELECT category, SUM(amount) AS total
     FROM expenses WHERE spent_at BETWEEN $1 AND $2
     GROUP BY category ORDER BY total DESC`,
    from,
    to,
  );
}
