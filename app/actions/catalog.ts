"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type FormResult = { ok: boolean; error?: string };

function toInt(value: FormDataEntryValue | null, fallback = 0): number {
  const raw = String(value ?? "").replace(/[^\d-]/g, "");
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

export async function saveProduct(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false, error: "Hanya pemilik yang bisa mengubah produk." };
  }

  const id = toInt(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const categoryId = toInt(formData.get("categoryId")) || null;
  const price = toInt(formData.get("price"));
  const cost = toInt(formData.get("cost"));
  const stock = toInt(formData.get("stock"));
  const isActive = formData.get("isActive") ? 1 : 0;

  if (!name) return { ok: false, error: "Nama produk wajib diisi." };
  if (price <= 0) return { ok: false, error: "Harga jual harus lebih dari 0." };
  if (stock < 0) return { ok: false, error: "Stok tidak boleh negatif." };

  if (id > 0) {
    db.run(
      `UPDATE products SET name = ?, sku = ?, category_id = ?, price = ?, cost = ?,
         stock = ?, is_active = ? WHERE id = ?`,
      name,
      sku,
      categoryId,
      price,
      cost,
      stock,
      isActive,
      id,
    );
  } else {
    db.run(
      `INSERT INTO products (name, sku, category_id, price, cost, stock, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      name,
      sku,
      categoryId,
      price,
      cost,
      stock,
      isActive,
      Date.now(),
    );
  }

  revalidatePath("/app/products");
  revalidatePath("/app");
  return { ok: true };
}

export async function toggleProductActive(id: number, active: boolean) {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false as const, error: "Hanya pemilik yang bisa mengubah produk." };
  }
  db.run("UPDATE products SET is_active = ? WHERE id = ?", active ? 1 : 0, Number(id));
  revalidatePath("/app/products");
  revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteProduct(id: number) {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false as const, error: "Hanya pemilik yang bisa menghapus produk." };
  }
  const used = db.get<{ total: number }>(
    "SELECT COUNT(*) AS total FROM sale_items WHERE product_id = ?",
    Number(id),
  );
  if ((used?.total ?? 0) > 0) {
    db.run("UPDATE products SET is_active = 0 WHERE id = ?", Number(id));
    revalidatePath("/app/products");
    return {
      ok: true as const,
      archived: true,
      message: "Produk sudah dipakai di transaksi, jadi dinonaktifkan.",
    };
  }
  db.run("DELETE FROM products WHERE id = ?", Number(id));
  revalidatePath("/app/products");
  revalidatePath("/app");
  return { ok: true as const };
}

export async function saveCategory(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false, error: "Hanya pemilik yang bisa mengubah kategori." };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Nama kategori wajib diisi." };
  const exists = db.get<{ id: number }>(
    "SELECT id FROM categories WHERE lower(name) = lower(?)",
    name,
  );
  if (exists) return { ok: false, error: "Kategori sudah ada." };
  db.run("INSERT INTO categories (name) VALUES (?)", name);
  revalidatePath("/app/products");
  return { ok: true };
}

export async function adjustStock(id: number, delta: number) {
  await requireUser();
  const productId = Number(id);
  const change = Math.trunc(Number(delta));
  if (!productId || !change) return { ok: false as const, error: "Perubahan stok tidak valid." };
  db.run(
    "UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?",
    change,
    productId,
  );
  revalidatePath("/app/products");
  revalidatePath("/app");
  return { ok: true as const };
}
