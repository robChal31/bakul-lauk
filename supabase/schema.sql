-- ============================================================================
-- Kasirku — skema PostgreSQL / Supabase
-- ----------------------------------------------------------------------------
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → New query → tempel →
-- Run. Skrip ini idempoten, aman dijalankan ulang.
--
-- Catatan desain:
--  * Semua timestamp tetap INTEGER epoch-milliseconds (sama seperti versi
--    SQLite) supaya perhitungan "hari Jakarta" di aplikasi tidak berubah.
--  * Uang disimpan sebagai BIGINT rupiah (tanpa desimal).
--  * Penulisan stok & transaksi dibungkus fungsi RPC agar atomik: aplikasi
--    tidak perlu transaksi multi-baris lewat jaringan.
--  * RLS diaktifkan tanpa policy → anon/public key tidak bisa baca/tulis sama
--    sekali. Aplikasi hanya memakai connection string Postgres (service role),
--    jadi RLS tidak berpengaruh ke aplikasi, tapi menutup akses publik.
-- ============================================================================

create table if not exists users (
  id            bigserial primary key,
  name          text    not null,
  username      text    not null unique,
  password_hash text    not null,
  role          text    not null default 'kasir',
  created_at    bigint  not null
);

create table if not exists categories (
  id   bigserial primary key,
  name text      not null unique
);

create table if not exists products (
  id          bigserial primary key,
  name        text      not null,
  sku         text,
  category_id bigint    references categories(id) on delete set null,
  price       bigint    not null default 0,
  cost        bigint    not null default 0,
  stock       integer   not null default 0,
  is_active   smallint  not null default 1,
  created_at  bigint    not null
);

create table if not exists sales (
  id             bigserial primary key,
  code           text    not null unique,
  user_id        bigint  references users(id) on delete set null,
  cashier_name   text    not null,
  customer_name  text,
  subtotal       bigint  not null default 0,
  discount       bigint  not null default 0,
  total          bigint  not null default 0,
  payment_method text    not null default 'cash',
  amount_paid    bigint  not null default 0,
  change_due     bigint  not null default 0,
  note           text,
  voided         smallint not null default 0,
  created_at     bigint  not null
);

create table if not exists sale_items (
  id           bigserial primary key,
  sale_id      bigint   not null references sales(id) on delete cascade,
  product_id   bigint   references products(id) on delete set null,
  product_name text     not null,
  price        bigint   not null,
  cost         bigint   not null default 0,
  qty          integer  not null,
  line_total   bigint   not null
);

create table if not exists expenses (
  id             bigserial primary key,
  title          text    not null,
  amount         bigint  not null,
  category       text    not null default 'operasional',
  note           text,
  user_name      text,
  payment_source text    not null default 'kas',
  spent_at       bigint  not null,
  created_at     bigint  not null
);

create table if not exists settings (
  key   text primary key,
  value text not null
);

create index if not exists idx_sales_created_at   on sales(created_at);
create index if not exists idx_sale_items_sale    on sale_items(sale_id);
create index if not exists idx_products_active    on products(is_active);
create index if not exists idx_expenses_spent_at  on expenses(spent_at);

-- ----------------------------------------------------------------------------
-- RLS: tutup akses publik (anon key / PostgREST). Aplikasi memakai connection
-- string langsung, bukan anon key, sehingga tetap berfungsi normal.
-- ----------------------------------------------------------------------------
alter table users         enable row level security;
alter table categories    enable row level security;
alter table products      enable row level security;
alter table sales         enable row level security;
alter table sale_items    enable row level security;
alter table expenses      enable row level security;
alter table settings      enable row level security;

