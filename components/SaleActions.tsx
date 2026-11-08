"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSale, voidSale } from "@/app/actions/sales";
import { IconPrinter, IconTrash, IconX } from "@/components/icons";

export default function SaleActions({
  saleId,
  voided,
  canManage,
}: {
  saleId: number;
  voided: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleVoid() {
    setError(null);
    startTransition(async () => {
      const result = await voidSale(saleId);
      if (!result.ok) {
        setError(result.error ?? "Gagal membatalkan transaksi.");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSale(saleId);
      if (!result.ok) {
        setError(result.error ?? "Gagal menghapus transaksi.");
        return;
      }
      router.push("/app/transactions");
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-secondary w-full"
      >
        <IconPrinter className="h-4.5 w-4.5" />
        Cetak / simpan struk
      </button>

      {canManage && !voided ? (
        <button
          type="button"
          onClick={handleVoid}
          disabled={pending}
          className="btn w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        >
          <IconX className="h-4.5 w-4.5" />
          Batalkan transaksi (void)
        </button>
      ) : null}

      {canManage ? (
        confirmDelete ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-[13px] font-medium text-rose-800">
              Hapus transaksi permanen? Stok akan dikembalikan.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="btn-danger flex-1 !h-10"
              >
                Ya, hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary flex-1 !h-10"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost w-full !text-rose-600"
          >
            <IconTrash className="h-4.5 w-4.5" />
            Hapus transaksi
          </button>
        )
      ) : null}

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
