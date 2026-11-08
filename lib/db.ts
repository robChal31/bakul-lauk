if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { getSql } from "./sql";

async function query<T>(text: string, params: unknown[]): Promise<T[]> {
  // `unsafe` = SQL teks biasa dengan parameter ter-bind ($1, $2, ...).
  const rows = await getSql().unsafe(text, params as never[]);
  return rows as unknown as T[];
}

/**
 * Helper query Postgres. Pemakaian: `await db.all<T>(sql, ...params)`.
 * Semua parameter di-bind oleh driver, jadi aman dari SQL injection.
 */
export const db = {
  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return query<T>(sql, params);
  },
  async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? undefined;
  },
  async run(sql: string, ...params: unknown[]): Promise<void> {
    await query(sql, params);
  },
};

export { closeSql, hasDatabaseUrl } from "./sql";