-- ----------------------------------------------------------------------------
-- create_sale: validasi stok → simpan penjualan → simpan item → kurangi stok.
-- Dipanggil aplikasi lewat RPC. Mengembalikan id + kode transaksi.
-- ----------------------------------------------------------------------------
create or replace function create_sale(
  p_user_id        bigint,
  p_cashier_name   text,
  p_customer_name  text,
  p_discount       bigint,
  p_payment_method text,
  p_amount_paid    bigint,
  p_note           text,
  p_items          jsonb
) returns table (sale_id bigint, code text)
language plpgsql
as $$
declare
  v_item      jsonb;
  v_product   products%rowtype;
  v_qty       integer;
  v_subtotal  bigint := 0;
  v_discount  bigint;
  v_total     bigint;
  v_paid      bigint;
  v_sale_id   bigint;
  v_code      text;
  v_seq       integer;
  v_day       text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang masih kosong.';
  end if;

  -- Kunci baris produk supaya stok tidak balapan antar kasir.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    select * into v_product from products
      where id = (v_item ->> 'productId')::bigint
      for update;
    if not found or v_product.is_active <> 1 then
      raise exception 'Ada produk yang sudah tidak tersedia.';
    end if;
    if v_product.stock < v_qty then
      if v_product.stock <= 0 then
        raise exception 'Stok % habis.', v_product.name;
      else
        raise exception 'Stok % tersisa %.', v_product.name, v_product.stock;
      end if;
    end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_discount := least(greatest(coalesce(p_discount, 0), 0), v_subtotal);
  v_total    := v_subtotal - v_discount;
  v_paid     := case when p_payment_method = 'cash'
                     then greatest(v_total, coalesce(p_amount_paid, 0))
                     else v_total end;

  v_seq := (select count(*) + 1 from sales);
  v_day := to_char(to_timestamp((extract(epoch from clock_timestamp()) * 1000)::bigint / 1000.0) at time zone 'Asia/Jakarta', 'YYMMDD');
  v_code := 'TRX-' || v_day || '-' || lpad(v_seq::text, 4, '0');

  insert into sales (code, user_id, cashier_name, customer_name, subtotal, discount,
                     total, payment_method, amount_paid, change_due, note, voided, created_at)
  values (v_code, p_user_id, p_cashier_name, nullif(btrim(coalesce(p_customer_name, '')), ''),
          v_subtotal, v_discount, v_total, p_payment_method, v_paid, v_paid - v_total,
          nullif(btrim(coalesce(p_note, '')), ''), 0,
          (extract(epoch from clock_timestamp()) * 1000)::bigint)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    select * into v_product from products where id = (v_item ->> 'productId')::bigint;

    insert into sale_items (sale_id, product_id, product_name, price, cost, qty, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_product.price, v_product.cost,
            v_qty, v_product.price * v_qty);

    update products set stock = stock - v_qty where id = v_product.id;
  end loop;

  return query select v_sale_id, v_code;
end;
$$;

-- ----------------------------------------------------------------------------
-- void_sale: kembalikan stok lalu tandai transaksi batal (idempoten).
-- ----------------------------------------------------------------------------
create or replace function void_sale(p_sale_id bigint)
returns void
language plpgsql
as $$
declare
  v_voided smallint;
begin
  select voided into v_voided from sales where id = p_sale_id for update;
  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;
  if v_voided = 1 then
    raise exception 'Transaksi ini sudah dibatalkan.';
  end if;

  update products p set stock = p.stock + i.qty
    from sale_items i
   where i.sale_id = p_sale_id and i.product_id = p.id;

  update sales set voided = 1 where id = p_sale_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- delete_sale: hitung ulang stok (kalau belum void) lalu hapus transaksi+item.
-- ----------------------------------------------------------------------------
create or replace function delete_sale(p_sale_id bigint)
returns void
language plpgsql
as $$
declare
  v_voided smallint;
begin
  select voided into v_voided from sales where id = p_sale_id for update;
  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  if v_voided = 0 then
    update products p set stock = p.stock + i.qty
      from sale_items i
     where i.sale_id = p_sale_id and i.product_id = p.id;
  end if;

  delete from sale_items where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- adjust_stock: ubah stok dengan lantai 0, atomik.
-- ----------------------------------------------------------------------------
create or replace function adjust_stock(p_product_id bigint, p_delta integer)
returns void
language sql
as $$
  update products set stock = greatest(0, stock + p_delta) where id = p_product_id;
$$;

-- ----------------------------------------------------------------------------
-- Hanya server aplikasi (connection string, bukan anon key) yang boleh
-- memanggil fungsi RPC. Role `anon`/`authenticated` hanya ada di Supabase,
-- jadi blok ini dibuat kondisional supaya skrip juga jalan di Postgres biasa
-- (mis. database uji lokal).
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function create_sale(bigint, text, text, bigint, text, bigint, text, jsonb) from public, anon, authenticated';
    execute 'revoke all on function void_sale(bigint) from public, anon, authenticated';
    execute 'revoke all on function delete_sale(bigint) from public, anon, authenticated';
    execute 'revoke all on function adjust_stock(bigint, integer) from public, anon, authenticated';
  else
    execute 'revoke all on function create_sale(bigint, text, text, bigint, text, bigint, text, jsonb) from public';
    execute 'revoke all on function void_sale(bigint) from public';
    execute 'revoke all on function delete_sale(bigint) from public';
    execute 'revoke all on function adjust_stock(bigint, integer) from public';
  end if;
end $$;
