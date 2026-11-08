import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import SaleListItem from "@/components/SaleListItem";
import { IconSearch, IconX } from "@/components/icons";
import { Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatIDR, formatNumber, jakartaDay, shiftDay } from "@/lib/format";
import { listSales } from "@/lib/queries";

export const instant = false;

const RANGES = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "7 hari" },
  { value: "month", label: "30 hari" },
  { value: "all", label: "Semua" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const range = RANGES.some((item) => item.value === params.range)
    ? (params.range as string)
    : "today";
  const q = (params.q ?? "").trim();
  const today = jakartaDay();

  let from: string | undefined;
  let to: string | undefined;
  let day: string | undefined;

  if (range === "today") day = today;
  if (range === "week") {
    from = shiftDay(today, -6);
    to = today;
  }
  if (range === "month") {
    from = shiftDay(today, -29);
    to = today;
  }

  const sales = listSales({ day, from, to, q });
  const totalOmzet = sales
    .filter((sale) => sale.voided === 0)
    .reduce((sum, sale) => sum + sale.total, 0);

  return (
    <main className="pb-28">
      <AppHeader
        title="Transaksi"
        subtitle={`${formatNumber(sales.length)} transaksi · ${formatIDR(totalOmzet)}`}
        action={
          <Link
            href="/app/cashier"
            className="rounded-xl bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white shadow-sm"
          >
            + Kasir
          </Link>
        }
      />

      <div className="px-4 pt-3">
        <form action="/app/transactions" className="relative">
          <input type="hidden" name="range" value={range} />
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            className="input h-10 pl-9"
            placeholder="Cari kode, pelanggan, produk…"
          />
          {q ? (
            <Link
              href={`/app/transactions?range=${range}`}
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
            >
              <IconX className="h-4 w-4" />
            </Link>
          ) : null}
        </form>

        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
          {RANGES.map((item) => (
            <Link
              key={item.value}
              href={`/app/transactions?range=${item.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`chip ${range === item.value ? "chip-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-3 px-4">
        <Card className="overflow-hidden p-0">
          {sales.length === 0 ? (
            <EmptyState
              title="Tidak ada transaksi"
              description={
                q
                  ? "Coba kata kunci lain atau ubah rentang tanggal."
                  : "Transaksi yang kamu catat akan muncul di sini."
              }
            />
          ) : (
            sales.map((sale) => (
              <SaleListItem key={sale.id} sale={sale} showDate={range !== "today"} />
            ))
          )}
        </Card>
      </div>
    </main>
  );
}
