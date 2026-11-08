import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { formatIDR, formatTime, paymentLabel } from "@/lib/format";
import type { SaleRow } from "@/lib/queries";

export default function SaleListItem({
  sale,
  showDate = false,
}: {
  sale: SaleRow;
  showDate?: boolean;
}) {
  const meta = [
    showDate
      ? new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "numeric",
          month: "short",
        }).format(new Date(sale.created_at))
      : formatTime(sale.created_at),
    `${sale.item_count} item`,
    paymentLabel(sale.payment_method),
  ].join(" · ");

  return (
    <Link
      href={`/app/transactions/${sale.id}`}
      className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 transition last:border-b-0 hover:bg-zinc-50 active:bg-zinc-100"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${
          sale.voided
            ? "bg-rose-50 text-rose-600"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {sale.voided ? "X" : sale.code.slice(-3)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-zinc-900">
          {sale.customer_name ?? "Pelanggan umum"}
          {sale.voided ? (
            <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
              void
            </span>
          ) : null}
        </p>
        <p className="truncate text-[12px] text-zinc-500">{meta}</p>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`text-[14px] font-bold tnum ${
            sale.voided ? "text-zinc-400 line-through" : "text-zinc-900"
          }`}
        >
          {formatIDR(sale.total)}
        </span>
        <IconChevron className="h-4 w-4 text-zinc-300" />
      </div>
    </Link>
  );
}
