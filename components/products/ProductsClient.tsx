"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProduct,
  saveProduct,
  toggleProductActive,
  type FormResult,
} from "@/app/actions/catalog";
import {
  IconMinus,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";
import { Badge, Card, EmptyState } from "@/components/ui";
import { adjustStock } from "@/app/actions/catalog";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatIDR } from "@/lib/format";

type Product = {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category_name: string | null;
  price: number;
  cost: number;
  stock: number;
  is_active: number;
};

type Category = { id: number; name: string };

export default function ProductsClient({
  products,
  categories,
  canManage,
}: {
  products: Product[];
  categories: Category[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "inactive">("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const byQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q) ||
        (product.category_name ?? "").toLowerCase().includes(q);
      const byFilter =
        filter === "all"
          ? true
          : filter === "low"
            ? product.is_active === 1 &&
              product.stock > 0 &&
              product.stock <= LOW_STOCK_THRESHOLD
            : filter === "out"
              ? product.is_active === 1 && product.stock <= 0
              : product.is_active === 0;
      return byQuery && byFilter;
    });
  }, [products, query, filter]);

  function quickStock(product: Product, delta: number) {
    startTransition(async () => {
      const result = await adjustStock(product.id, delta);
      if (result.ok) router.refresh();
    });
  }

  function handleDelete(product: Product) {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.ok) {
        setNotice(
          "message" in result && result.message
            ? result.message
            : "Produk dihapus.",
        );
        router.refresh();
      }
    });
  }

  function handleToggle(product: Product) {
    startTransition(async () => {
      await toggleProductActive(product.id, product.is_active === 0);
      router.refresh();
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
        <input
          className="input h-10 pl-9"
          placeholder="Cari nama, SKU, kategori…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <IconX className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5">
        {[
          { value: "all", label: "Semua" },
          { value: "low", label: "Stok menipis" },
          { value: "out", label: "Stok habis" },
          { value: "inactive", label: "Nonaktif" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value as typeof filter)}
            className={`chip ${filter === item.value ? "chip-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {canManage ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="btn-primary mt-3 w-full"
        >
          <IconPlus className="h-4.5 w-4.5" />
          Tambah produk
        </button>
      ) : null}

      {notice ? (
        <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Tutup">
            <IconX className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              title="Tidak ada produk"
              description={
                filter === "all"
                  ? "Tambahkan produk supaya bisa dipakai di kasir."
                  : "Coba ubah filter atau kata kunci pencarian."
              }
            />
          </Card>
        ) : (
          filtered.map((product) => (
            <Card key={product.id} className="p-3">
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-zinc-900">
                      {product.name}
                    </p>
                    {product.is_active === 0 ? (
                      <Badge tone="zinc">nonaktif</Badge>
                    ) : product.stock <= 0 ? (
                      <Badge tone="rose">habis</Badge>
                    ) : product.stock <= LOW_STOCK_THRESHOLD ? (
                      <Badge tone="amber">menipis</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-zinc-500">
                    {[product.sku, product.category_name]
                      .filter(Boolean)
                      .join(" · ") || "Tanpa kategori"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[12.5px]">
                    <span className="font-bold text-emerald-700 tnum">
                      {formatIDR(product.price)}
                    </span>
                    <span className="text-zinc-300">|</span>
                    <span className="text-zinc-500 tnum">
                      modal {formatIDR(product.cost)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-100 px-1 py-0.5">
                    {canManage ? (
                      <button
                        type="button"
                        aria-label="Kurangi stok"
                        disabled={pending}
                        onClick={() => quickStock(product, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 active:bg-white"
                      >
                        <IconMinus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <span className="min-w-6 text-center text-[12.5px] font-bold text-zinc-800 tnum">
                      {product.stock}
                    </span>
                    {canManage ? (
                      <button
                        type="button"
                        aria-label="Tambah stok"
                        disabled={pending}
                        onClick={() => quickStock(product, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 active:bg-white"
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Edit produk"
                        onClick={() => setEditing(product)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 active:bg-zinc-100"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={
                          product.is_active === 1 ? "Nonaktifkan" : "Aktifkan"
                        }
                        onClick={() => handleToggle(product)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600 active:bg-zinc-100"
                      >
                        {product.is_active === 1 ? "Off" : "On"}
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus produk"
                        onClick={() => handleDelete(product)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 active:bg-rose-50"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {editing ? (
        <ProductSheet
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ProductSheet({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(
    saveProduct,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
      />
      <form
        action={formAction}
        className="animate-sheet relative z-10 flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 className="text-[16px] font-bold text-zinc-900">
            {product ? "Edit produk" : "Produk baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {product ? <input type="hidden" name="id" value={product.id} /> : null}

          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="name">
                Nama produk
              </label>
              <input
                id="name"
                name="name"
                className="input"
                defaultValue={product?.name ?? ""}
                placeholder="mis. Nasi Ayam Geprek"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="label" htmlFor="sku">
                  SKU (opsional)
                </label>
                <input
                  id="sku"
                  name="sku"
                  className="input"
                  defaultValue={product?.sku ?? ""}
                  placeholder="MKN-01"
                />
              </div>
              <div>
                <label className="label" htmlFor="categoryId">
                  Kategori
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  className="input"
                  defaultValue={product?.category_id ?? ""}
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="label" htmlFor="price">
                  Harga jual
                </label>
                <input
                  id="price"
                  name="price"
                  className="input tnum"
                  inputMode="numeric"
                  defaultValue={product?.price ?? ""}
                  placeholder="15000"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="cost">
                  Harga modal
                </label>
                <input
                  id="cost"
                  name="cost"
                  className="input tnum"
                  inputMode="numeric"
                  defaultValue={product?.cost ?? ""}
                  placeholder="9000"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="stock">
                Stok saat ini
              </label>
              <input
                id="stock"
                name="stock"
                className="input tnum"
                inputMode="numeric"
                defaultValue={product?.stock ?? 0}
              />
            </div>
            <label className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={product ? product.is_active === 1 : true}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[13px] font-medium text-zinc-700">
                Tampilkan di kasir (aktif)
              </span>
            </label>
          </div>

          {state.error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
              {state.error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-zinc-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Menyimpan…" : "Simpan produk"}
          </button>
        </div>
      </form>
    </div>
  );
}
