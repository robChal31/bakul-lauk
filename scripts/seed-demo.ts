import { clearAllTables } from "../lib/reset.ts";
import { seedDatabase } from "../lib/seed.ts";
import { openDatabase, printSummary } from "./open-database.ts";

const db = openDatabase();
clearAllTables(db);
seedDatabase(db);
console.log("[kasirku] Data demo dibuat ulang (seed idempoten).");
printSummary(db);
db.close();
