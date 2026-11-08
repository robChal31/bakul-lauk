import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import SalesBarChart from "@/components/SalesBarChart";
import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  formatIDR,
  formatNumber,
  jakartaDay,
  paymentLabel,
  shiftDay,
} from "@/lib/format";
import {
  dailySummary,
  dayEnd,
  dayStart,
  paymentBreakdown,
  reportTotals,
  salesSeries,
  topProducts,
} from "@/lib/queries";

export const instant = false;

const RANGES = [
  { value: "today", label: "Hari ini", days: 1 },
  { value: "week", label: "7 hari", days: 7 },
  { value: "month", label: "30 hari", days: 30 },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const range =
    RANGES.find((item) => item.value === params.range) ?? RANGES[1];
  const today = jakartaDay();
  const fromDay = shiftDay(today, -(range.days - 1));
  const from = dayStart(fromDay);
  const to = dayEnd(today);

  const totals = reportTotals(from, to);
  const todaySummary = dailySummary(today);
  const breakdown = paymentBreakdown(from, to);
  const best = topProducts(from, to, 5);
  const series = salesSeries(Math.max(range.days, 7), today);
  const labaBersih = totals.labaKotor - totals.pengeluaran;
  const margin =
    totals.omzet > 0 ? Math.round((totals.labaKotor / totals.omzet) * 100) : 0;
  const avg = totals.trx > 0 ? Math.round(totals.omzet / totals.trx) : 0;
  const maxBreakdown = Math.max(...breakdown.map((row) => row.total), 1);

  return (
    <main className="pb-28">
      <AppHeader title="Laporan" subtitle={`${range.label} · ${formatNumber(totals.trx)} transaksi`} />

      <div className="px-4 pt-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {RANGES.map((item) => (
            <Link
              key={item.value}
              href={`/app/reports?range=${item.value}`}
              className={`chip ${range.value === item.value ? "chip-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Card className="mt-3 overflow-hidden p-0">
          <div className="bg-emerald-600 px-4 py-4 text-white">
            <p className="text-[12px] font-medium text-emerald-50/90">
              Omzet {range.label.toLowerCase()}
            </p>
            <p className="mt-1 text-[26px] leading-tight font-bold tnum">
              {formatIDR(totals.omzet)}
            </p>
            <div className="mt-2 flex gap-4 text-[11.5px] text-emerald-50/90">
              <span>{formatNumber(totals.items)} item</span>
              <span>rata-rata {formatIDR(avg)}</span>
              <span>margin {margin}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-zinc-100">
            <div className="p-3.5">
              <p className="text-[11.5px] text-zinc-500">Laba kotor</p>
              <p className="mt-0.5 text-[16px] font-bold text-zinc-900 tnum">
                {formatIDR(totals.labaKotor)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                setelah diskon {formatIDR(totals.diskon)}
              </p>
            </div>
            <div className="p-3.5">
              <p className="text-[11.5px] text-zinc-500">Pengeluaran</p>
              <p className="mt-0.5 text-[16px] font-bold text-zinc-900 tnum">
                {formatIDR(totals.pengeluaran)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {totals.trxVoid > 0 ? `${totals.trxVoid} transaksi void` : "tanpa void"}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-100 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-zinc-600">
                Laba bersih (kotor − pengeluaran)
              </p>
              <p
                className={`text-[16px] font-bold tnum ${
                  labaBersih >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {formatIDR(labaBersih)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <section className="mt-5 px-4">
        <div className="mb-2.5 flex items-end justify-between px-1">
          <h2 className="text-[15px] font-semibold text-zinc-900">Tren omzet</h2>
          <span className="text-[12px] text-zinc-500">dalam ribuan rupiah</span>
        </div>
        <Card className="p-3.5">
          <SalesBarChart data={series} today={today} />
        </Card>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2.5 px-1">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Metode pembayaran
          </h2>
        </div>
        <Card className="p-3.5">
          {breakdown.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-zinc-500">
              Belum ada data.
            </p>
          ) : (
            <div className="space-y-2.5">
              {breakdown.map((row) => (
                <div key={row.payment_method}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-zinc-700">
                      {paymentLabel(row.payment_method)}
                      <span className="ml-1.5 text-zinc-400">({row.trx}x)</span>
                    </span>
                    <span className="font-semibold text-zinc-900 tnum">
                      {formatIDR(row.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.max(4, (row.total / maxBreakdown) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2.5 px-1">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Produk terlaris
          </h2>
        </div>
        <Card className="divide-y divide-zinc-100 p-0">
          {best.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-zinc-500">
              Belum ada penjualan pada periode ini.
            </p>
          ) : (
            best.map((product, index) => (
              <div key={product.product_name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-zinc-900">
                    {product.product_name}
                  </p>
                  <p className="text-[11.5px] text-zinc-500 tnum">
                    {product.qty} terjual · laba {formatIDR(product.laba)}
                  </p>
                </div>
                <span className="text-[13px] font-bold text-zinc-800 tnum">
                  {formatIDR(product.omzet)}
                </span>
              </div>
            ))
          )}
        </Card>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2.5 px-1">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Ringkasan hari ini
          </h2>
        </div>
        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-zinc-500">Omzet</p>
              <p className="mt-0.5 text-[17px] font-bold text-zinc-900 tnum">
                {formatIDR(todaySummary.omzet)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-zinc-500">Transaksi</p>
              <p className="mt-0.5 text-[17px] font-bold text-zinc-900 tnum">
                {todaySummary.trx}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone="emerald">Tunai {formatIDR(todaySummary.cash)}</Badge>
            <Badge tone="sky">QRIS {formatIDR(todaySummary.qris)}</Badge>
            <Badge tone="violet">
              Transfer {formatIDR(todaySummary.transfer)}
            </Badge>
          </div>
          <p className="mt-2 text-[11.5px] text-zinc-400">
            Diskon hari ini {formatIDR(todaySummary.diskon)} · laba kotor{" "}
            {formatIDR(todaySummary.laba)}
          </p>
        </Card>
      </section>
    </main>
  );
}
