"use client";

import { AlertTriangle, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPilgrimAction } from "@/app/actions";

const sections = ["Anagrafica", "Contatti", "Esigenze", "Viaggio", "Consensi"];

export function PilgrimForm({ tripOptions = [] }: { tripOptions?: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await createPilgrimAction(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(result.id ? `/pellegrini/${result.id}` : "/pellegrini");
    router.refresh();
  }

  return (
    <form className="editor-layout" method="post" onSubmit={handleSubmit}>
      <aside className="editor-steps">
        <Link href="/pellegrini"><ChevronLeft size={15} /> Torna all’elenco</Link>
        <p className="nav-label">Nuovo pellegrino</p>
        {sections.map((section, index) => (
          <span className={index === 0 ? "editor-step-active" : ""} key={section}>
            <b>{index + 1}</b>{section}
          </span>
        ))}
        <div className="security-note"><ShieldCheck size={18} /><p><strong>Dati protetti</strong>I dati sanitari sono separati e accessibili solo ai ruoli autorizzati.</p></div>
      </aside>

      <div className="editor-main">
        <div className="editor-heading">
          <div><p className="eyebrow">Anagrafica</p><h1>Registra un pellegrino</h1><p>I campi contrassegnati con * sono obbligatori.</p></div>
          <div className="editor-actions"><Link className="button button-secondary" href="/pellegrini">Annulla</Link><button className="button button-primary" disabled={loading} type="submit">{loading ? "Salvataggio…" : "Salva pellegrino"}</button></div>
        </div>

        {error ? <div className="form-error form-error-block">{error}</div> : null}

        <section className="form-card">
          <div className="form-card-title"><span>01</span><div><h2>Dati personali</h2><p>Informazioni riportate sui documenti del viaggiatore.</p></div></div>
          <div className="form-grid">
            <label><span>Nome *</span><input name="firstName" required autoComplete="given-name" placeholder="Nome" /></label>
            <label><span>Cognome *</span><input name="lastName" required autoComplete="family-name" placeholder="Cognome" /></label>
            <label><span>Data di nascita *</span><input name="birthDate" required type="date" /></label>
            <label><span>Codice fiscale</span><input name="fiscalCode" autoComplete="off" placeholder="RSSMRA…" /></label>
            <label><span>Luogo di nascita</span><input name="birthPlace" placeholder="Comune" /></label>
            <label><span>Nazionalità</span><select name="nationality" defaultValue="Italia"><option>Italia</option><option>Francia</option><option>Spagna</option><option>Altro</option></select></label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-card-title"><span>02</span><div><h2>Contatti</h2><p>Recapiti personali e contatto da chiamare in emergenza.</p></div></div>
          <div className="form-grid">
            <label><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="nome@example.it" /></label>
            <label><span>Telefono *</span><input name="phone" required type="tel" autoComplete="tel" placeholder="+39…" /></label>
            <label><span>Indirizzo</span><input name="address" autoComplete="street-address" placeholder="Via e numero civico" /></label>
            <label><span>Città</span><input name="city" autoComplete="address-level2" placeholder="Comune" /></label>
            <label><span>Contatto di emergenza *</span><input name="emergencyName" required placeholder="Nome e cognome" /></label>
            <label><span>Telefono emergenza *</span><input name="emergencyPhone" required type="tel" placeholder="+39…" /></label>
          </div>
        </section>

        <section className="form-card sensitive-card">
          <div className="form-card-title"><span>03</span><div><h2>Esigenze e assistenza</h2><p>Raccogli esclusivamente le informazioni necessarie al viaggio.</p></div></div>
          <div className="inline-warning"><AlertTriangle size={16} /><span>Queste informazioni appartengono a una categoria particolare di dati personali.</span></div>
          <div className="form-grid">
            <label><span>Mobilità</span><select name="mobility"><option value="independent">Autonomo</option><option value="light_support">Supporto leggero</option><option value="assistance">Assistenza</option></select></label>
            <label><span>Cammino massimo indicativo</span><div className="input-suffix"><input name="walkingKm" type="number" min="0" max="50" defaultValue="5" /><span>km</span></div></label>
            <label><span>Preferenze alimentari</span><textarea name="dietary" rows={3} placeholder="Vegetariano, senza glutine…" /></label>
            <label><span>Allergie e intolleranze</span><textarea name="allergies" rows={3} placeholder="Indicare allergene e gravità" /></label>
            <label className="form-span-2"><span>Note operative riservate</span><textarea name="healthNotes" rows={3} placeholder="Informazioni strettamente necessarie per l’assistenza" /></label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-card-title"><span>04</span><div><h2>Prima iscrizione</h2><p>Puoi lasciare vuota questa sezione e iscrivere la persona in seguito.</p></div></div>
          <div className="form-grid">
            <label><span>Viaggio</span><select name="tripId" defaultValue=""><option value="">Nessun viaggio</option>{tripOptions.map((trip) => <option value={trip.id} key={trip.id}>{trip.title}</option>)}</select></label>
            <label><span>Gruppo</span><input name="groupName" placeholder="Parrocchia o gruppo" /></label>
            <label><span>Preferenza camera</span><select name="roomPreference" defaultValue=""><option value="">Nessuna preferenza</option><option value="single">Singola</option><option value="double">Doppia</option><option value="triple">Tripla</option><option value="accessible">Accessibile</option></select></label>
            <label><span>Compagno/a di camera</span><input name="roommate" placeholder="Nome del compagno desiderato" /></label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-card-title"><span>05</span><div><h2>Consensi e verifica</h2><p>I testi definitivi saranno configurati con il consulente privacy.</p></div></div>
          <div className="checkbox-stack">
            <label><input required name="privacyDelivered" type="checkbox" /><span><strong>Informativa privacy consegnata *</strong><small>Registra data, versione del testo e operatore.</small></span></label>
            <label><input name="healthConsent" type="checkbox" /><span><strong>Consenso dati relativi alla salute</strong><small>Da utilizzare solo dopo la verifica della corretta base giuridica.</small></span></label>
            <label><input name="operationalMessagesAllowed" type="checkbox" /><span><strong>Autorizzazione comunicazioni operative</strong><small>Email e messaggi relativi esclusivamente al viaggio.</small></span></label>
            <input name="privacyNoticeVersion" type="hidden" value="v1" />
          </div>
        </section>

        <div className="editor-bottom"><span>I dati verranno salvati nel workspace protetto.</span><button className="button button-primary" disabled={loading} type="submit">{loading ? "Salvataggio…" : "Salva pellegrino"}</button></div>
      </div>
    </form>
  );
}
