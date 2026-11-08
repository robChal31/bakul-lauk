"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export type SettingsResult = { ok: boolean; error?: string };

export async function saveSettings(
  _prev: SettingsResult | undefined,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await requireUser();
  if (user.role !== "owner") {
    return { ok: false, error: "Hanya pemilik yang bisa mengubah pengaturan." };
  }

  const fields = [
    "store_name",
    "store_address",
    "store_phone",
    "receipt_note",
    "low_stock_threshold",
  ];

  for (const field of fields) {
    const value = String(formData.get(field) ?? "").trim();
    const fallback = getSettings()[field as keyof ReturnType<typeof getSettings>];
    db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      field,
      value || fallback,
    );
  }

  revalidatePath("/app", "layout");
  return { ok: true };
}
