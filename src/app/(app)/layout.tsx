import { AppShell } from "@/components/app-shell";
import { getCurrentMember } from "@/lib/live-data";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentMember();
  if (!user) redirect("/accesso-negato");
  return <AppShell user={user}>{children}</AppShell>;
}
