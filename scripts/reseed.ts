import { DATABASE_PATH } from "../lib/db-path.ts";
import { removeDatabaseFiles } from "../lib/reset.ts";
import { seedDatabase } from "../lib/seed.ts";
import { openDatabase, printSummary } from "./open-database.ts";

const dir = removeDatabaseFiles();
console.log(`[kasirku] Database lama dihapus: ${dir}`);
console.log(`[kasirku] Membuat ulang dari nol: ${DATABASE_PATH}`);

const db = openDatabase();
seedDatabase(db);
printSummary(db);
db.close();
