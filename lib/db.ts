import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase, probeDatabase } from "./database-core";
import { DATABASE_PATH } from "./db-path";
import { plain } from "./rows";

export { DATABASE_PATH, probeDatabase };


declare global {
  var __kasirkuDb: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__kasirkuDb) {
    globalThis.__kasirkuDb = openDatabase();
  }
  return globalThis.__kasirkuDb;
}

/** Tutup koneksi (dipakai script CLI sebelum file DB dihapus). */
export function closeDb() {
  if (globalThis.__kasirkuDb) {
    globalThis.__kasirkuDb.close();
    globalThis.__kasirkuDb = undefined;
  }
}

/** Helper kecil supaya pemanggilan query lebih ringkas. */
export const db = {
  all<T>(sql: string, ...params: unknown[]): T[] {
    const rows = getDb()
      .prepare(sql)
      .all(...(params as never[]));
    return rows.map((row) => plain<T>(row));
  },
  get<T>(sql: string, ...params: unknown[]): T | undefined {
    const row = getDb()
      .prepare(sql)
      .get(...(params as never[]));
    return row ? plain<T>(row) : undefined;
  },
  run(sql: string, ...params: unknown[]) {
    return getDb()
      .prepare(sql)
      .run(...(params as never[]));
  },
  tx<T>(fn: () => T): T {
    const conn = getDb();
    conn.exec("BEGIN");
    try {
      const result = fn();
      conn.exec("COMMIT");
      return result;
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  },
};
