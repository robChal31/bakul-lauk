"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsResult } from "@/app/actions/settings";
import { IconCheck } from "@/components/icons";
import type { StoreSettings } from "@/lib/settings";

export default function SettingsForm({
  settings,
  canEdit,
}: {
  settings: StoreSettings;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsResult, FormData>(
    saveSettings,
    { ok: false },
  );

  return (
    <form action={formAction} className="card p-4">
      <h2 className="text-[14px] font-semibold text-zinc-900">Profil toko</h2>
      <p className="mt-0.5 text-[12px] text-zinc-500">
        Nama toko tampil di struk dan halaman utama.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor="store_name">
            Nama toko
          </label>
          <input
            id="store_name"
            name="store_name"
            className="input"
            defaultValue={settings.store_name}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="label" htmlFor="store_address">
            Alamat
          </label>
          <input
            id="store_address"
            name="store_address"
            className="input"
            defaultValue={settings.store_address}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="label" htmlFor="store_phone">
            Nomor telepon
          </label>
          <input
            id="store_phone"
            name="store_phone"
            className="input"
            defaultValue={settings.store_phone}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="label" htmlFor="receipt_note">
            Catatan di struk
          </label>
          <input
            id="receipt_note"
            name="receipt_note"
            className="input"
            defaultValue={settings.receipt_note}
            disabled={!canEdit}
          />
        </div>
        <div>
          <label className="label" htmlFor="low_stock_threshold">
            Batas stok menipis
          </label>
          <input
            id="low_stock_threshold"
            name="low_stock_threshold"
            className="input tnum"
            inputMode="numeric"
            defaultValue={settings.low_stock_threshold}
            disabled={!canEdit}
          />
        </div>
      </div>

      {state.error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.ok ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700">
          <IconCheck className="h-4 w-4" />
          Pengaturan tersimpan.
        </p>
      ) : null}

      {canEdit ? (
        <button type="submit" disabled={pending} className="btn-primary mt-3 w-full">
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
      ) : (
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[12.5px] text-zinc-500">
          Hanya pemilik yang bisa mengubah pengaturan.
        </p>
      )}
    </form>
  );
}
