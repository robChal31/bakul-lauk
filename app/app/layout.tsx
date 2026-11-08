import BottomNav from "@/components/BottomNav";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-[#f4f5f7] md:border-x md:border-zinc-200">
      {children}
      <BottomNav />
    </div>
  );
}
