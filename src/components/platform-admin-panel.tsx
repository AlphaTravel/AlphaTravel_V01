"use client";

import {
  Building2,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  createOfficeAction,
  createOfficeMemberAction,
  deleteOfficeAction,
  setOfficeActiveAction,
  updateOfficeAction,
  updateOfficeMemberAction,
  type AdminActionResult,
} from "@/app/admin-actions";
import type { PlatformDashboardData, PlatformOffice } from "@/lib/admin-data";
import { roleOptions } from "@/lib/roles";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" })
    .format(new Date(value));
}

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export function PlatformAdminPanel({ data }: { data: PlatformDashboardData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [createOfficeOpen, setCreateOfficeOpen] = useState(false);
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformOffice | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<AdminActionResult | null>(null);

  const offices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("it");
    return data.offices.filter((office) => {
      const text = `${office.name} ${office.contactEmail} ${office.members.map((member) => member.username).join(" ")}`.toLocaleLowerCase("it");
      const matchesStatus = status === "all" || (status === "active" ? office.isActive : !office.isActive);
      return text.includes(needle) && matchesStatus;
    });
  }, [data.offices, query, status]);
  const selected = data.offices.find((office) => office.id === selectedId) ?? null;

  async function run(key: string, action: () => Promise<AdminActionResult>, onSuccess?: (id?: string) => void) {
    setBusy(key);
    setNotice(null);
    try {
      const result = await action();
      setNotice(result);
      if (result.ok) {
        onSuccess?.(result.id);
        router.refresh();
      }
    } catch {
      setNotice({ ok: false, message: "Operazione non completata. Riprova." });
    } finally {
      setBusy("");
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
    await run("save-office", () => updateOfficeAction(new FormData(event.currentTarget)));
  }

  async function changeOfficeState(office: PlatformOffice) {
    const values = new FormData();
    values.set("organizationId", office.id);
    values.set("isActive", String(!office.isActive));
    await run("office-state", () => setOfficeActiveAction(values));
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

  async function deleteOffice() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;
    const values = new FormData();
    values.set("organizationId", deleteTarget.id);
    values.set("confirmation", deleteConfirmation);
    await run("delete-office", () => deleteOfficeAction(values), () => {
      setSelectedId(null);
      setDeleteTarget(null);
      setDeleteConfirmation("");
    });
  }

  return (
    <div className="platform-admin-stack">
      {notice ? <div className={notice.ok ? "platform-notice platform-notice-ok" : "platform-notice platform-notice-error"}>{notice.ok ? <CheckCircle2 size={17} /> : <X size={17} />}{notice.message}</div> : null}

      <section className="platform-panel" id="offices">
        <div className="platform-panel-heading">
          <div><p>Clienti</p><h2>Uffici pellegrinaggi</h2></div>
          <button className="platform-primary-button" type="button" onClick={() => setCreateOfficeOpen(true)}><Plus size={17} /> Aggiungi ufficio</button>
        </div>
        <div className="platform-filters">
          <label><Search size={16} /><input aria-label="Cerca ufficio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca ufficio o username…" /></label>
          <select aria-label="Filtra stato uffici" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tutti</option><option value="active">Attivi</option><option value="inactive">Sospesi</option></select>
          <span>{offices.length} {offices.length === 1 ? "ufficio" : "uffici"}</span>
        </div>
        <div className="platform-office-table" role="table" aria-label="Elenco uffici clienti">
          <div className="platform-office-table-head" role="row"><span>Ufficio</span><span>Stato</span><span>Accessi</span><span>Dati</span><span /></div>
          {offices.map((office) => (
            <button className="platform-office-row" type="button" onClick={() => setSelectedId(office.id)} key={office.id}>
              <span className="platform-office-identity"><i>{initials(office.name)}</i><span><strong>{office.name}</strong><small>{office.contactEmail}</small></span></span>
              <span className={office.isActive ? "platform-status active" : "platform-status inactive"}>{office.isActive ? "Attivo" : "Sospeso"}</span>
              <span className="platform-office-value"><strong>{office.activeMemberCount}</strong><small>su {office.memberCount}</small></span>
              <span className="platform-office-value"><strong>{office.pilgrimCount}</strong><small>pellegrini · {office.tripCount} viaggi</small></span>
              <span className="platform-manage-link">Gestisci <ChevronRight size={16} /></span>
            </button>
          ))}
          {!offices.length ? <div className="platform-empty"><Building2 size={28} /><strong>Nessun ufficio trovato</strong><p>Aggiungi il primo ufficio cliente oppure modifica la ricerca.</p></div> : null}
        </div>
      </section>

      {selected ? (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <section className="platform-modal platform-office-modal" role="dialog" aria-modal="true" aria-labelledby="office-title">
            <header><div><p>{selected.isActive ? "Ufficio attivo" : "Ufficio sospeso"}</p><h2 id="office-title">{selected.name}</h2></div><button type="button" aria-label="Chiudi" onClick={() => setSelectedId(null)}><X size={18} /></button></header>
            <div className="platform-modal-body">
              <div className="platform-office-summary">
                <span><strong>{selected.memberCount}</strong><small>accessi</small></span>
                <span><strong>{selected.pilgrimCount}</strong><small>pellegrini</small></span>
                <span><strong>{selected.tripCount}</strong><small>viaggi</small></span>
                <span><strong>{dateLabel(selected.createdAt)}</strong><small>creato</small></span>
              </div>

              <section className="platform-essential-section">
                <div className="platform-section-title"><div><Building2 size={17} /><span><strong>Dati essenziali</strong><small>Nome visualizzato e contatto dell’ufficio.</small></span></div></div>
                <form className="platform-essential-form" method="post" onSubmit={saveOffice}>
                  <input type="hidden" name="organizationId" value={selected.id} />
                  <label><span>Nome ufficio</span><input name="name" defaultValue={selected.name} minLength={2} maxLength={120} required /></label>
                  <label><span>Email di contatto</span><input name="contactEmail" type="email" defaultValue={selected.contactEmail} required /></label>
                  <button className="platform-primary-button" disabled={busy === "save-office"} type="submit">{busy === "save-office" ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Salva</button>
                </form>
              </section>

              <section className="platform-essential-section">
                <div className="platform-section-title"><div><KeyRound size={17} /><span><strong>Credenziali</strong><small>Gli utenti entrano sempre con username e password.</small></span></div><button className="platform-secondary-button" type="button" onClick={() => setCreateMemberOpen(true)}><UserPlus size={15} /> Nuovo accesso</button></div>
                <div className="platform-access-list">
                  {selected.members.map((member) => (
                    <details className="platform-access-item" key={member.userId}>
                      <summary><i>{initials(member.displayName)}</i><span><strong>{member.displayName}</strong><small>@{member.username} · {member.isActive ? "attivo" : "sospeso"}</small></span><ChevronRight size={16} /></summary>
                      <form method="post" onSubmit={(event) => saveMember(event, member.userId)}>
                        <input type="hidden" name="organizationId" value={selected.id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <input type="hidden" name="isActive" value={String(member.isActive)} />
                        <label><span>Nome</span><input name="displayName" defaultValue={member.displayName} minLength={2} maxLength={120} required /></label>
                        <label><span>Username</span><input name="username" defaultValue={member.username} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label>
                        <label><span>Ruolo</span><select name="role" defaultValue={member.role}>{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
                        <label><span>Nuova password</span><input name="password" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" placeholder="Lascia vuoto" autoComplete="new-password" /></label>
                        <button className="platform-primary-button" disabled={busy === `member-${member.userId}`} type="submit">{busy === `member-${member.userId}` ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Aggiorna</button>
                      </form>
                    </details>
                  ))}
                </div>
              </section>

              <footer className="platform-office-actions">
                <button className="platform-danger-link" type="button" onClick={() => { setDeleteTarget(selected); setDeleteConfirmation(""); }}><Trash2 size={15} /> Elimina definitivamente</button>
                <button className={selected.isActive ? "platform-warning-button" : "platform-success-button"} disabled={busy === "office-state"} type="button" onClick={() => changeOfficeState(selected)}>{selected.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}{selected.isActive ? "Sospendi accessi" : "Riattiva accessi"}</button>
              </footer>
            </div>
          </section>
        </div>
      ) : null}

      {createOfficeOpen ? (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOfficeOpen(false); }}>
          <section className="platform-modal platform-modal-small" role="dialog" aria-modal="true" aria-labelledby="new-office-title">
            <header><div><p>Nuovo cliente</p><h2 id="new-office-title">Aggiungi ufficio</h2></div><button type="button" aria-label="Chiudi" onClick={() => setCreateOfficeOpen(false)}><X size={18} /></button></header>
            <form method="post" onSubmit={createOffice}>
              <div className="platform-form-grid">
                <label><span>Nome ufficio</span><input name="name" minLength={2} maxLength={120} required autoFocus /></label>
                <label><span>Email di contatto</span><input name="contactEmail" type="email" required /></label>
              </div>
              <div className="platform-credentials-box"><div><ShieldCheck size={18} /><span><strong>Primo amministratore</strong><small>Potrai cambiare queste credenziali in qualsiasi momento.</small></span></div><div className="platform-form-grid"><label><span>Nome</span><input name="adminDisplayName" minLength={2} maxLength={120} required /></label><label><span>Username</span><input name="adminUsername" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label><label className="platform-field-wide"><span>Password iniziale</span><input name="adminPassword" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" autoComplete="new-password" required /></label></div></div>
              <footer><button className="platform-secondary-button" type="button" onClick={() => setCreateOfficeOpen(false)}>Annulla</button><button className="platform-primary-button" disabled={busy === "create-office"} type="submit">{busy === "create-office" ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Crea ufficio</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {createMemberOpen && selected ? (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateMemberOpen(false); }}>
          <section className="platform-modal platform-modal-small" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
            <header><div><p>{selected.name}</p><h2 id="new-user-title">Nuovo accesso</h2></div><button type="button" aria-label="Chiudi" onClick={() => setCreateMemberOpen(false)}><X size={18} /></button></header>
            <form method="post" onSubmit={createMember}>
              <input type="hidden" name="organizationId" value={selected.id} />
              <div className="platform-form-grid"><label><span>Nome</span><input name="displayName" minLength={2} maxLength={120} required autoFocus /></label><label><span>Username</span><input name="username" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /></label><label><span>Ruolo</span><select name="role" defaultValue="operator">{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label><label><span>Password</span><input name="password" type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Almeno 8 caratteri, con una lettera e un numero" autoComplete="new-password" required /></label></div>
              <footer><button className="platform-secondary-button" type="button" onClick={() => setCreateMemberOpen(false)}>Annulla</button><button className="platform-primary-button" disabled={busy === "create-member"} type="submit">{busy === "create-member" ? <LoaderCircle className="spin" size={16} /> : <UserPlus size={16} />} Crea accesso</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="platform-modal-backdrop" role="presentation">
          <section className="platform-modal platform-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-office-title">
            <header><div><p>Operazione irreversibile</p><h2 id="delete-office-title">Elimina {deleteTarget.name}</h2></div><button type="button" aria-label="Chiudi" onClick={() => setDeleteTarget(null)}><X size={18} /></button></header>
            <div className="platform-delete-content"><Trash2 size={26} /><p>Verranno eliminati definitivamente tutti gli accessi, i pellegrini, i viaggi, i pagamenti e i documenti privati associati.</p><label><span>Scrivi <strong>{deleteTarget.name}</strong> per confermare</span><input aria-label="Conferma nome ufficio" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoFocus /></label><footer><button className="platform-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Annulla</button><button className="platform-delete-button" disabled={deleteConfirmation !== deleteTarget.name || busy === "delete-office"} type="button" onClick={deleteOffice}>{busy === "delete-office" ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />} Elimina definitivamente</button></footer></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
