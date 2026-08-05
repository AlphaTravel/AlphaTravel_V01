import { notFound, redirect } from "next/navigation";
import { PlatformAdminShell } from "@/components/platform-admin-shell";
import { getCurrentPlatformAdmin } from "@/lib/admin-data";
import { getCurrentMember } from "@/lib/live-data";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) {
    const isSignedIn = Boolean(await getCurrentMember());
    if (!isSignedIn) redirect("/login?next=%2Fadmin");
    notFound();
  }
  return <PlatformAdminShell admin={admin}>{children}</PlatformAdminShell>;
}
