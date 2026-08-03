import { Bell, Building2, KeyRound, LockKeyhole, ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Impostazioni" description="Organizzazione, utenti, permessi e protezioni dell’account." />
      <div className="settings-grid">
        <aside className="settings-nav"><button className="active"><Building2 size={17} /> Organizzazione</button><button><Users size={17} /> Utenti e ruoli</button><button><ShieldCheck size={17} /> Privacy e sicurezza</button><button><Bell size={17} /> Notifiche</button></aside>
        <div className="settings-main">
          <section className="form-card"><div className="form-card-title"><span><Building2 size={18} /></span><div><h2>Dati agenzia</h2><p>Informazioni utilizzate nei documenti operativi.</p></div></div><div className="form-grid"><label><span>Nome organizzazione</span><input defaultValue="AlphaTravel Demo" /></label><label><span>Email operativa</span><input type="email" defaultValue="operazioni@example.it" /></label><label><span>Fuso orario</span><select defaultValue="Europe/Rome"><option>Europe/Rome</option></select></label><label><span>Valuta</span><select defaultValue="EUR"><option>EUR — Euro</option></select></label></div><div className="settings-actions"><button className="button button-primary">Salva modifiche</button></div></section>
          <section className="form-card"><div className="form-card-title"><span><UserCog size={18} /></span><div><h2>Ruoli e accessi</h2><p>Applica il principio del minimo privilegio.</p></div></div><div className="role-list"><span><strong>Amministratore</strong><small>Configurazione, utenti e accesso completo</small><b>1 utente</b></span><span><strong>Responsabile</strong><small>Gestione viaggi, persone e dati riservati</small><b>2 utenti</b></span><span><strong>Operatore</strong><small>Operatività quotidiana e iscrizioni</small><b>4 utenti</b></span><span><strong>Contabilità</strong><small>Pagamenti senza accesso ai dati sanitari</small><b>1 utente</b></span><span><strong>Lettore</strong><small>Consultazione dei soli dati operativi</small><b>0 utenti</b></span></div></section>
          <section className="form-card" id="supporto"><div className="form-card-title"><span><LockKeyhole size={18} /></span><div><h2>Sicurezza</h2><p>Controlli progettati nel database e nell’applicazione.</p></div></div><div className="security-grid"><span><ShieldCheck size={18} /><p><strong>RLS attivo</strong><small>Ogni query è vincolata all’organizzazione e al ruolo.</small></p></span><span><KeyRound size={18} /><p><strong>MFA amministratori</strong><small>Obbligatorio per utenti, ruoli, analitiche e audit.</small></p></span><span><LockKeyhole size={18} /><p><strong>Documenti privati</strong><small>URL firmati a scadenza, mai bucket pubblici.</small></p></span><span><Bell size={18} /><p><strong>Audit</strong><small>Le modifiche sensibili vengono registrate.</small></p></span></div></section>
        </div>
      </div>
    </>
  );
}
