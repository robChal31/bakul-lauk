import { formatDayShort, formatNumber, formatWeekday } from "@/lib/format";

export default function SalesBarChart({
  data,
  today,
}: {
  data: Array<{ day: string; omzet: number; trx: number }>;
  today: string;
}) {
  const max = Math.max(...data.map((point) => point.omzet), 1);

  return (
    <div className="flex items-end justify-between gap-2">
      {data.map((point) => {
        const height = Math.max(6, Math.round((point.omzet / max) * 78));
        const isToday = point.day === today;
        return (
          <div key={point.day} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={`text-[10px] font-semibold tnum ${
                isToday ? "text-emerald-700" : "text-zinc-400"
              }`}
            >
              {point.omzet > 0 ? formatNumber(Math.round(point.omzet / 1000)) : "–"}
            </span>
            <div className="flex h-[78px] w-full items-end">
              <div
                className={`w-full rounded-lg ${
                  isToday ? "bg-emerald-600" : "bg-emerald-200"
                }`}
                style={{ height: `${height}px` }}
                title={`${formatDayShort(point.day)}: ${point.trx} transaksi`}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                isToday ? "text-emerald-700" : "text-zinc-500"
              }`}
            >
              {formatWeekday(point.day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
