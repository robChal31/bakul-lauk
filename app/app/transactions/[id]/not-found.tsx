import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function SaleNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <EmptyState
          title="Transaksi tidak ditemukan"
          description="Mungkin transaksi ini sudah dihapus."
          action={
            <Link href="/app/transactions" className="btn-primary">
              Kembali ke daftar
            </Link>
          }
        />
      </div>
    </main>
  );
}
