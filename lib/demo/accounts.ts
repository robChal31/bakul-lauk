/**
 * Kredensial akun demo. Hash ditulis sebagai konstanta (deterministik dari
 * lib/password.ts → demoPasswordHash) supaya seeding di serverless tidak perlu
 * menjalankan scrypt di jalur request pertama.
 *
 *   admin / admin123   (pemilik)
 *   kasir / kasir123   (kasir)
 */
export const DEMO_USERS = [
  {
    name: "Pemilik Warung",
    username: "admin",
    role: "owner",
    password_hash:
      "scrypt$c642d9b27bfb273d97dbeb0938f1ed7c$c8c8448181c68b60728ef046ef346c2076a9d62035fc12aa0952ed76f6f26808",
  },
  {
    name: "Kasir Shift Pagi",
    username: "kasir",
    role: "kasir",
    password_hash:
      "scrypt$41bcab6298b9ebf6957d5e78e3f525d2$1c7d27a3cbd8a3b6fdcfb7ddf50856088bcb1d20d80984ba9e71bf7c9ff0183d",
  },
] as const;
