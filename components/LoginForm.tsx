"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { IconAlert, IconStore } from "@/components/icons";

const DEMO_ACCOUNTS = [
  {
    role: "Pemilik",
    username: "admin",
    password: "admin123",
    note: "Akses penuh: laporan, produk, pembatalan",
  },
  {
    role: "Kasir",
    username: "kasir",
    password: "kasir123",
    note: "Fokus transaksi & pencatatan harian",
  },
];

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");

  return (
    <div className="w-full max-w-md">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
          <IconStore className="h-7 w-7" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">
          Masuk ke Kasirku
        </h1>
        <p className="mt-1.5 max-w-[30ch] text-[13.5px] leading-relaxed text-zinc-500">
          Pencatatan penjualan harian untuk warung & toko kecil.
        </p>
      </div>

      <form action={formAction} className="card p-4">
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {state.error ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}

        <button type="submit" className="btn-primary mt-4 w-full" disabled={pending}>
          {pending ? "Memeriksa…" : "Masuk"}
        </button>
      </form>

      <div className="mt-5">
        <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-zinc-400">
          Akun demo
        </p>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              onClick={() => {
                setUsername(account.username);
                setPassword(account.password);
              }}
              className="card flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-zinc-800">
                  {account.role}
                  <span className="ml-2 font-mono text-[12px] font-normal text-zinc-500">
                    {account.username} / {account.password}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                  {account.note}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-emerald-600/10 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                Isi
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
