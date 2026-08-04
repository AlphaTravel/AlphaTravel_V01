import { redirect } from "next/navigation";
import { defaultLandingPath } from "@/lib/landing-path";
import { getCurrentMember } from "@/lib/live-data";

export default async function Home() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  redirect(defaultLandingPath(member.roleKey));
}
