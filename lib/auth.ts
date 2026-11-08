if (process.env.KASIRKU_CLI !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { ensureSchema } from "./bootstrap";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const COOKIE_NAME = "kasirku_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 hari
const SECRET =
  process.env.SESSION_SECRET ?? "kasirku-demo-secret-jangan-dipakai-produksi";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: string;
};

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function compare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function isHttpsRequest(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto");
  return proto === "https";
}

export async function createSession(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    // `secure` hanya bila request memang HTTPS — kalau tidak, cookie ditolak
    // browser saat diakses lewat http (mis. uji lokal dengan `next start`).
    secure: await isHttpsRequest(),
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Pastikan pembacaan sesi (dan query database) selalu terjadi saat request,
  // bukan saat prerender.
  await connection();
  await ensureSchema();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!compare(sign(payload), signature)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId?: number; exp?: number };
    if (!data.userId || !data.exp || data.exp < Date.now()) return null;

    const user = await db.get<SessionUser>(
      "SELECT id, name, username, role FROM users WHERE id = $1",
      data.userId,
    );
    return user ?? null;
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
