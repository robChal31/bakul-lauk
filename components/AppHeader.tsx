import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@/components/icons";

export default function AppHeader({
  title,
  subtitle,
  backHref,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-zinc-200/70 bg-[#f4f5f7]/90 px-4 pt-3 pb-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Kembali"
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-200/60"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="truncate text-[19px] font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[12.5px] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
