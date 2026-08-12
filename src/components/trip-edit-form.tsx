"use client";

import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updateTripAction } from "@/app/actions";
import type { TripEditData } from "@/lib/edit-data";

export function TripEditForm({ data }: { data: TripEditData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await updateTripAction(new FormData(event.currentTarget));
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    router.push(`/viaggi/${data.id}`); router.refresh();
  }
  return <form className="editor-layout" method="post" onSubmit={submit}><aside className="editor-steps"><Link href={`/viaggi/${data.id}`}><ChevronLeft size={15} /> Torna al viaggio</Link><p className="nav-label">Modifica viaggio</p></aside><div className="editor-main"><div className="editor-heading"><div><p className="eyebrow">Configurazione</p><h1>Modifica viaggio</h1><p>Aggiorna informazioni, date, capienza e quote.</p></div></div>{error ? <div className="form-error form-error-block">{error}</div> : null}<input type="hidden" name="tripId" value={data.id} />
    <section className="form-card"><div className="form-card-title"><span>01</span><div><h2>Informazioni e stato</h2><p>Lo stato del viaggio è distinto dalla preparazione automatica dei singoli partecipanti.</p></div></div><div className="form-grid"><label className="form-span-2"><span>Titolo *</span><input name="title" defaultValue={data.title} required /></label><label><span>Codice *</span><input name="code" defaultValue={data.code} pattern="[A-Za-z0-9-]{3,20}" required /></label><label><span>Stato *</span><select name="status" defaultValue={data.status} required><option value="draft">Bozza</option><option value="open">Aperto alle iscrizioni</option><option value="confirmed">Confermato</option><option value="full">Completo</option><option value="completed">Concluso</option><option value="cancelled">Annullato</option></select></label><label><span>Destinazione *</span><input name="destination" defaultValue={data.destination} required /></label><label className="form-span-2"><span>Descrizione</span><textarea name="description" defaultValue={data.description} rows={4} /></label></div></section>
    <section className="form-card"><div className="form-card-title"><span>02</span><div><h2>Date e capienza</h2></div></div><div className="form-grid"><label><span>Partenza *</span><input name="startDate" type="date" defaultValue={data.startDate} required /></label><label><span>Rientro *</span><input name="endDate" type="date" defaultValue={data.endDate} required /></label><label><span>Numero minimo *</span><input name="minimum" type="number" min="1" defaultValue={data.minimum} required /></label><label><span>Capienza *</span><input name="capacity" type="number" min="1" defaultValue={data.capacity} required /></label><label><span>Chiusura iscrizioni</span><input name="registrationDeadline" type="date" defaultValue={data.registrationDeadline} /></label><label><span>Camminate pianificate (km)</span><input name="walkingKm" type="number" min="0" step="0.01" defaultValue={data.walkingKm} required /></label></div></section>
    <section className="form-card"><div className="form-card-title"><span>03</span><div><h2>Quote</h2></div></div><div className="form-grid"><label><span>Quota base *</span><input name="price" type="number" min="0" step="0.01" defaultValue={data.price} required /></label><label><span>Acconto</span><input name="deposit" type="number" min="0" step="0.01" defaultValue={data.deposit} /></label><label><span>Supplemento singola</span><input name="singleSupplement" type="number" min="0" step="0.01" defaultValue={data.singleSupplement} /></label><label><span>Scadenza saldo</span><input name="balanceDeadline" type="date" defaultValue={data.balanceDeadline} /></label></div></section>
    <div className="editor-bottom"><span>Le modifiche vengono registrate.</span><button className="button button-primary" disabled={busy} type="submit"><Save size={15} /> {busy ? "Salvataggio…" : "Salva modifiche"}</button></div></div></form>;
}
