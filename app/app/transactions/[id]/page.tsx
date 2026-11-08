import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { ReceiptLines } from "@/components/Receipt";
import SaleActions from "@/components/SaleActions";
import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, paymentLabel } from "@/lib/format";
import { getSale } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const instant = false;

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = getSale(Number(id));
  if (!data) notFound();

  const { sale, items } = data;
  const settings = getSettings();

  return (
    <main className="pb-28">
      <AppHeader
        title={sale.code}
        subtitle={formatDateTime(sale.created_at)}
        backHref="/app/transactions"
      />

      <div className="px-4 py-3">
        <div className="no-print mb-2.5 flex flex-wrap items-center gap-2 px-1">
          <Badge tone={sale.voided ? "rose" : "emerald"}>
            {sale.voided ? "Dibatalkan" : "Selesai"}
          </Badge>
          <Badge tone="sky">{paymentLabel(sale.payment_method)}</Badge>
          <Badge>{sale.cashier_name}</Badge>
        </div>

        <Card className="receipt-print px-4 py-3">
          <div className="mb-2 border-b border-dashed border-zinc-300 pb-2 text-center">
            <p className="text-[14px] font-bold text-zinc-900">{settings.store_name}</p>
            <p className="text-[11px] text-zinc-500">{settings.store_address}</p>
            <p className="text-[11px] text-zinc-500">{settings.store_phone}</p>
          </div>
          <ReceiptLines items={items} sale={sale} />
          <p className="mt-3 border-t border-dashed border-zinc-300 pt-2 text-center text-[11px] text-zinc-500">
            {settings.receipt_note}
          </p>
        </Card>

        <div className="no-print mt-3">
          <SaleActions
            saleId={sale.id}
            voided={sale.voided === 1}
            canManage={user.role === "owner"}
          />
        </div>
      </div>
    </main>
  );
}
