import AppHeader from "@/components/AppHeader";
import ExpensesClient from "@/components/expenses/ExpensesClient";
import { requireUser } from "@/lib/auth";
import { jakartaDay, shiftDay } from "@/lib/format";
import { dayEnd, dayStart, expenseByCategory, listExpenses } from "@/lib/queries";

export const instant = false;

export default async function ExpensesPage() {
  await requireUser();
  const today = jakartaDay();
  const from = shiftDay(today, -29);
  const fromTs = dayStart(from);
  const toTs = dayEnd(today);

  const raw = listExpenses(fromTs, toTs);
  const expenses = raw.map((expense) => ({
    ...expense,
    day: jakartaDay(expense.spent_at),
  }));
  const totals = {
    total: raw.reduce((sum, expense) => sum + expense.amount, 0),
    count: raw.length,
  };
  const categories = expenseByCategory(fromTs, toTs).map((row) => ({
    name: row.category,
    total: row.total,
  }));

  return (
    <main className="pb-28">
      <AppHeader title="Pengeluaran" subtitle="30 hari terakhir" />
      <ExpensesClient
        expenses={expenses}
        categories={categories}
        totals={totals}
      />
    </main>
  );
}
