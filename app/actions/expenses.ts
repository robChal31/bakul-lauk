"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type ExpenseResult = { ok: boolean; error?: string };

export async function saveExpense(
  _prev: ExpenseResult | undefined,
  formData: FormData,
): Promise<ExpenseResult> {
  const user = await requireUser();

  const id = Number(formData.get("id")) || 0;
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  const category = String(formData.get("category") ?? "operasional").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const spentAt = String(formData.get("spentAt") ?? "");

  if (!title) return { ok: false, error: "Keterangan pengeluaran wajib diisi." };
  if (!amount || amount <= 0) return { ok: false, error: "Nominal harus lebih dari 0." };

  const stamp = spentAt
    ? new Date(`${spentAt}T12:00:00+07:00`).getTime()
    : Date.now();

  if (id > 0) {
    await db.run(
      `UPDATE expenses SET title = $1, amount = $2, category = $3, note = $4, spent_at = $5
       WHERE id = $6`,
      title,
      amount,
      category,
      note,
      stamp,
      id,
    );
  } else {
    await db.run(
      `INSERT INTO expenses (title, amount, category, note, user_name, spent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      title,
      amount,
      category,
      note,
      user.name,
      stamp,
      Date.now(),
    );
  }

  revalidatePath("/app/expenses");
  revalidatePath("/app");
  revalidatePath("/app/reports");
  return { ok: true };
}

export async function deleteExpense(id: number) {
  await requireUser();
  await db.run("DELETE FROM expenses WHERE id = $1", Number(id));
  revalidatePath("/app/expenses");
  revalidatePath("/app");
  revalidatePath("/app/reports");
  return { ok: true as const };
}
