"use client";

import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function AdminMfaGate({ hasVerifiedFactor }: { hasVerifiedFactor: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function beginEnrollment() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "AlphaTravel amministrazione",
    });
    setBusy(false);
    if (enrollError) {
      setError("Configurazione MFA non riuscita. Riprova.");
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Inserisci il codice di 6 cifre dell’app Authenticator.");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");

    let factorId = enrollment?.factorId;
    if (!factorId) {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp.find((item) => item.status === "verified");
      if (factorsError || !factor) {
        setBusy(false);
        setError("Nessun dispositivo MFA verificato trovato.");
        return;
      }
      factorId = factor.id;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setBusy(false);
      setError("Verifica non avviata. Riprova.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError("Codice non valido o scaduto.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="admin-mfa-card">
      <span className="admin-mfa-icon"><ShieldCheck size={28} /></span>
      <p className="eyebrow">Protezione amministrativa</p>
      <h2>Verifica a due fattori obbligatoria</h2>
      <p>L’area amministrativa resta cifrata e non viene caricata finché non confermi un codice temporaneo.</p>

      {!hasVerifiedFactor && !enrollment ? (
        <button className="button button-primary" type="button" disabled={busy} onClick={beginEnrollment}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
          Configura Authenticator
        </button>
      ) : null}

      {enrollment ? (
        <div className="mfa-enrollment">
          {/* Il QR è un data URL generato da Supabase e non viene inviato a servizi esterni. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="QR code per configurare l’autenticazione a due fattori" />
          <div>
            <strong>1. Scansiona con un’app Authenticator</strong>
            <p>Google Authenticator, Microsoft Authenticator, 1Password o equivalente.</p>
            <small>Codice manuale: <code>{enrollment.secret}</code></small>
          </div>
        </div>
      ) : null}

      {hasVerifiedFactor || enrollment ? (
        <form className="mfa-code-form" onSubmit={verify}>
          <label>
            <span>Codice temporaneo</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              required
            />
          </label>
          <button className="button button-primary" disabled={busy} type="submit">
            {busy ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}
            Verifica e continua
          </button>
        </form>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
    </section>
  );
}
