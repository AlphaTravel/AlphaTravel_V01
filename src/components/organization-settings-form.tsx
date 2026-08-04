"use client";

import { useState, type FormEvent } from "react";
import { updateOrganizationAction } from "@/app/settings-actions";

type Organization = { name: string; timezone: string; currency: string };

export function OrganizationSettingsForm({ organization, canManage }: { organization: Organization; canManage: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await updateOrganizationAction(new FormData(event.currentTarget));
    setBusy(false);
    setMessage({ ok: result.ok, text: result.message });
  }

  return (
    <form className="form-card" id="organizzazione" onSubmit={submit}>
      <div className="form-card-title"><span>01</span><div><h2>Dati agenzia</h2><p>Informazioni applicate all’intero workspace.</p></div></div>
      {message ? <div className={message.ok ? "success-banner" : "form-error form-error-block"}>{message.text}</div> : null}
      <div className="form-grid">
        <label className="form-span-2"><span>Nome organizzazione</span><input name="name" defaultValue={organization.name} minLength={2} maxLength={120} disabled={!canManage} required /></label>
        <label><span>Fuso orario</span><select name="timezone" defaultValue={organization.timezone} disabled={!canManage}><option>Europe/Rome</option><option>Europe/Paris</option><option>Europe/Madrid</option><option>Europe/Lisbon</option><option>UTC</option></select></label>
        <label><span>Valuta</span><select name="currency" defaultValue={organization.currency} disabled={!canManage}><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollaro</option><option value="GBP">GBP — Sterlina</option></select></label>
      </div>
      <div className="settings-actions"><button className="button button-primary" disabled={!canManage || busy} type="submit">{busy ? "Salvataggio…" : "Salva modifiche"}</button></div>
      {!canManage ? <div className="inline-info">Solo gli amministratori con MFA verificata possono modificare questi dati.</div> : null}
    </form>
  );
}
