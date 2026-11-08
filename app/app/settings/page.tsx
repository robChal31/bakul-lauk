import AppHeader from "@/components/AppHeader";
import SettingsForm from "@/components/SettingsForm";
import { Card } from "@/components/ui";
import { IconLogout, IconStore, IconUser } from "@/components/icons";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DATABASE_PATH } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = getSettings();
  const stats = db.get<{ sales: number; products: number; users: number }>(
    `SELECT (SELECT COUNT(*) FROM sales) AS sales,
            (SELECT COUNT(*) FROM products) AS products,
            (SELECT COUNT(*) FROM users) AS users`,
  );
  const accounts = db.all<{
    name: string;
    username: string;
    role: string;
    created_at: number;
  }>("SELECT name, username, role, created_at FROM users ORDER BY id");

  return (
    <main className="pb-28">
      <AppHeader title="Pengaturan" subtitle="Profil, akun, dan data" backHref="/app" />

      <div className="px-4 py-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-[15px] font-bold text-white">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-zinc-900">
              {user.name}
            </p>
            <p className="text-[12.5px] text-zinc-500">
              @{user.username} ·{" "}
              {user.role === "owner" ? "Pemilik toko" : "Kasir"}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-[12.5px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <IconLogout className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </Card>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Transaksi", value: stats?.sales ?? 0 },
            { label: "Produk", value: stats?.products ?? 0 },
            { label: "Akun", value: stats?.users ?? 0 },
          ].map((item) => (
            <Card key={item.label} className="p-3 text-center">
              <p className="text-[16px] font-bold text-zinc-900 tnum">
                {item.value}
              </p>
              <p className="text-[11px] text-zinc-500">{item.label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <SettingsForm settings={settings} canEdit={user.role === "owner"} />
        </div>

        <div className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <IconUser className="h-4.5 w-4.5 text-zinc-500" />
              <h2 className="text-[14px] font-semibold text-zinc-900">
                Akun demo
              </h2>
            </div>
            <div className="mt-2 divide-y divide-zinc-100">
              {accounts.map((account) => (
                <div
                  key={account.username}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-zinc-900">
                      {account.name}
                    </p>
                    <p className="text-[11.5px] text-zinc-500">
                      @{account.username} ·{" "}
                      {account.role === "owner" ? "pemilik" : "kasir"} · sejak{" "}
                      {formatDate(account.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-600">
                    {account.username === "admin" ? "admin123" : "kasir123"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <IconStore className="h-4.5 w-4.5 text-zinc-500" />
              <h2 className="text-[14px] font-semibold text-zinc-900">
                Penyimpanan data
              </h2>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-500">
              Semua transaksi disimpan di file SQLite di dalam project:
            </p>
            <p className="mt-1.5 rounded-lg bg-zinc-900 px-2.5 py-2 font-mono text-[11px] break-all text-emerald-300">
              {DATABASE_PATH}
            </p>
            <p className="mt-1.5 text-[11.5px] text-zinc-400">
              Backup cukup dengan menyalin file tersebut. Tidak ada layanan
              eksternal yang dipakai.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
