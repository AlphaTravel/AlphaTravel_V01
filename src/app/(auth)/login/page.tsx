import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><div className="login-loading">Caricamento accesso…</div></main>}><LoginForm /></Suspense>;
}
