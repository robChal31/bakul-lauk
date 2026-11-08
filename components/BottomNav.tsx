"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBox,
  IconCart,
  IconChart,
  IconHome,
  IconReceipt,
} from "@/components/icons";

const ITEMS = [
  { href: "/app", label: "Beranda", icon: IconHome },
  { href: "/app/transactions", label: "Transaksi", icon: IconReceipt },
  { href: "/app/cashier", label: "Kasir", icon: IconCart, primary: true },
  { href: "/app/products", label: "Produk", icon: IconBox },
  { href: "/app/reports", label: "Laporan", icon: IconChart },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/app/cashier")) return null;

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-[560px] grid-cols-5 items-end px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {ITEMS.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center gap-1"
              >
                <span
                  className={`-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition active:scale-95 ${
                    active
                      ? "bg-emerald-700 text-white shadow-emerald-700/25"
                      : "bg-emerald-600 text-white shadow-emerald-600/25"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={`text-[10.5px] font-semibold ${
                    active ? "text-emerald-700" : "text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl py-1 transition ${
                active ? "text-emerald-700" : "text-zinc-500"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="text-[10.5px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
