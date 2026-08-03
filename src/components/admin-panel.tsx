"use client";

import { LoaderCircle, MailPlus, Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inviteMemberAction, updateMemberAction } from "@/app/admin-actions";
import type { AdminDashboardData } from "@/lib/admin-data";
import { roleOptions } from "@/lib/roles";

export function AdminPanel({ data, currentUserId }: { data: AdminDashboardData; currentUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy("invite");
    setNotice(null);
    const result = await inviteMemberAction(new FormData(form));
    setBusy("");
    setNotice(result);
    if (result.ok) {
      form.reset();
      router.refresh();
    }
  }

  async function update(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    setBusy(userId);
    setNotice(null);
    const result = await updateMemberAction(new FormData(event.currentTarget));
    setBusy("");
    setNotice(result);
    if (result.ok) router.refresh();
  }

  return (
    <div className="admin-sections">
      {notice ? <div className={notice.ok ? "success-banner" : "form-error"}>{notice.message}</div> : null}

      <section className="form-card">
        <div className="form-card-title"><span><MailPlus size={18} /></span><div><h2>Invita un utente</h2><p>Assegna lo username di accesso. L’email serve soltanto per attivazione e recupero.</p></div></div>
        <form className="admin-invite-form" onSubmit={invite}>
          <label><span>Username</span><input name="username" minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autoCapitalize="none" spellCheck={false} autoComplete="off" required /></label>
          <label><span>Nome visualizzato</span><input name="displayName" minLength={2} maxLength={120} autoComplete="off" required /></label>
          <label><span>Email di attivazione</span><input name="email" type="email" maxLength={254} autoComplete="off" required /></label>
          <label><span>Ruolo</span><select name="role" defaultValue="operator">{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
          <button className="button button-primary" disabled={busy === "invite"} type="submit">{busy === "invite" ? <LoaderCircle className="spin" size={16} /> : <MailPlus size={16} />}Invia invito</button>
        </form>
      </section>

      <section className="table-card">
        <div className="panel-header admin-table-heading"><div><p className="eyebrow">Controllo accessi</p><h2>Utenti e ruoli</h2></div><span className="admin-security-label"><ShieldAlert size={15} /> MFA richiesta per le modifiche</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Utente</th><th>Ruolo</th><th>Stato</th><th>Creato</th><th>Azioni</th></tr></thead>
            <tbody>{data.members.map((member) => (
              <tr key={member.userId}>
                <td><strong>{member.displayName}{member.userId === currentUserId ? " · tu" : ""}</strong><small>@{member.username} · {member.email}</small></td>
                <td colSpan={4} className="admin-member-control-cell">
                  <form className="admin-member-controls" onSubmit={(event) => update(event, member.userId)}>
                    <input type="hidden" name="userId" value={member.userId} />
                    <input name="username" defaultValue={member.username} minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autoCapitalize="none" spellCheck={false} aria-label={`Username di ${member.displayName}`} required />
                    <select name="role" defaultValue={member.roleKey} aria-label={`Ruolo di ${member.displayName}`}>{roleOptions.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select>
                    <select name="active" defaultValue={String(member.isActive)} aria-label={`Stato di ${member.displayName}`}><option value="true">Attivo</option><option value="false">Sospeso</option></select>
                    <time dateTime={member.createdAt}>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(member.createdAt))}</time>
                    <button className="button button-secondary" disabled={busy === member.userId} type="submit">{busy === member.userId ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}Salva</button>
                  </form>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="form-card">
        <div className="form-card-title"><span><ShieldAlert size={18} /></span><div><h2>Registro di sicurezza</h2><p>Ultime operazioni sensibili, senza copie dei dati modificati.</p></div></div>
        <div className="audit-list">{data.audits.length ? data.audits.map((audit) => <article key={audit.id}><span>{audit.action}</span><p><strong>{audit.actor}</strong><small>{audit.tableName.replaceAll("_", " ")}</small></p><time dateTime={audit.occurredAt}>{new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(audit.occurredAt))}</time></article>) : <p className="empty-inline">Nessuna operazione registrata.</p>}</div>
      </section>
    </div>
  );
}
