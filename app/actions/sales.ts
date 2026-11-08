"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
    // Seluruh validasi stok + insert + pengurangan stok dikerjakan di dalam
    // satu fungsi Postgres (supabase/schema.sql → create_sale), jadi atomik
    // walau koneksi lewat jaringan ke Supabase.
    const rows = await db.all<{ sale_id: number; code: string }>(
      `SELECT sale_id, code FROM create_sale($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb)`,
      user.id,
      user.name,
      input.customerName?.trim() || null,
      Math.max(0, Math.round(Number(input.discount) || 0)),
      paymentMethod,
      Math.max(0, Math.round(Number(input.amountPaid) || 0)),
      input.note?.trim() || null,
      JSON.stringify(cleaned),
    );

    const sale = rows[0];
    if (!sale) {
      return { ok: false, error: "Gagal menyimpan transaksi." };
    }

    revalidatePath("/app", "layout");
    return { ok: true, saleId: Number(sale.sale_id), code: sale.code };
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

  try {
    await db.run("SELECT void_sale($1)", saleId);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Gagal membatalkan transaksi.",
    };
  }

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

  try {
    await db.run("SELECT delete_sale($1)", saleId);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Gagal menghapus transaksi.",
    };
  }

  revalidatePath("/app", "layout");
  return { ok: true as const };
}
