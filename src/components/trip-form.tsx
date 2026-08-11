"use client";

import { ChevronLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createTripAction } from "@/app/actions";

export function TripForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await createTripAction(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(result.id ? `/viaggi/${result.id}` : "/viaggi");
    router.refresh();
  }

  return (
    <form className="editor-layout" method="post" onSubmit={handleSubmit}>
      <aside className="editor-steps">
        <Link href="/viaggi"><ChevronLeft size={15} /> Torna ai viaggi</Link>
        <p className="nav-label">Nuova partenza</p>
        {["Informazioni", "Date e capienza", "Quote", "Servizi", "Pubblicazione"].map((section, index) => (
          <span className={index === 0 ? "editor-step-active" : ""} key={section}><b>{index + 1}</b>{section}</span>
        ))}
      </aside>
      <div className="editor-main">
        <div className="editor-heading">
          <div><p className="eyebrow">Nuovo viaggio</p><h1>Crea una partenza</h1><p>Definisci la base organizzativa; camere e mezzi verranno configurati dopo.</p></div>
          <div className="editor-actions"><Link className="button button-secondary" href="/viaggi">Annulla</Link><button className="button button-primary" disabled={loading} type="submit">{loading ? "Salvataggio…" : "Salva bozza"}</button></div>
        </div>
        {error ? <div className="form-error form-error-block">{error}</div> : null}
        <section className="form-card">
          <div className="form-card-title"><span>01</span><div><h2>Identità del viaggio</h2><p>Nome visibile agli operatori e destinazione principale.</p></div></div>
          <div className="form-grid">
            <label className="form-span-2"><span>Titolo *</span><input required name="title" placeholder="Es. Lourdes · Settembre 2027" /></label>
            <label><span>Codice interno *</span><input required name="code" placeholder="LRD-2709" pattern="[A-Za-z0-9-]{3,16}" /></label>
            <label><span>Destinazione *</span><input required name="destination" placeholder="Città, Paese" /></label>
            <label className="form-span-2"><span>Descrizione</span><textarea name="description" rows={4} placeholder="Sintesi del programma e caratteristiche del viaggio" /></label>
          </div>
        </section>
        <section className="form-card">
          <div className="form-card-title"><span>02</span><div><h2>Date e disponibilità</h2><p>Il sistema controllerà sovrapposizioni e scadenze.</p></div></div>
          <div className="form-grid">
            <label><span>Partenza *</span><input required type="date" name="startDate" /></label>
            <label><span>Rientro *</span><input required type="date" name="endDate" /></label>
            <label><span>Numero minimo</span><input type="number" name="minimum" min="1" defaultValue="30" /></label>
            <label><span>Capienza massima *</span><input required type="number" name="capacity" min="1" defaultValue="50" /></label>
            <label><span>Chiusura iscrizioni</span><input type="date" name="registrationDeadline" /></label>
          </div>
        </section>
        <section className="form-card">
          <div className="form-card-title"><span>03</span><div><h2>Quote e scadenze</h2><p>Gli importi potranno essere personalizzati sulla singola iscrizione.</p></div></div>
          <div className="form-grid">
            <label><span>Quota base *</span><div className="input-prefix"><span>€</span><input required type="number" name="price" min="0" step="0.01" /></div></label>
            <label><span>Acconto richiesto</span><div className="input-prefix"><span>€</span><input type="number" name="deposit" min="0" step="0.01" /></div></label>
            <label><span>Supplemento singola</span><div className="input-prefix"><span>€</span><input type="number" name="singleSupplement" min="0" step="0.01" /></div></label>
            <label><span>Scadenza saldo</span><input type="date" name="balanceDeadline" /></label>
          </div>
          <div className="inline-info"><Info size={16} /> Non vengono gestiti dati di carte: i pagamenti online useranno un fornitore certificato esterno.</div>
        </section>
        <section className="form-card"><div className="form-card-title"><span>04</span><div><h2>Organizzazione del viaggio</h2><p>Dopo la creazione troverai partecipanti, camere, trasporti e programma nella sezione “Organizza viaggio”.</p></div></div></section>
        <div className="editor-bottom"><span>Lo stato iniziale sarà “Bozza”.</span><button className="button button-primary" disabled={loading} type="submit">{loading ? "Creazione…" : "Crea viaggio"}</button></div>
      </div>
    </form>
  );
}
