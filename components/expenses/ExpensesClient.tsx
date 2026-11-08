"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExpense,
  saveExpense,
  type ExpenseResult,
} from "@/app/actions/expenses";
import { IconPlus, IconTrash, IconX } from "@/components/icons";
import { Badge, Card, EmptyState } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDayShort, formatIDR, jakartaDay } from "@/lib/format";

type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  user_name: string | null;
  spent_at: number;
  day?: string;
};

type Category = { name: string; total: number };

export default function ExpensesClient({
  expenses,
  categories,
  totals,
}: {
  expenses: Expense[];
  categories: Category[];
  totals: { total: number; count: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(expense: Expense) {
    if (!window.confirm(`Hapus pengeluaran "${expense.title}"?`)) return;
    startTransition(async () => {
      await deleteExpense(expense.id);
      router.refresh();
    });
  }

  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
    const day = expense.day ?? jakartaDay(expense.spent_at);
    acc[day] = acc[day] ?? [];
    acc[day].push(expense);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card p-3.5">
          <p className="text-[12px] text-zinc-500">Total (30 hari)</p>
          <p className="mt-1 text-[17px] font-bold text-zinc-900 tnum">
            {formatIDR(totals.total)}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[12px] text-zinc-500">Jumlah catatan</p>
          <p className="mt-1 text-[17px] font-bold text-zinc-900 tnum">
            {totals.count}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        className="btn-primary mt-2.5 w-full"
      >
        <IconPlus className="h-4.5 w-4.5" />
        Catat pengeluaran
      </button>

      {categories.length > 0 ? (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {categories.map((category) => (
            <span key={category.name} className="chip !bg-white !py-1.5">
              {category.name}
              <span className="font-bold text-zinc-800 tnum">
                {formatIDR(category.total)}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {expenses.length === 0 ? (
          <Card>
            <EmptyState
              title="Belum ada pengeluaran"
              description="Catat belanja bahan, gas, listrik, dan biaya lain supaya laba bersih lebih akurat."
            />
          </Card>
        ) : (
          days.map((day) => {
            const rows = grouped[day];
            const dayTotal = rows.reduce((sum, row) => sum + row.amount, 0);
            return (
              <div key={day}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <p className="text-[12px] font-semibold text-zinc-600">
                    {formatDayShort(day)}
                  </p>
                  <p className="text-[12px] font-semibold text-zinc-500 tnum">
                    {formatIDR(dayTotal)}
                  </p>
                </div>
                <Card className="divide-y divide-zinc-100 p-0">
                  {rows.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-2 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-zinc-900">
                          {expense.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge tone="amber">{expense.category}</Badge>
                          {expense.note ? (
                            <span className="truncate text-[11.5px] text-zinc-500">
                              {expense.note}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-[13.5px] font-bold text-zinc-900 tnum">
                        {formatIDR(expense.amount)}
                      </p>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(expense);
                            setOpen(true);
                          }}
                          className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-emerald-700 active:bg-emerald-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label="Hapus"
                          disabled={pending}
                          onClick={() => handleDelete(expense)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 active:bg-rose-50"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            );
          })
        )}
      </div>

      {open ? (
        <ExpenseSheet
          expense={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ExpenseSheet({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<ExpenseResult, FormData>(
    saveExpense,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
      />
      <form
        action={formAction}
        className="animate-sheet relative z-10 flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 className="text-[16px] font-bold text-zinc-900">
            {expense ? "Edit pengeluaran" : "Pengeluaran baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="title">
                Keterangan
              </label>
              <input
                id="title"
                name="title"
                className="input"
                defaultValue={expense?.title ?? ""}
                placeholder="mis. Belanja sayur & bumbu"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="amount">
                Nominal (Rp)
              </label>
              <input
                id="amount"
                name="amount"
                className="input tnum"
                inputMode="numeric"
                defaultValue={expense?.amount ?? ""}
                placeholder="50000"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="category">
                Kategori
              </label>
              <select
                id="category"
                name="category"
                className="input"
                defaultValue={expense?.category ?? "operasional"}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="spentAt">
                Tanggal
              </label>
              <input
                id="spentAt"
                name="spentAt"
                type="date"
                className="input"
                defaultValue={
                  expense ? jakartaDay(expense.spent_at) : jakartaDay()
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="note">
                Catatan (opsional)
              </label>
              <input
                id="note"
                name="note"
                className="input"
                defaultValue={expense?.note ?? ""}
              />
            </div>
          </div>

          {state.error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
              {state.error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-zinc-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
