import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { defaultLandingPath } from "@/lib/landing-path";
import { getCurrentMember } from "@/lib/live-data";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage() {
  // Resolve the membership on the server instead of redirecting solely because
  // an auth cookie exists. This avoids redirect loops for disabled/orphaned
  // accounts and keeps the landing page role-aware.
  const member = await getCurrentMember();
  if (member) redirect(defaultLandingPath(member.roleKey));

  return <Suspense fallback={<main className="login-page"><div className="login-loading">Caricamento accesso…</div></main>}><LoginForm /></Suspense>;
}
