import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const instant = false;

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? "/app" : "/login");
}
