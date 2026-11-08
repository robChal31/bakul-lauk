import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash password tanpa dependency native.
 * Format: `scrypt$<salt hex>$<hash hex>`.
 */
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hash deterministik untuk akun demo. Salt diturunkan dari username, sehingga
 * hasilnya selalu sama dan bisa disimpan sebagai konstanta (tanpa menjalankan
 * scrypt 100 ms setiap kali seed dijalankan di serverless).
 */
export function demoPasswordHash(username: string, password: string): string {
  const salt = createHash("sha256")
    .update(`kasirku-demo-salt:${username}`)
    .digest()
    .subarray(0, 16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
