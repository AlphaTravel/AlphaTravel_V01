import { LogOut, ShieldX } from "lucide-react";
import { signOutAction } from "@/app/actions";

export default function AccessDeniedPage() {
  return (
    <main className="access-denied-page">
      <section className="access-denied-card">
        <span><ShieldX size={30} /></span>
        <p className="eyebrow">Accesso bloccato</p>
        <h1>Account non abilitato</h1>
        <p>La sessione è valida, ma l’account non appartiene a un’organizzazione attiva. Contatta un amministratore.</p>
        <form action={signOutAction}><button className="button button-primary" type="submit"><LogOut size={16} />Esci e torna all’accesso</button></form>
      </section>
    </main>
  );
}
