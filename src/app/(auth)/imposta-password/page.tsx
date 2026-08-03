import { ShieldCheck } from "lucide-react";
import { SetPasswordForm } from "@/components/set-password-form";

export default function SetPasswordPage() {
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand"><span className="brand-mark">A</span><span><strong>AlphaTravel</strong><small>Group travel OS</small></span></div>
        <div className="login-message"><span className="login-kicker"><ShieldCheck size={15} /> Attivazione protetta</span><h1>Il tuo accesso, sotto il tuo controllo.</h1><p>Imposta una password unica. Nessuno nell’agenzia potrà visualizzarla.</p></div>
        <div className="login-security"><ShieldCheck size={20} /><span><strong>Link monouso</strong><small>L’invito scade automaticamente e non può essere riutilizzato.</small></span></div>
      </section>
      <section className="login-form-panel"><SetPasswordForm /></section>
    </main>
  );
}
