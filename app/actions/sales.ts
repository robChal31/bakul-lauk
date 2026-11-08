"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jakartaDay } from "@/lib/format";

export type CartLine = { productId: number; qty: number };

export type CheckoutInput = {
  items: CartLine[];
  paymentMethod: string;
  amountPaid: number;
  discount: number;
  customerName?: string;
  note?: string;
};

export type CheckoutResult =
  | { ok: true; saleId: number; code: string }
  | { ok: false; error: string };

const PAYMENT_METHODS = new Set(["cash", "qris", "transfer", "debit"]);

export async function createSale(input: CheckoutInput): Promise<CheckoutResult> {
  const user = await requireUser();

  const cleaned = (input.items ?? [])
    .map((line) => ({
      productId: Number(line.productId),
      qty: Math.floor(Number(line.qty)),
    }))
    .filter((line) => line.productId > 0 && line.qty > 0);

  if (cleaned.length === 0) {
    return { ok: false, error: "Keranjang masih kosong." };
  }

  const paymentMethod = PAYMENT_METHODS.has(input.paymentMethod)
    ? input.paymentMethod
    : "cash";

  try {
    const result = db.tx(() => {
      const rows = cleaned.map((line) => {
        const product = db.get<{
          id: number;
          name: string;
          price: number;
          cost: number;
          stock: number;
          is_active: number;
        }>("SELECT id, name, price, cost, stock, is_active FROM products WHERE id = ?", line.productId);
        if (!product || product.is_active !== 1) {
          throw new Error("Ada produk yang sudah tidak tersedia.");
        }
        if (product.stock < line.qty) {
          throw new Error(
            product.stock <= 0
              ? `Stok ${product.name} habis.`
              : `Stok ${product.name} tersisa ${product.stock}.`,
          );
        }
        return { ...product, qty: line.qty };
      });

      const subtotal = rows.reduce((sum, row) => sum + row.price * row.qty, 0);
      const discount = Math.min(
        Math.max(0, Math.round(Number(input.discount) || 0)),
        subtotal,
      );
      const total = subtotal - discount;
      const amountPaid =
        paymentMethod === "cash"
          ? Math.max(total, Math.round(Number(input.amountPaid) || 0))
          : total;
      const now = Date.now();

      const day = jakartaDay(now).replaceAll("-", "").slice(2);
      const counter = db.get<{ total: number }>(
        "SELECT COUNT(*) AS total FROM sales",
      );
      const code = `TRX-${day}-${String((counter?.total ?? 0) + 1).padStart(4, "0")}`;

      const insert = db.run(
        `INSERT INTO sales (code, user_id, cashier_name, customer_name, subtotal, discount,
           total, payment_method, amount_paid, change_due, note, voided, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        code,
        user.id,
        user.name,
        input.customerName?.trim() || null,
        subtotal,
        discount,
        total,
        paymentMethod,
        amountPaid,
        amountPaid - total,
        input.note?.trim() || null,
        now,
      );
      const saleId = Number(insert.lastInsertRowid);

      for (const row of rows) {
        db.run(
          `INSERT INTO sale_items (sale_id, product_id, product_name, price, cost, qty, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          saleId,
          row.id,
          row.name,
          row.price,
          row.cost,
          row.qty,
          row.price * row.qty,
        );
        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", row.qty, row.id);
      }

      return { saleId, code };
    });

    revalidatePath("/app", "layout");
    return { ok: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan transaksi.";
    return { ok: false, error: message };
  }
}

export async function voidSale(id: number) {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false as const, error: "Hanya pemilik yang bisa membatalkan transaksi." };
  }
  const saleId = Number(id);
  if (!saleId) return { ok: false as const, error: "Transaksi tidak ditemukan." };

  db.tx(() => {
    const sale = db.get<{ voided: number }>("SELECT voided FROM sales WHERE id = ?", saleId);
    if (!sale) throw new Error("Transaksi tidak ditemukan.");
    if (sale.voided === 1) throw new Error("Transaksi ini sudah dibatalkan.");

    const items = db.all<{ product_id: number | null; qty: number }>(
      "SELECT product_id, qty FROM sale_items WHERE sale_id = ?",
      saleId,
    );
    for (const item of items) {
      if (item.product_id) {
        db.run(
          "UPDATE products SET stock = stock + ? WHERE id = ?",
          item.qty,
          item.product_id,
        );
      }
    }
    db.run("UPDATE sales SET voided = 1 WHERE id = ?", saleId);
  });

  revalidatePath("/app", "layout");
  return { ok: true as const };
}

export async function deleteSale(id: number) {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false as const, error: "Hanya pemilik yang bisa menghapus transaksi." };
  }
  const saleId = Number(id);
  if (!saleId) return { ok: false as const, error: "Transaksi tidak ditemukan." };

  db.tx(() => {
    const sale = db.get<{ voided: number }>("SELECT voided FROM sales WHERE id = ?", saleId);
    if (!sale) throw new Error("Transaksi tidak ditemukan.");
    if (sale.voided === 0) {
      const items = db.all<{ product_id: number | null; qty: number }>(
        "SELECT product_id, qty FROM sale_items WHERE sale_id = ?",
        saleId,
      );
      for (const item of items) {
        if (item.product_id) {
          db.run(
            "UPDATE products SET stock = stock + ? WHERE id = ?",
            item.qty,
            item.product_id,
          );
        }
      }
    }
    db.run("DELETE FROM sale_items WHERE sale_id = ?", saleId);
    db.run("DELETE FROM sales WHERE id = ?", saleId);
  });

  revalidatePath("/app", "layout");
  return { ok: true as const };
}
