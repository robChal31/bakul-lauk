if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { db } from "./db";

export type StoreSettings = {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_note: string;
  low_stock_threshold: string;
};

const DEFAULTS: StoreSettings = {
  store_name: "Bakul Lauk",
  store_address: "Jl. Melati No. 12, Jakarta Selatan",
  store_phone: "0812-3456-7890",
  receipt_note: "Terima kasih sudah belanja 🙏",
  low_stock_threshold: "10",
};

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.all<{ key: string; value: string }>(
    "SELECT key, value FROM settings",
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    store_name: map.get("store_name") ?? DEFAULTS.store_name,
    store_address: map.get("store_address") ?? DEFAULTS.store_address,
    store_phone: map.get("store_phone") ?? DEFAULTS.store_phone,
    receipt_note: map.get("receipt_note") ?? DEFAULTS.receipt_note,
    low_stock_threshold:
      map.get("low_stock_threshold") ?? DEFAULTS.low_stock_threshold,
  };
}
