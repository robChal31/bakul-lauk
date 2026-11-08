import { IconAlert } from "@/components/icons";
import type { RuntimeProblem } from "@/lib/runtime-check";

/**
 * Pesan error konfigurasi (bukan error pengguna) — ditampilkan saat deploy
 * belum benar supaya tidak berakhir di layar "This page couldn't load".
 */
export default function RuntimeErrorNotice({
  problem,
  digest,
}: {
  problem: RuntimeProblem;
  digest?: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f5f7] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <IconAlert className="h-6 w-6" />
        </div>

        <h1 className="mt-3 text-[18px] font-bold tracking-tight text-zinc-900">
          {problem.title}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-600">
          {problem.detail}
        </p>

        <div className="mt-3 rounded-xl bg-zinc-50 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Cara memperbaiki
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">
            {problem.fix}
          </p>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
          Detail lingkungan lengkap bisa dilihat di{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px]">
            /api/health
          </code>
          .
        </p>

        {digest ? (
          <p className="mt-2 font-mono text-[11px] text-zinc-400">
            kode error: {digest}
          </p>
        ) : null}

        <a
          href="/api/health"
          className="btn-secondary mt-4 w-full"
        >
          Buka diagnostik /api/health
        </a>
      </div>
    </main>
  );
}
