import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const instant = false;

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <LoginForm />
      <p className="mt-8 text-center text-[11.5px] text-zinc-400">
        Data disimpan lokal di SQLite (data/kasirku.db) — tanpa layanan eksternal.
      </p>
    </main>
  );
}
