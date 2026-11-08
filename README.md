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
Saat database masih kosong, data demo dibuat otomatis pada akses pertama.

## Akun demo

| Peran   | Username | Password   | Akses                                              |
| ------- | -------- | ---------- | -------------------------------------------------- |
| Pemilik | `admin`  | `admin123` | Semua menu, kelola produk, void/hapus, pengaturan   |
| Kasir   | `kasir`  | `kasir123` | Transaksi, riwayat, produk, pengeluaran, laporan    |

Tombol akun demo di halaman login langsung mengisi kredensialnya.

## Database (SQLite lokal)

- File: `data/kasirku.db` (bisa diubah lewat env `DATABASE_PATH`).
- Driver: `node:sqlite` bawaan Node.js **≥ 22.13** (sejak versi itu tidak butuh flag
  `--experimental-sqlite`) — tanpa dependency native, tanpa server DB.
- Backup = salin file `data/kasirku.db`.
- Urutan pemilihan lokasi: env `DATABASE_PATH` → `data/kasirku.db` (kalau folder bisa
  ditulis) → `$TMPDIR/kasirku/kasirku.db` (kalau filesystem read-only, mis. di serverless).
- Diagnostik: buka **`/api/health`** untuk melihat Node, path DB yang benar-benar
  dipakai, status penyimpanan (sementara/permanen), dan jumlah baris.

### Kapan database di-seed?

| Situasi | Yang terjadi |
| --- | --- |
| Database kosong (file belum ada / tabel `users` masih kosong) | Seed data demo **otomatis** saat pertama diakses — juga untuk setup/deploy pertama |
| Database sudah berisi data | **Tidak disentuh sama sekali**: build, restart, maupun pull request tidak menimpa datamu |
| Kamu memang minta reset | Hanya lewat perintah manual di bawah |

Data demo: 10 produk lauk & ikan, ±14 hari transaksi, 6 catatan pengeluaran.

Perintah manual (**keduanya menghapus data lama** — jalankan hanya saat mau reset):

```bash
npm run db:reset   # hapus file DB + buat ulang data demo dari nol
npm run db:seed    # kosongkan semua tabel + isi ulang data demo (file DB tetap)
npm run test:db    # uji: pastikan seed tidak menimpa data valid (pakai DB sementara)
```

Mau mulai mencatat dari nol tanpa data contoh? Jalankan `npm run db:reset`, lalu
hapus transaksi/produk contoh lewat aplikasi.

## Deploy ke Netlify

Repo ini sudah menyertakan `netlify.toml` (build `npm run build`, plugin
`@netlify/plugin-nextjs`, `NODE_VERSION=22`). Setelah situs terhubung ke repo,
Netlify otomatis memakai konfigurasi itu — **tidak perlu `npm install` manual**.

### Hal penting: filesystem Netlify read-only

Netlify Functions tidak punya filesystem yang bisa ditulis (selain `/tmp`, yang
sementara per instance). Karena itu aplikasi **tidak lagi** memaksa membuat
folder `data/` saat berjalan di serverless:

| Lingkungan | Lokasi DB | Data bertahan? |
| --- | --- | --- |
| Lokal / VPS (folder writable) | `data/kasirku.db` | Ya |
| Netlify tanpa `DATABASE_PATH` | `$TMPDIR/kasirku/kasirku.db` (biasanya `/tmp/...`) | Tidak — kembali ke data demo saat instance dingin/restart |
| Serverless + `DATABASE_PATH` ke volume persistent | sesuai env | Ya |

Artinya, aplikasi **jalan** di Netlify (halaman tidak 500 lagi), tapi karena
`/tmp` bersifat sementara, data yang dicatat dari HP bisa hilang ketika function
di-restart. Untuk pencatatan yang benar-benar permanen, arahkan `DATABASE_PATH`
ke penyimpanan persistent:

1. **Cara termudah (tanpa ubah kode):** pasang volume persistent (mis. Netlify
   Blobs tidak bisa dipakai langsung oleh `node:sqlite`) — praktisnya pakai VPS
   kecil/Fly.io/Railway dengan disk, lalu set `DATABASE_PATH=/data/kasirku.db`.
2. **Kalau harus tetap di Netlify:** perlu driver eksternal (Turso/libSQL atau
   Postgres) — ini berarti menambah dependency/akun layanan di luar SQLite lokal.

### Checklist kalau deploy masih error

1. Buka `https://<situs>.netlify.app/api/health` — JSON-nya menyebut penyebabnya.
2. `"node": "22.x"` di build environment; kalau lebih lama dari 22.13, set env
   `NODE_VERSION=22` lalu deploy ulang (clear cache).
3. Kalau ada pesan `unable to open database file`, set `DATABASE_PATH` ke folder
   yang bisa ditulis (mis. `/tmp/kasirku/kasirku.db`).
4. Halaman error kini menjelaskan masalahnya + tombol "Coba lagi", bukan layar
   kosong "This page couldn't load".


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
- Lokasi database ditentukan `lib/db-path.ts`; pemeriksaan prasyarat runtime
  (Node ≥ 22.13, filesystem writable) ada di `lib/runtime-check.ts` dan
  ditampilkan lewat `components/RuntimeErrorNotice.tsx` + `app/global-error.tsx`.
- `/api/health` selalu dieksekusi saat request (bukan di-prerender), jadi angkanya
  mencerminkan runtime.
