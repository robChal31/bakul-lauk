"use client";

import { useMemo, useReducer, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSale } from "@/app/actions/sales";
import {
  IconArrowLeft,
  IconCheck,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";
import { formatIDR } from "@/lib/format";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_name: string | null;
};

type Line = { id: number; qty: number };

type CartState = Line[];

type CartAction =
  | { type: "add"; id: number }
  | { type: "dec"; id: number }
  | { type: "remove"; id: number }
  | { type: "clear" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.find((line) => line.id === action.id);
      if (existing) {
        return state.map((line) =>
          line.id === action.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...state, { id: action.id, qty: 1 }];
    }
    case "dec": {
      return state
        .map((line) =>
          line.id === action.id ? { ...line, qty: line.qty - 1 } : line,
        )
        .filter((line) => line.qty > 0);
    }
    case "remove":
      return state.filter((line) => line.id !== action.id);
    case "clear":
      return [];
    default:
      return state;
  }
}

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Tunai" },
  { value: "qris", label: "QRIS" },
  { value: "transfer", label: "Transfer" },
  { value: "debit", label: "Debit" },
];

const QUICK_CASH = [10000, 20000, 50000, 100000];

export default function Cashier({
  products,
  categories,
  cashierName,
  storeName,
}: {
  products: Product[];
  categories: string[];
  cashierName: string;
  storeName: string;
}) {
  const router = useRouter();
  const [cart, dispatch] = useReducer(reducer, []);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountInput, setDiscountInput] = useState("");
  const [cashInput, setCashInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    saleId: number;
    code: string;
    change: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lines = useMemo(
    () =>
      cart
        .map((line) => {
          const product = productMap.get(line.id);
          return product ? { ...line, product } : null;
        })
        .filter((line): line is { id: number; qty: number; product: Product } =>
          Boolean(line),
        ),
    [cart, productMap],
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0,
  );
  const discount = Math.min(
    Math.max(0, Math.round(Number(discountInput) || 0)),
    subtotal,
  );
  const total = subtotal - discount;
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
  const cashPaid = Math.round(Number(cashInput) || 0);
  const change = Math.max(0, cashPaid - total);
  const cashEnough = paymentMethod !== "cash" || cashPaid >= total;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const byCategory =
        activeCategory === "Semua" || product.category_name === activeCategory;
      const byQuery = !q || product.name.toLowerCase().includes(q);
      return byCategory && byQuery;
    });
  }, [products, query, activeCategory]);

  function addToCart(productId: number) {
    const product = productMap.get(productId);
    if (!product) return;
    const inCart = cart.find((line) => line.id === productId)?.qty ?? 0;
    if (inCart >= product.stock) {
      setNotice(`Stok ${product.name} tersisa ${product.stock}.`);
      return;
    }
    setNotice(null);
    dispatch({ type: "add", id: productId });
  }

  function openSheet() {
    setError(null);
    setCashInput(String(total));
    setSheetOpen(true);
  }

  function submit() {
    if (lines.length === 0) return;
    if (!cashEnough) {
      setError("Uang tunai kurang dari total.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createSale({
        items: lines.map((line) => ({ productId: line.id, qty: line.qty })),
        paymentMethod,
        amountPaid: paymentMethod === "cash" ? cashPaid : total,
        discount,
        customerName,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setReceipt({
        saleId: result.saleId,
        code: result.code,
        change: paymentMethod === "cash" ? change : 0,
      });
      setSheetOpen(false);
      dispatch({ type: "clear" });
      setDiscountInput("");
      setCashInput("");
      setCustomerName("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#f4f5f7]/95 px-4 pt-3 pb-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/app"
            aria-label="Kembali ke beranda"
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-200/60"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {storeName}
            </p>
            <h1 className="text-[18px] font-bold tracking-tight text-zinc-900">
              Transaksi baru
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">Kasir bertugas</p>
            <p className="text-[12.5px] font-semibold text-zinc-800">
              {cashierName}
            </p>
          </div>
        </div>

        <div className="relative mt-2.5">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
          <input
            className="input h-10 pl-9"
            placeholder="Cari produk…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            inputMode="search"
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
          {["Semua", ...categories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`chip ${
                activeCategory === category ? "chip-active" : ""
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <section className="px-4 py-3">
        {notice ? (
          <div className="mb-2.5 flex items-start justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800">
            <span>{notice}</span>
            <button type="button" aria-label="Tutup" onClick={() => setNotice(null)}>
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-zinc-500">
            Produk tidak ditemukan.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((product) => {
              const inCart = cart.find((line) => line.id === product.id);
              const habis = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={habis}
                  onClick={() => addToCart(product.id)}
                  className={`card relative flex flex-col items-start gap-1 p-3 text-left transition active:scale-[0.99] ${
                    habis
                      ? "opacity-50"
                      : "hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  {inCart ? (
                    <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                      {inCart.qty}
                    </span>
                  ) : null}
                  <p className="pr-6 text-[13.5px] leading-snug font-semibold text-zinc-900">
                    {product.name}
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    {habis ? "Stok habis" : `Stok ${product.stock}`}
                  </p>
                  <p className="mt-auto pt-1 text-[14px] font-bold text-emerald-700 tnum">
                    {formatIDR(product.price)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Keranjang ringkas, menempel di atas bottom bar */}
      {lines.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/97 backdrop-blur">
          <div className="mx-auto w-full max-w-[560px]">
            <div className="max-h-[30vh] overflow-y-auto px-4 pt-1.5">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-2 border-b border-zinc-100 py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-zinc-900">
                      {line.product.name}
                    </p>
                    <p className="text-[11.5px] text-zinc-500 tnum">
                      {formatIDR(line.product.price)} · {line.qty} pcs
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Kurangi"
                      onClick={() => dispatch({ type: "dec", id: line.id })}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 active:bg-zinc-100"
                    >
                      <IconMinus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-[13px] font-bold tnum">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah"
                      onClick={() => addToCart(line.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 active:bg-zinc-100"
                    >
                      <IconPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus item"
                      onClick={() => dispatch({ type: "remove", id: line.id })}
                      className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 active:bg-rose-50"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-[13px] font-bold text-zinc-900 tnum">
                    {formatIDR(line.product.price * line.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-zinc-500">
                  {totalQty} item ·{" "}
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "clear" })}
                    className="font-semibold text-rose-600"
                  >
                    kosongkan
                  </button>
                </p>
                <p className="text-[17px] font-bold text-zinc-900 tnum">
                  {formatIDR(total)}
                </p>
              </div>
              <button type="button" onClick={openSheet} className="btn-primary px-5">
                Bayar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sheet pembayaran */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
          />
          <div className="animate-sheet relative z-10 flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div>
                <h2 className="text-[16px] font-bold text-zinc-900">Pembayaran</h2>
                <p className="text-[12px] text-zinc-500">
                  {totalQty} item · {formatIDR(subtotal)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3">
              <div className="rounded-2xl bg-zinc-50 px-3.5 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-zinc-500">Total tagihan</span>
                  <span className="text-[22px] font-bold text-zinc-900 tnum">
                    {formatIDR(total)}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <label className="label" htmlFor="discount">
                  Diskon (Rp)
                </label>
                <input
                  id="discount"
                  className="input tnum"
                  inputMode="numeric"
                  placeholder="0"
                  value={discountInput}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^\d]/g, "");
                    const nextDiscount = Math.min(
                      Math.max(0, Number(raw) || 0),
                      subtotal,
                    );
                    const nextTotal = subtotal - nextDiscount;
                    // Kalau kasir belum mengubah nominal tunai, ikutkan total baru.
                    if (Number(cashInput) === total) {
                      setCashInput(String(nextTotal));
                    }
                    setDiscountInput(raw);
                  }}
                />
              </div>

              <p className="label mt-3">Metode bayar</p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(option.value);
                      if (option.value !== "cash") setCashInput(String(total));
                    }}
                    className={`h-10 rounded-xl border text-[13px] font-semibold transition ${
                      paymentMethod === option.value
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" ? (
                <div className="mt-3">
                  <label className="label" htmlFor="cash">
                    Uang diterima
                  </label>
                  <input
                    id="cash"
                    className="input tnum"
                    inputMode="numeric"
                    value={cashInput}
                    onChange={(event) =>
                      setCashInput(event.target.value.replace(/[^\d]/g, ""))
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashInput(String(total))}
                      className="chip !py-1.5 !text-[12px]"
                    >
                      Uang pas
                    </button>
                    {QUICK_CASH.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCashInput(String(amount))}
                        className="chip !py-1.5 !text-[12px]"
                      >
                        {formatIDR(amount)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                    <span className="text-[13px] font-medium text-emerald-800">
                      Kembalian
                    </span>
                    <span className="text-[16px] font-bold text-emerald-800 tnum">
                      {formatIDR(change)}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2">
                <div>
                  <label className="label" htmlFor="customer">
                    Nama pelanggan (opsional)
                  </label>
                  <input
                    id="customer"
                    className="input"
                    placeholder="Umum"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="note">
                    Catatan (opsional)
                  </label>
                  <input
                    id="note"
                    className="input"
                    placeholder="mis. bungkus terpisah"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </div>

              {error ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-t border-zinc-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <button
                type="button"
                onClick={submit}
                disabled={pending || lines.length === 0}
                className="btn-primary w-full !h-12 text-[15px]"
              >
                {pending ? "Menyimpan…" : `Simpan · ${formatIDR(total)}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Struk berhasil */}
      {receipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" />
          <div className="animate-pop relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <IconCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-[17px] font-bold text-zinc-900">
                Transaksi tersimpan
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-500">{receipt.code}</p>
              {receipt.change > 0 ? (
                <p className="mt-3 w-full rounded-xl bg-emerald-50 py-2 text-[14px] font-semibold text-emerald-800">
                  Kembalian {formatIDR(receipt.change)}
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2">
              <a
                href={`/app/transactions/${receipt.saleId}`}
                className="btn-secondary w-full"
              >
                Lihat detail transaksi
              </a>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="btn-primary w-full"
              >
                Transaksi berikutnya
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
