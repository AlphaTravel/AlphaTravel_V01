"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(createClient());
  const passwordUpdated = searchParams.get("password") === "updated";
  const invalidLink = searchParams.get("error") === "link-invalid";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    if (!supabase) {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      setLoading(false);
      setError("Credenziali non valide oppure account non abilitato.");
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (memberError || !member) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Credenziali non valide oppure account non abilitato.");
      return;
    }

    setLoading(false);
    const next = searchParams.get("next");
    router.replace(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <span><strong>AlphaTravel</strong><small>Group travel OS</small></span>
        </div>
        <div className="login-message">
          <span className="login-kicker"><Sparkles size={15} /> Tutto il viaggio, finalmente coordinato.</span>
          <h1>Persone, camere, mezzi e pagamenti. Una sola regia.</h1>
          <p>Il gestionale costruito per pellegrinaggi e viaggi di gruppo complessi.</p>
        </div>
        <div className="login-security"><ShieldCheck size={20} /><span><strong>Progettato per dati sensibili</strong><small>Permessi granulari, audit e protezioni a livello database.</small></span></div>
      </section>
      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div><p className="eyebrow">Area riservata</p><h2>Bentornato</h2><p>Accedi al workspace della tua agenzia.</p></div>
          {passwordUpdated ? <div className="success-banner">Password impostata. Ora puoi accedere.</div> : null}
          {invalidLink ? <div className="form-error">Link non valido o scaduto. Richiedi un nuovo invito.</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <label><span>Email</span><input required name="email" type="email" autoComplete="email" placeholder="nome@agenzia.it" /></label>
          <label><span>Password</span><div className="password-field"><input required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Nascondi password" : "Mostra password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <div className="login-options"><span>Account disponibili solo su invito</span><span>Per il recupero contatta l’amministratore</span></div>
          <button className="button button-primary login-submit" disabled={loading} type="submit"><LockKeyhole size={17} />{loading ? "Accesso…" : configured ? "Accedi" : "Entra nella demo"}<ArrowRight size={17} /></button>
          {!configured ? <div className="demo-notice"><strong>Modalità demo</strong>Supabase non è ancora collegato: puoi entrare senza credenziali e provare l’interfaccia.</div> : null}
          <small className="login-legal">L’accesso è consentito esclusivamente agli utenti autorizzati. Tutte le operazioni sensibili vengono registrate.</small>
        </form>
      </section>
    </main>
  );
}
