import path from "node:path";

/** Lokasi file SQLite. Bisa dipindah lewat env `DATABASE_PATH`. */
export const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "kasirku.db");
