import BottomNav from "@/components/BottomNav";
import RuntimeErrorNotice from "@/components/RuntimeErrorNotice";
import { requireUser } from "@/lib/auth";
import { databaseProblem, detectRuntimeProblem } from "@/lib/runtime-check";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const problem = await databaseProblem();
  if (problem) return <RuntimeErrorNotice problem={problem} />;

  try {
    await requireUser();
  } catch (error) {
    // `requireUser` memakai redirect() untuk sesi kosong — itu bukan error.
    const isRedirect =
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");

    if (isRedirect) throw error;

    const runtimeProblem = detectRuntimeProblem(error);
    if (runtimeProblem) return <RuntimeErrorNotice problem={runtimeProblem} />;
    throw error;
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-[#f4f5f7] md:border-x md:border-zinc-200">
      {children}
      <BottomNav />
    </div>
  );
}
