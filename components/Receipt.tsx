import { formatDateTime, formatIDR, paymentLabel } from "@/lib/format";
import type { SaleDetail, SaleItem } from "@/lib/queries";

export function ReceiptLines({
  items,
  sale,
}: {
  items: SaleItem[];
  sale: SaleDetail;
}) {
  return (
    <>
      <div className="divide-y divide-dashed divide-zinc-200">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-900">
                {item.product_name}
              </p>
              <p className="text-[11.5px] text-zinc-500 tnum">
                {item.qty} × {formatIDR(item.price)}
              </p>
            </div>
            <span className="text-[13px] font-semibold text-zinc-900 tnum">
              {formatIDR(item.line_total)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-1.5 border-t border-dashed border-zinc-300 pt-2.5 text-[13px]">
        <div className="flex justify-between text-zinc-600">
          <span>Subtotal</span>
          <span className="tnum">{formatIDR(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 ? (
          <div className="flex justify-between text-rose-600">
            <span>Diskon</span>
            <span className="tnum">- {formatIDR(sale.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-[15px] font-bold text-zinc-900">
          <span>Total</span>
          <span className="tnum">{formatIDR(sale.total)}</span>
        </div>
        <div className="flex justify-between text-zinc-600">
          <span>Bayar ({paymentLabel(sale.payment_method)})</span>
          <span className="tnum">{formatIDR(sale.amount_paid)}</span>
        </div>
        {sale.change_due > 0 ? (
          <div className="flex justify-between text-zinc-600">
            <span>Kembali</span>
            <span className="tnum">{formatIDR(sale.change_due)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-0.5 border-t border-dashed border-zinc-300 pt-2.5 text-[11.5px] text-zinc-500">
        <p className="flex justify-between">
          <span>No. transaksi</span>
          <span className="font-mono">{sale.code}</span>
        </p>
        <p className="flex justify-between">
          <span>Waktu</span>
          <span>{formatDateTime(sale.created_at)}</span>
        </p>
        <p className="flex justify-between">
          <span>Kasir</span>
          <span>{sale.cashier_name}</span>
        </p>
        {sale.customer_name ? (
          <p className="flex justify-between">
            <span>Pelanggan</span>
            <span>{sale.customer_name}</span>
          </p>
        ) : null}
        {sale.note ? (
          <p className="flex justify-between gap-4">
            <span>Catatan</span>
            <span className="text-right">{sale.note}</span>
          </p>
        ) : null}
      </div>
    </>
  );
}
