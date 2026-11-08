# Kasirku — POS pencatatan penjualan

Aplikasi kasir (POS) sederhana untuk warung/toko kecil. Fokusnya **pencatatan**:
transaksi harian, stok, pengeluaran, dan laporan. Mobile-first, tema netral
(bukan bertema kuliner), dan seluruh data disimpan di **SQLite di dalam project**.

## Menjalankan

```bash
npm install       # sekali saja (atau: pnpm install)
npm run dev
```

Buka http://localhost:3000 — kamu akan diarahkan ke halaman login.

## Akun demo

| Peran   | Username | Password   | Akses                                              |
| ------- | -------- | ---------- | -------------------------------------------------- |
| Pemilik | `admin`  | `admin123` | Semua menu, kelola produk, void/hapus, pengaturan   |
| Kasir   | `kasir`  | `kasir123` | Transaksi, riwayat, produk, pengeluaran, laporan    |

Tombol akun demo di halaman login langsung mengisi kredensialnya.

## Database (SQLite lokal)

- File: `data/kasirku.db` (bisa diubah lewat env `DATABASE_PATH`).
- Driver: `node:sqlite` bawaan Node.js 22 — tanpa dependency native, tanpa server DB.
- Skema & data demo otomatis dibuat saat file DB belum ada: katalog kecil
  10 produk lauk & ikan, ±14 hari transaksi, dan 6 catatan pengeluaran —
  cukup untuk mengisi dashboard tanpa membuat data numpuk.
- Backup = salin file `data/kasirku.db`.

Mau mulai dari nol? Hapus `data/kasirku.db` lalu jalankan ulang aplikasinya.

## Fitur

- **Beranda** — omzet hari ini vs kemarin, jumlah transaksi, laba kotor,
  grafik 7 hari, transaksi terbaru, stok menipis.
- **Kasir** — cari & filter kategori, keranjang, batas stok, diskon, metode bayar
  (tunai/QRIS/transfer/debit), uang pas & tombol pecahan, kembalian, struk.
- **Transaksi** — filter hari ini/7/30 hari, pencarian kode/nama/produk,
  detail struk (siap cetak), void & hapus (khusus pemilik).
- **Produk** — CRUD, kategori, harga jual/modal, quick +/- stok, filter stok
  menipis/habis/nonaktif.
- **Pengeluaran** — catat belanja harian per kategori + rekap 30 hari.
- **Laporan** — omzet, laba kotor, pengeluaran, laba bersih, margin, tren,
  metode pembayaran, produk terlaris.
- **Pengaturan** — profil toko (dipakai di struk), batas stok menipis, data akun.

## Catatan teknis

- Next.js 16 (App Router, Cache Components, Server Actions), React 19, Tailwind CSS 4.
- Semua akses data di server (`lib/db.ts`, `lib/queries.ts`); client hanya untuk UI.
- Zona waktu transaksi: `Asia/Jakarta`.
