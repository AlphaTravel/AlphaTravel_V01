import { AppShell } from "@/components/app-shell";
import { getCurrentMember } from "@/lib/live-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentMember();
  return <AppShell user={user}>{children}</AppShell>;
}
