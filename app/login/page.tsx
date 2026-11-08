import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import RuntimeErrorNotice from "@/components/RuntimeErrorNotice";
import { getSessionUser } from "@/lib/auth";
import { databaseProblem, detectRuntimeProblem } from "@/lib/runtime-check";

export const instant = false;

export default async function LoginPage() {
  // Kalau lingkungan belum siap (Node terlalu lama / DB read-only), tampilkan
  // instruksi perbaikan alih-alih halaman error bawaan.
  const problem = await databaseProblem();
  if (problem) return <RuntimeErrorNotice problem={problem} />;

  try {
    const user = await getSessionUser();
    if (user) redirect("/app");
  } catch (error) {
    const runtimeProblem = detectRuntimeProblem(error);
    if (runtimeProblem) return <RuntimeErrorNotice problem={runtimeProblem} />;
    throw error;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <LoginForm />
      <p className="mt-8 text-center text-[11.5px] text-zinc-400">
        Data disimpan di Postgres (Supabase). Butuh env DATABASE_URL.
      </p>
    </main>
  );
}
