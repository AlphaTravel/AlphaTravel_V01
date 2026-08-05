import { Bell, Building2, KeyRound, LockKeyhole, ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OrganizationSettingsForm } from "@/components/organization-settings-form";
import { getOrganizationSettings } from "@/lib/settings-data";

export default async function SettingsPage() {
  const data = await getOrganizationSettings();
  if (!data) return <><PageHeader eyebrow="Workspace" title="Impostazioni" description="Impossibile caricare le impostazioni correnti." /><div className="form-error form-error-block">Dati dell’organizzazione non disponibili.</div></>;
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Impostazioni" description="Organizzazione, utenti, permessi e protezioni dell’account." />
      <div className="settings-grid">
        <aside className="settings-nav"><a className="active" href="#organizzazione"><Building2 size={17} /> Organizzazione</a><a href="#ruoli"><Users size={17} /> Utenti e ruoli</a><a href="#sicurezza"><ShieldCheck size={17} /> Privacy e sicurezza</a><a href="#supporto"><Bell size={17} /> Supporto</a></aside>
        <div className="settings-main">
          <OrganizationSettingsForm organization={data.organization} canManage={data.canManage} />
          <section className="form-card" id="ruoli"><div className="form-card-title"><span><UserCog size={18} /></span><div><h2>Ruoli e accessi</h2><p>Conteggi reali degli account attivi.</p></div></div>{data.canViewRoleCounts ? <div className="role-list"><span><strong>Amministratore</strong><small>Configurazione, utenti e accesso completo</small><b>{data.roleCounts.admin} utenti</b></span><span><strong>Responsabile</strong><small>Gestione viaggi, persone e dati riservati</small><b>{data.roleCounts.manager} utenti</b></span><span><strong>Operatore</strong><small>Operatività quotidiana e iscrizioni</small><b>{data.roleCounts.operator} utenti</b></span><span><strong>Accompagnatore</strong><small>Consultazione delle informazioni operative autorizzate</small><b>{data.roleCounts.guide} utenti</b></span><span><strong>Contabilità</strong><small>Pagamenti senza accesso ai dati sanitari</small><b>{data.roleCounts.accountant} utenti</b></span><span><strong>Lettore</strong><small>Consultazione dei soli dati operativi</small><b>{data.roleCounts.viewer} utenti</b></span></div> : <div className="inline-info">I conteggi completi sono disponibili agli amministratori dell’ufficio.</div>}</section>
          <section className="form-card" id="sicurezza"><div className="form-card-title"><span><LockKeyhole size={18} /></span><div><h2>Sicurezza</h2><p>Controlli applicati nel database e nell’applicazione.</p></div></div><div className="security-grid"><span><ShieldCheck size={18} /><p><strong>RLS attivo</strong><small>Ogni query è vincolata all’organizzazione e al ruolo.</small></p></span><span><KeyRound size={18} /><p><strong>Accesso con username</strong><small>Password gestite dal proprietario della piattaforma, senza passaggio MFA obbligatorio.</small></p></span><span><LockKeyhole size={18} /><p><strong>Documenti privati</strong><small>URL firmati a scadenza, mai bucket pubblici.</small></p></span><span><Bell size={18} /><p><strong>Audit</strong><small>Le modifiche sensibili vengono registrate.</small></p></span></div></section>
          <section className="form-card" id="supporto"><div className="form-card-title"><span><Bell size={18} /></span><div><h2>Supporto</h2><p>Per recupero accessi o problemi operativi contatta l’amministratore dell’organizzazione.</p></div></div></section>
        </div>
      </div>
    </>
  );
}
