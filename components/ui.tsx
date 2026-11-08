import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHeader({
  title,
  href,
  actionLabel = "Lihat semua",
  children,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between px-1">
      <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="text-[13px] font-medium text-emerald-700 hover:text-emerald-800"
        >
          {actionLabel}
        </Link>
      ) : (
        children
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-zinc-800">{title}</p>
      {description ? (
        <p className="max-w-[34ch] text-[13px] leading-relaxed text-zinc-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-600",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "default" | "primary" | "danger";
  icon?: ReactNode;
}) {
  const styles =
    tone === "primary"
      ? "border-transparent bg-emerald-600 text-white"
      : tone === "danger"
        ? "border-transparent bg-white"
        : "border-zinc-200/80 bg-white";
  const labelStyles =
    tone === "primary" ? "text-emerald-50/90" : "text-zinc-500";
  const hintStyles = tone === "primary" ? "text-emerald-50/80" : "text-zinc-500";

  return (
    <div
      className={`rounded-2xl border p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${styles}`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className={`text-[12px] font-medium ${labelStyles}`}>{label}</p>
        {icon ? (
          <span className={tone === "primary" ? "text-emerald-100" : "text-zinc-400"}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-[17px] font-bold tracking-tight tnum">{value}</p>
      {hint ? (
        <p className={`mt-0.5 text-[11px] font-medium ${hintStyles}`}>{hint}</p>
      ) : null}
    </div>
  );
}
