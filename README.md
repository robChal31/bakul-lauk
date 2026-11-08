# Kasirku — POS pencatatan penjualan

Aplikasi kasir (POS) sederhana untuk warung/toko kecil. Fokusnya **pencatatan**:
transaksi harian, stok, pengeluaran, dan laporan. Mobile-first, tema netral
(bukan bertema kuliner), dan data disimpan di **Postgres/Supabase**.

## Menjalankan

```bash
npm install       # sekali saja (atau: pnpm install)
cp .env.example .env.local   # lalu isi DATABASE_URL (lihat bagian Database)
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

## Database (Postgres / Supabase)

Aplikasi memakai **Postgres (Supabase)** sebagai satu-satunya database — tidak ada
SQLite dan tidak ada file database di dalam project. Semua query lewat satu
connection string:

```bash
# .env.local (lokal) atau env Netlify (deploy)
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"
```

- Driver: [`postgres`](https://github.com/porsager/postgres) — murni JS, cocok untuk
  serverless (satu pool per instance, `prepare` dimatikan otomatis untuk pooler).
- Skema + fungsi RPC ada di **`supabase/schema.sql`** (idempoten).
- Diagnostik: **`/api/health`** → status koneksi, host database (password disamarkan),
  jumlah produk & transaksi.

### Kapan database di-seed?

| Situasi | Yang terjadi |
| --- | --- |
| Tabel `users` masih kosong | Seed data demo **otomatis** saat pertama diakses (juga saat deploy pertama) |
| Database sudah berisi data | **Tidak disentuh sama sekali**: build, restart, maupun pull request tidak menimpa datamu |
| Kamu memang minta reset | Hanya lewat perintah manual di bawah |

Data demo: 10 produk lauk & ikan, ±14 hari transaksi, 6 catatan pengeluaran.

Perintah manual (**menghapus data lama** — hanya untuk reset):

```bash
npm run db:setup    # terapkan supabase/schema.sql (tanpa menyentuh data)
npm run db:setup:seed  # schema + seed, hanya kalau tabel users kosong
npm run db:seed     # kosongkan semua tabel lalu isi ulang data demo
npm run db:reset    # sama seperti db:seed (alias reset penuh)
npm run db:check    # cek koneksi & skema
npm run test:db     # uji logika (+ end-to-end bila DATABASE_URL di-set)
```

> `test:db` dengan `DATABASE_URL` **menghapus tabel** di database yang ditunjuk.
> Pakai database uji terpisah, jangan database produksi.

### Setup Supabase dari nol

1. Buat project di [supabase.com](https://supabase.com) (region terdekat, mis. Singapore).
2. **SQL Editor → New query** → tempel isi `supabase/schema.sql` → **Run**.
   (Atau lokal: `DATABASE_URL=... npm run db:setup`.)
3. **Project Settings → Database → Connection string → Connection pooling**
   (port `6543`). Ganti password `[YOUR-PASSWORD]` dengan password database.
4. Simpan sebagai `DATABASE_URL` di `.env.local` (lokal) dan di Netlify.
5. Buka aplikasinya — data demo otomatis dibuat saat tabel masih kosong.

Catatan keamanan: semua tabel memakai **RLS tanpa policy** sehingga `anon key`
tidak bisa membaca/menulis. Aplikasi memakai connection string server-side
(bukan anon key), jadi jangan pernah menaruh `DATABASE_URL` di kode client.

## Deploy ke Netlify

`netlify.toml` sudah disiapkan (build `npm run build`, publish `.next`, plugin
`@netlify/plugin-nextjs`, `NODE_VERSION=22`). Yang perlu dilakukan:

1. Hubungkan repo ke Netlify.
2. **Site configuration → Environment variables** → tambah `DATABASE_URL`
   (connection string pooler dari langkah setup di atas).
3. Deploy. Build tidak butuh akses database — halaman baru menyentuh DB saat
   request pertama.

Checklist kalau masih error:

1. Buka `https://<situs>.netlify.app/api/health` — JSON-nya menyebut penyebabnya.
2. `DATABASE_URL belum dikonfigurasi` → env belum di-set / belum redeploy.
3. `password authentication failed` → password pada connection string salah.
4. `Tidak bisa menghubungi database` → pakai host **pooler** (port `6543`);
   project Supabase baru juga bisa ter-pause, buka dashboard untuk mengaktifkan.
5. Halaman error kini menjelaskan masalahnya + tombol "Coba lagi", bukan layar
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
- Semua akses data di server (`lib/db.ts`, `lib/queries.ts`, server actions); client hanya untuk UI.
- Zona waktu transaksi: `Asia/Jakarta`.
- Koneksi database ada di `lib/sql.ts`, helper query di `lib/db.ts`, bootstrap
  skema + seed di `lib/bootstrap.ts`. Pemeriksaan konfigurasi ada di
  `lib/runtime-check.ts` dan ditampilkan lewat `components/RuntimeErrorNotice.tsx`
  + `app/global-error.tsx`.
- Penulisan transaksi (checkout, void, hapus, adjust stok) dijalankan sebagai
  fungsi Postgres (`create_sale`, `void_sale`, `delete_sale`, `adjust_stock`) agar
  atomik dan aman dari race condition antar kasir.
- `/api/health` selalu dieksekusi saat request (bukan di-prerender), jadi angkanya
  mencerminkan runtime.
