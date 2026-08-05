"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function SetPasswordForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (!isStrongPassword(password)) {
      setError("Usa almeno 8 caratteri con una lettera e un numero.");
      return;
    }
    if (password !== confirmation) {
      setError("Le due password non coincidono.");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setBusy(false);
      setError("Invito non valido o scaduto. Chiedi un nuovo invito.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError("Password non accettata oppure invito scaduto.");
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div><p className="eyebrow">Attivazione account</p><h2>Scegli la password</h2><p>La password resta privata e non è visibile agli amministratori.</p></div>
      {error ? <div className="form-error">{error}</div> : null}
      <label><span>Nuova password</span><div className="password-field"><input required name="password" minLength={8} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" type={show ? "text" : "password"} autoComplete="new-password" /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Nascondi password" : "Mostra password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
      <label><span>Ripeti password</span><input required name="confirmation" minLength={8} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" type={show ? "text" : "password"} autoComplete="new-password" /></label>
      <div className="password-rules"><ShieldCheck size={16} /><span>Minimo 8 caratteri, con almeno una lettera e un numero.</span></div>
      <button className="button button-primary login-submit" disabled={busy} type="submit"><LockKeyhole size={17} />{busy ? "Salvataggio…" : "Attiva account"}<ArrowRight size={17} /></button>
    </form>
  );
}
