"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Power,
  Save,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  createOfficeAction,
  createOfficeMemberAction,
  updateOfficeAction,
  updateOfficeMemberAction,
} from "@/app/admin-actions";
import type { PlatformDashboardData, PlatformOffice } from "@/lib/admin-data";
import { roleOptions } from "@/lib/roles";
import { formatCurrency } from "@/lib/utils";

const planLabels = { starter: "Starter", professional: "Professional", enterprise: "Enterprise" } as const;

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: "Europe/Rome" }).format(new Date(`${value}-01T12:00:00Z`));
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" }).format(new Date(`${value}T12:00:00Z`)) : "Non impostata";
}

export function PlatformAdminPanel({ data }: { data: PlatformDashboardData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(data.offices[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOfficeOpen, setCreateOfficeOpen] = useState(false);
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const offices = useMemo(() => data.offices.filter((office) => {
    const matchesText = `${office.name} ${office.slug} ${office.contactEmail}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? office.isActive : !office.isActive);
    return matchesText && matchesStatus;
  }), [data.offices, query, statusFilter]);
  const selected = data.offices.find((office) => office.id === selectedId) ?? offices[0] ?? data.offices[0];
  const chartMaximum = Math.max(1, ...data.monthly.map((point) => Math.max(point.pilgrims, point.trips)));

  async function run(key: string, action: () => Promise<{ ok: boolean; message: string; id?: string }>, onSuccess?: (id?: string) => void) {
    setBusy(key);
    setNotice(null);
    const result = await action();
    setBusy("");
    setNotice(result);
    if (result.ok) {
      onSuccess?.(result.id);
      router.refresh();
    }
  }

  async function createOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run("create-office", () => createOfficeAction(new FormData(form)), (id) => {
      form.reset();
      setCreateOfficeOpen(false);
      if (id) setSelectedId(id);
    });
  }

  async function saveOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("office", () => updateOfficeAction(new FormData(event.currentTarget)));
  }

  async function toggleOffice(office: PlatformOffice) {
    const values = new FormData();
    values.set("organizationId", office.id);
    values.set("name", office.name);
    values.set("slug", office.slug);
    values.set("contactEmail", office.contactEmail);
    values.set("phone", office.phone);
    values.set("timezone", office.timezone);
    values.set("currency", office.currency);
    values.set("plan", office.plan);
    values.set("subscriptionStatus", office.subscriptionStatus);
    values.set("userLimit", String(office.userLimit));
    values.set("renewalDate", office.renewalDate ?? "");
    values.set("notes", office.notes);
    values.set("isActive", String(!office.isActive));
    await run("toggle-office", () => updateOfficeAction(values));
  }

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run("create-member", () => createOfficeMemberAction(new FormData(form)), () => {
      form.reset();
      setCreateMemberOpen(false);
    });
  }

  async function saveMember(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    await run(`member-${userId}`, () => updateOfficeMemberAction(new FormData(event.currentTarget)));
  }

  return (
    <div className="platform-sections">
      {notice ? <div className={notice.ok ? "platform-notice platform-notice-ok" : "platform-notice platform-notice-error"}>{notice.ok ? <CheckCircle2 size={17} /> : <X size={17} />}{notice.message}</div> : null}

      <section id="analytics" className="platform-panel platform-analytics">
        <div className="platform-panel-heading"><div><p>Analitiche</p><h2>Andamento degli ultimi 12 mesi</h2></div><span><Activity size={16} /> Dati aggregati in tempo reale</span></div>
        <div className="platform-analytics-grid">
          <div className="platform-chart" aria-label="Nuovi pellegrini e viaggi per mese">
            <div className="platform-chart-legend"><span><i className="legend-pilgrims" /> Pellegrini</span><span><i className="legend-trips" /> Viaggi</span></div>
            <div className="platform-bars">
              {data.monthly.map((point) => (
                <div className="platform-bar-column" key={point.month} title={`${shortMonth(point.month)}: ${point.pilgrims} pellegrini, ${point.trips} viaggi`}>
                  <div className="platform-bar-track">
                    <span className="bar-pilgrims" style={{ height: `${Math.max(3, (point.pilgrims / chartMaximum) * 100)}%` }} />
                    <span className="bar-trips" style={{ height: `${Math.max(3, (point.trips / chartMaximum) * 100)}%` }} />
                  </div>
                  <small>{shortMonth(point.month)}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="platform-plan-summary">
            <h3>Distribuzione piani</h3>
            {(["starter", "professional", "enterprise"] as const).map((plan) => {
              const count = data.offices.filter((office) => office.plan === plan).length;
              const percentage = data.offices.length ? Math.round((count / data.offices.length) * 100) : 0;
              return <div key={plan}><span><strong>{planLabels[plan]}</strong><small>{count} uffici</small></span><div><i style={{ width: `${percentage}%` }} /></div><b>{percentage}%</b></div>;
            })}
            <article><CircleDollarSign size={18} /><div><small>Movimenti registrati</small><strong>{formatCurrency(data.stats.collected)}</strong></div></article>
          </div>
        </div>
      </section>

      <section id="offices" className="platform-panel">
        <div className="platform-panel-heading platform-offices-heading">
          <div><p>Clienti</p><h2>Uffici pellegrinaggi</h2></div>
          <button className="platform-primary-button" type="button" onClick={() => setCreateOfficeOpen(true)}><Plus size={17} /> Nuovo ufficio</button>
        </div>
        <div className="platform-filters">
          <label><Search size={16} /><input aria-label="Cerca ufficio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, slug o email…" /></label>
          <select aria-label="Filtra stato uffici" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tutti gli stati</option><option value="active">Attivi</option><option value="inactive">Disattivati</option></select>
          <span>{offices.length} risultati</span>
        </div>
        <div className="platform-office-layout">
          <div className="platform-office-list">
            {offices.length ? offices.map((office) => (
              <button type="button" onClick={() => setSelectedId(office.id)} className={selected?.id === office.id ? "platform-office-row selected" : "platform-office-row"} key={office.id}>
                <span className="platform-office-logo">{office.name.slice(0, 2).toUpperCase()}</span>
                <span className="platform-office-main"><strong>{office.name}</strong><small>{office.contactEmail || office.slug}</small></span>
                <span className={office.isActive ? "platform-status active" : "platform-status inactive"}>{office.isActive ? "Attivo" : "Disattivato"}</span>
                <span className="platform-office-metric"><strong>{office.memberCount}</strong><small>utenti</small></span>
                <span className="platform-office-metric"><strong>{office.tripCount}</strong><small>viaggi</small></span>
                <ChevronRight size={17} />
              </button>
            )) : <div className="platform-empty"><Building2 size={26} /><strong>Nessun ufficio trovato</strong><p>Modifica i filtri oppure aggiungi un nuovo cliente.</p></div>}
          </div>

          {selected ? (
            <aside className="platform-office-detail">
              <div className="platform-office-detail-title"><div><span>{selected.name.slice(0, 2).toUpperCase()}</span><div><p>{selected.isPlatformOffice ? "Ufficio piattaforma" : "Ufficio cliente"}</p><h3>{selected.name}</h3><small>Creato il {dateLabel(selected.createdAt.slice(0, 10))}</small></div></div><button aria-label="Chiudi dettaglio" type="button" onClick={() => setSelectedId("")}><X size={17} /></button></div>
              <div className="platform-office-kpis"><article><strong>{selected.pilgrimCount}</strong><small>Pellegrini</small></article><article><strong>{selected.tripCount}</strong><small>Viaggi</small></article><article><strong>{formatCurrency(selected.collected)}</strong><small>Registrato</small></article></div>
              <form className="platform-office-form" onSubmit={saveOffice}>
                <input type="hidden" name="organizationId" value={selected.id} />
                <div className="platform-form-grid">
                  <label><span>Nome ufficio</span><input name="name" defaultValue={selected.name} minLength={2} maxLength={120} required /></label>
                  <label><span>Slug</span><input name="slug" defaultValue={selected.slug} pattern="[a-z0-9][a-z0-9-]{1,62}" required /></label>
                  <label><span>Email referente</span><input name="contactEmail" type="email" defaultValue={selected.contactEmail} required /></label>
                  <label><span>Telefono</span><input name="phone" defaultValue={selected.phone} /></label>
                  <label><span>Piano</span><select name="plan" defaultValue={selected.plan}><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
                  <label><span>Abbonamento</span><select name="subscriptionStatus" defaultValue={selected.subscriptionStatus}><option value="trial">Prova</option><option value="active">Attivo</option><option value="past_due">Pagamento scaduto</option><option value="cancelled">Annullato</option></select></label>
                  <label><span>Stato accesso</span><select name="isActive" defaultValue={String(selected.isActive)} disabled={selected.isPlatformOffice}><option value="true">Accesso attivo</option><option value="false">Accesso disattivato</option></select>{selected.isPlatformOffice ? <input type="hidden" name="isActive" value="true" /> : null}</label>
                  <label><span>Limite utenti</span><input name="userLimit" type="number" min={1} max={1000} defaultValue={selected.userLimit} required /></label>
                  <label><span>Rinnovo</span><input name="renewalDate" type="date" defaultValue={selected.renewalDate ?? ""} /></label>
                  <label><span>Fuso orario</span><select name="timezone" defaultValue={selected.timezone}><option value="Europe/Rome">Roma</option><option value="Europe/Paris">Parigi</option><option value="Europe/Madrid">Madrid</option><option value="Europe/Lisbon">Lisbona</option><option value="UTC">UTC</option></select></label>
                  <label><span>Valuta</span><select name="currency" defaultValue={selected.currency}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></label>
                </div>
                <label><span>Note interne</span><textarea name="notes" defaultValue={selected.notes} rows={3} maxLength={2000} /></label>
                <div className="platform-form-actions">
                  {!selected.isPlatformOffice ? <button className={selected.isActive ? "platform-danger-button" : "platform-secondary-button"} disabled={busy === "toggle-office"} type="button" onClick={() => toggleOffice(selected)}><Power size={16} /> {selected.isActive ? "Disattiva ufficio" : "Riattiva ufficio"}</button> : <span />}
                  <button className="platform-primary-button" disabled={busy === "office"} type="submit">{busy === "office" ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Salva modifiche</button>
                </div>
              </form>
            </aside>
          ) : null}
        </div>
      </section>

      {selected ? (
        <section id="users" className="platform-panel">
          <div className="platform-panel-heading platform-offices-heading"><div><p>Accessi · {selected.name}</p><h2>Utenti dell’ufficio</h2></div><button className="platform-primary-button" type="button" onClick={() => setCreateMemberOpen(true)}><UserPlus size={17} /> Nuovo accesso</button></div>
          <div className="platform-user-list">
            {selected.members.map((member) => (
              <form className="platform-user-row" onSubmit={(event) => saveMember(event, member.userId)} key={member.userId}>
                <input type="hidden" name="organizationId" value={selected.id} />
                <input type="hidden" name="userId" value={member.userId} />
                <span className="platform-user-avatar">{member.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <label><span>Nome</span><input name="displayName" defaultValue={member.displayName} minLength={2} maxLength={120} required /></label>
                <label><span>Username</span><input name="username" defaultValue={member.username} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label>
                <label><span>Email</span><input name="email" type="email" defaultValue={member.email} required /></label>
                <label><span>Ruolo</span><select name="role" defaultValue={member.role}>{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
                <label><span>Stato</span><select name="isActive" defaultValue={String(member.isActive)}><option value="true">Attivo</option><option value="false">Sospeso</option></select></label>
                <label><span>Nuova password</span><input name="password" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" placeholder="Lascia vuoto" autoComplete="new-password" /></label>
                <button className="platform-icon-save" aria-label={`Salva ${member.displayName}`} disabled={busy === `member-${member.userId}`} type="submit">{busy === `member-${member.userId}` ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}</button>
              </form>
            ))}
            {!selected.members.length ? <div className="platform-empty"><Users size={24} /><strong>Nessun utente</strong><p>Crea il primo accesso per questo ufficio.</p></div> : null}
          </div>
        </section>
      ) : null}

      <section id="activity" className="platform-panel">
        <div className="platform-panel-heading"><div><p>Registro</p><h2>Attività amministrative recenti</h2></div><span><LockKeyhole size={16} /> Operazioni tracciate</span></div>
        <div className="platform-activity-list">
          {data.activity.map((entry) => <article key={entry.id}><span><Activity size={16} /></span><div><strong>{entry.action}</strong><p>{entry.officeName} · {entry.actorName}</p></div><time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(entry.occurredAt))}</time></article>)}
          {!data.activity.length ? <div className="platform-empty"><Activity size={24} /><strong>Nessuna attività registrata</strong></div> : null}
        </div>
      </section>

      {createOfficeOpen ? (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOfficeOpen(false); }}>
          <section className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="new-office-title">
            <header><div><p>Nuovo cliente</p><h2 id="new-office-title">Aggiungi ufficio</h2></div><button type="button" aria-label="Chiudi" onClick={() => setCreateOfficeOpen(false)}><X size={18} /></button></header>
            <form onSubmit={createOffice}>
              <div className="platform-form-grid">
                <label><span>Nome ufficio</span><input name="name" minLength={2} maxLength={120} required autoFocus /></label>
                <label><span>Slug</span><input name="slug" pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="ufficio-roma" required /></label>
                <label><span>Email referente</span><input name="contactEmail" type="email" required /></label>
                <label><span>Telefono</span><input name="phone" maxLength={40} /></label>
                <label><span>Piano</span><select name="plan" defaultValue="professional"><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
                <label><span>Abbonamento</span><select name="subscriptionStatus" defaultValue="trial"><option value="trial">Prova</option><option value="active">Attivo</option><option value="past_due">Pagamento scaduto</option><option value="cancelled">Annullato</option></select></label>
                <label><span>Limite utenti</span><input name="userLimit" type="number" min={1} max={1000} defaultValue={10} required /></label>
                <label><span>Data rinnovo</span><input name="renewalDate" type="date" /></label>
                <label><span>Fuso orario</span><select name="timezone" defaultValue="Europe/Rome"><option value="Europe/Rome">Roma</option><option value="Europe/Paris">Parigi</option><option value="Europe/Madrid">Madrid</option><option value="Europe/Lisbon">Lisbona</option><option value="UTC">UTC</option></select></label>
                <label><span>Valuta</span><select name="currency" defaultValue="EUR"><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></label>
              </div>
              <label><span>Note interne</span><textarea name="notes" rows={2} maxLength={2000} /></label>
              <div className="platform-credentials-box"><div><KeyRound size={18} /><span><strong>Primo accesso dell’ufficio</strong><small>Le credenziali sono attive immediatamente. Password: almeno 8 caratteri, una lettera e un numero.</small></span></div><div className="platform-form-grid"><label><span>Nome amministratore</span><input name="adminDisplayName" minLength={2} maxLength={120} required /></label><label><span>Username</span><input name="adminUsername" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label><label><span>Email identità</span><input name="adminEmail" type="email" required /></label><label><span>Password iniziale</span><input name="adminPassword" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" autoComplete="new-password" required /></label></div></div>
              <footer><button className="platform-secondary-button" type="button" onClick={() => setCreateOfficeOpen(false)}>Annulla</button><button className="platform-primary-button" disabled={busy === "create-office"} type="submit">{busy === "create-office" ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Crea ufficio e accesso</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {createMemberOpen && selected ? (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateMemberOpen(false); }}>
          <section className="platform-modal platform-modal-small" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
            <header><div><p>{selected.name}</p><h2 id="new-user-title">Crea nuovo accesso</h2></div><button type="button" aria-label="Chiudi" onClick={() => setCreateMemberOpen(false)}><X size={18} /></button></header>
            <form onSubmit={createMember}>
              <input type="hidden" name="organizationId" value={selected.id} />
              <div className="platform-form-grid"><label><span>Nome visualizzato</span><input name="displayName" minLength={2} maxLength={120} required autoFocus /></label><label><span>Username</span><input name="username" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label><label><span>Email identità</span><input name="email" type="email" required /></label><label><span>Ruolo</span><select name="role" defaultValue="operator">{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label><label className="platform-field-wide"><span>Password</span><input name="password" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" autoComplete="new-password" required /></label></div>
              <footer><button className="platform-secondary-button" type="button" onClick={() => setCreateMemberOpen(false)}>Annulla</button><button className="platform-primary-button" disabled={busy === "create-member"} type="submit">{busy === "create-member" ? <LoaderCircle className="spin" size={16} /> : <UserPlus size={16} />} Crea accesso</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
