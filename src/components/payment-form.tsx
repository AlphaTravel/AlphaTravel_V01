"use client";

import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { recordPaymentAction } from "@/app/payment-actions";
import type { PaymentPosition } from "@/lib/payment-data";
import { formatCurrency } from "@/lib/utils";

export function PaymentForm({ positions }: { positions: PaymentPosition[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await recordPaymentAction(new FormData(event.currentTarget));
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/pagamenti");
    router.refresh();
  }

  return (
    <form className="editor-layout" onSubmit={submit}>
      <aside className="editor-steps"><Link href="/pagamenti"><ChevronLeft size={15} /> Torna ai pagamenti</Link><p className="nav-label">Nuovo movimento</p></aside>
      <div className="editor-main">
        <div className="editor-heading"><div><p className="eyebrow">Contabilità</p><h1>Registra un pagamento</h1><p>Il registro non memorizza numeri di carta o credenziali bancarie.</p></div></div>
        {error ? <div className="form-error form-error-block">{error}</div> : null}
        <section className="form-card">
          <div className="form-card-title"><span><Check size={18} /></span><div><h2>Movimento</h2><p>Associa l’importo a un’iscrizione esistente.</p></div></div>
          <div className="form-grid">
            <label className="form-span-2"><span>Iscrizione *</span><select name="registrationId" required defaultValue=""><option value="" disabled>Seleziona partecipante e viaggio</option>{positions.map((position) => <option value={position.registrationId} key={position.registrationId}>{position.pilgrimName} · {position.tripName} · residuo {formatCurrency(position.remaining)}</option>)}</select></label>
            <label><span>Importo *</span><div className="input-prefix"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label>
            <label><span>Stato *</span><select name="status" defaultValue="paid"><option value="paid">Pagato</option><option value="pending">Da incassare</option><option value="overdue">Scaduto</option><option value="refunded">Rimborsato</option></select></label>
            <label><span>Metodo *</span><select name="method" defaultValue="bank_transfer"><option value="bank_transfer">Bonifico</option><option value="cash">Contanti</option><option value="card_provider">Provider carte esterno</option><option value="cheque">Assegno</option><option value="other">Altro</option></select></label>
            <label><span>Scadenza</span><input name="dueOn" type="date" /></label>
            <label><span>Riferimento esterno</span><input name="externalReference" maxLength={120} /></label>
            <label className="form-span-2"><span>Note</span><textarea name="notes" rows={3} maxLength={1000} /></label>
          </div>
        </section>
        <div className="editor-bottom"><span>Le operazioni vengono registrate nell’audit.</span><button className="button button-primary" disabled={busy || positions.length === 0} type="submit">{busy ? "Registrazione…" : "Registra pagamento"}</button></div>
      </div>
    </form>
  );
}
