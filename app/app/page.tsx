import Link from "next/link";
import SalesBarChart from "@/components/SalesBarChart";
import SaleListItem from "@/components/SaleListItem";
import {
  IconAlert,
  IconBox,
  IconCart,
  IconChevron,
  IconClock,
  IconPlus,
  IconReceipt,
  IconTrend,
  IconWallet,
} from "@/components/icons";
import { Badge, Card, EmptyState, SectionHeader, StatTile } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  formatDayShort,
  formatIDR,
  formatNumber,
  formatTime,
  jakartaDay,
  relativeDay,
  shiftDay,
} from "@/lib/format";
import {
  dailySummary,
  dayEnd,
  dayStart,
  listExpenses,
  lowStockProducts,
  recentSales,
  salesSeries,
} from "@/lib/queries";

export const instant = false;

export default async function DashboardPage() {

  const user = await requireUser();
  const settings = getSettings();
  const threshold = Number(settings.low_stock_threshold) || 10;
  const today = jakartaDay();

  const summary = dailySummary(today);
  const yesterday = dailySummary(shiftDay(today, -1));
  const series = salesSeries(7, today);
  const recent = recentSales(5);
  const lowStock = lowStockProducts(threshold, 4);
  const expensesToday = listExpenses(dayStart(today), dayEnd(today)).reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const diff =
    yesterday.omzet > 0
      ? Math.round(((summary.omzet - yesterday.omzet) / yesterday.omzet) * 100)
      : null;
  const avg = summary.trx > 0 ? Math.round(summary.omzet / summary.trx) : 0;

  const hourNow = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const greeting =
    hourNow < 11
      ? "Selamat pagi"
      : hourNow < 15
        ? "Selamat siang"
        : hourNow < 18
          ? "Selamat sore"
          : "Selamat malam";

  return (
    <main className="pb-28">
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-zinc-500">{greeting},</p>
            <h1 className="text-[20px] font-bold tracking-tight text-zinc-900">
              {user.name}
            </h1>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {relativeDay(today, today)} · {formatDayShort(today)}
            </p>
          </div>
          <Link
            href="/app/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-bold text-emerald-700 shadow-sm ring-1 ring-zinc-200"
          >
            {user.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </Link>
        </div>
      </header>

      <section className="px-4">
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label="Penjualan hari ini"
            value={formatIDR(summary.omzet)}
            tone="primary"
            hint={
              diff === null
                ? "Belum ada pembanding"
                : `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}% vs kemarin`
            }
          />
          <StatTile
            label="Transaksi"
            value={`${formatNumber(summary.trx)}`}
            hint={`${formatNumber(summary.items)} item terjual`}
            icon={<IconReceipt className="h-4 w-4" />}
          />
          <StatTile
            label="Laba kotor"
            value={formatIDR(summary.laba)}
            hint="Setelah diskon"
            icon={<IconTrend className="h-4 w-4" />}
          />
          <StatTile
            label="Rata-rata / trx"
            value={formatIDR(avg)}
            hint={`Pengeluaran ${formatIDR(expensesToday)}`}
            icon={<IconWallet className="h-4 w-4" />}
          />
        </div>

        <div className="mt-2.5 flex gap-2">
          <Link href="/app/cashier" className="btn-primary flex-1">
            <IconPlus className="h-4.5 w-4.5" />
            Transaksi baru
          </Link>
          <Link href="/app/expenses" className="btn-secondary flex-1">
            <IconWallet className="h-4.5 w-4.5" />
            Catat pengeluaran
          </Link>
        </div>
      </section>

      <section className="mt-5 px-4">
        <SectionHeader title="7 hari terakhir">
          <span className="text-[12px] text-zinc-500">dalam ribuan rupiah</span>
        </SectionHeader>
        <Card className="p-3.5">
          <SalesBarChart data={series} today={today} />
        </Card>
      </section>

      <section className="mt-5 px-4">
        <SectionHeader title="Transaksi terbaru" href="/app/transactions" />
        <Card className="overflow-hidden p-0">
          {recent.length === 0 ? (
            <EmptyState
              icon={<IconCart className="h-6 w-6" />}
              title="Belum ada transaksi"
              description="Mulai catat penjualan pertama lewat menu Kasir."
              action={
                <Link href="/app/cashier" className="btn-primary">
                  Buka kasir
                </Link>
              }
            />
          ) : (
            recent.map((sale) => <SaleListItem key={sale.id} sale={sale} />)
          )}
        </Card>
      </section>

      {lowStock.length > 0 ? (
        <section className="mt-5 px-4">
          <SectionHeader title="Stok menipis" href="/app/products">
            <span className="text-[12px] text-zinc-500">
              {lowStock.length} produk
            </span>
          </SectionHeader>
          <Card className="divide-y divide-zinc-100 p-0">
            {lowStock.map((product) => (
              <Link
                key={product.id}
                href="/app/products"
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <IconAlert
                    className={`h-4 w-4 shrink-0 ${
                      product.stock === 0 ? "text-rose-500" : "text-amber-500"
                    }`}
                  />
                  <span className="truncate text-[13.5px] font-medium text-zinc-800">
                    {product.name}
                  </span>
                </div>
                <Badge tone={product.stock === 0 ? "rose" : "amber"}>
                  {product.stock === 0 ? "Habis" : `Sisa ${product.stock}`}
                </Badge>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      <section className="mt-5 px-4">
        <SectionHeader title="Pintasan" />
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { href: "/app/reports", label: "Laporan penjualan", icon: IconTrend },
            { href: "/app/expenses", label: "Pengeluaran", icon: IconWallet },
            { href: "/app/transactions", label: "Riwayat transaksi", icon: IconClock },
            { href: "/app/products", label: "Kelola produk", icon: IconBox },
          ].map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="card flex items-center gap-2.5 px-3.5 py-3 transition hover:border-emerald-200"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-zinc-800">
                  {shortcut.label}
                </span>
                <IconChevron className="h-4 w-4 shrink-0 text-zinc-300" />
              </Link>
            );
          })}
        </div>
      </section>

      <p className="mt-6 px-4 pb-2 text-center text-[11px] text-zinc-400">
        {settings.store_name} · transaksi terakhir{" "}
        {recent[0] ? formatTime(recent[0].created_at) : "—"}
      </p>
    </main>
  );
}
