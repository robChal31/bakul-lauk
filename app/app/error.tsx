"use client";

import { IconAlert } from "@/components/icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <IconAlert className="h-6 w-6" />
      </div>
      <h1 className="mt-3 text-[17px] font-bold text-zinc-900">
        Ada yang tidak berjalan
      </h1>
      <p className="mt-1 max-w-[32ch] text-[13px] leading-relaxed text-zinc-500">
        Halaman ini gagal dimuat. Coba muat ulang, data transaksi tetap aman di
        SQLite.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-zinc-400">
          kode: {error.digest}
        </p>
      ) : null}
      <button type="button" onClick={reset} className="btn-primary mt-4">
        Coba lagi
      </button>
    </main>
  );
}
