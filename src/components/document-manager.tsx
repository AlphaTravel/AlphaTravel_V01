"use client";

import { Download, FileLock2, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { deleteDocumentAction } from "@/app/document-actions";
import type { PilgrimDocument } from "@/lib/document-data";

const kindLabels: Record<string, string> = { identity: "Carta d’identità", passport: "Passaporto", consent: "Consenso", insurance: "Assicurazione", medical: "Documento sanitario", voucher: "Voucher", other: "Altro" };

export function DocumentManager({ pilgrimId, documents, canUpload, canDelete }: { pilgrimId: string; documents: PilgrimDocument[]; canUpload: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("upload");
    setNotice(null);
    const response = await fetch("/api/documents", { method: "POST", body: new FormData(event.currentTarget), credentials: "same-origin" });
    const result = await response.json().catch(() => ({ message: "Caricamento non riuscito." })) as { message: string };
    setBusy("");
    setNotice({ ok: response.ok, message: result.message });
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  async function remove(documentId: string) {
    if (!window.confirm("Eliminare definitivamente questo documento?")) return;
    setBusy(documentId);
    setNotice(null);
    const formData = new FormData();
    formData.set("id", documentId);
    formData.set("pilgrimId", pilgrimId);
    const result = await deleteDocumentAction(formData);
    setBusy("");
    setNotice(result);
    if (result.ok) router.refresh();
  }

  return (
    <div className="admin-sections">
      {notice ? <div className={notice.ok ? "success-banner" : "form-error form-error-block"}>{notice.message}</div> : null}
      {canUpload ? <form className="form-card" method="post" onSubmit={upload} encType="multipart/form-data">
        <div className="form-card-title"><span><Upload size={18} /></span><div><h2>Carica documento</h2><p>PDF o immagine, massimo 4 MB. Il contenuto viene verificato prima del salvataggio.</p></div></div>
        <input type="hidden" name="pilgrimId" value={pilgrimId} />
        <div className="form-grid">
          <label><span>Tipo *</span><select name="kind" defaultValue="identity"><option value="identity">Carta d’identità</option><option value="passport">Passaporto</option><option value="consent">Consenso</option><option value="insurance">Assicurazione</option><option value="medical">Documento sanitario</option><option value="voucher">Voucher</option><option value="other">Altro</option></select></label>
          <label><span>Scadenza</span><input name="expiresOn" type="date" /></label>
          <label className="form-span-2"><span>File *</span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
        </div>
        <div className="checkbox-stack document-sensitive-check"><label><input name="sensitive" type="checkbox" defaultChecked /><span><strong>Documento riservato</strong><small>Automatico per tutti i documenti personali; disattivabile solo per i voucher operativi.</small></span></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "upload"} type="submit">{busy === "upload" ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />} Carica</button></div>
      </form> : null}

      <section className="table-card">
        <div className="panel-header document-table-heading"><div><p className="eyebrow">Archivio privato</p><h2>Documenti ({documents.length})</h2></div><FileLock2 size={19} /></div>
        <div className="table-scroll"><table><thead><tr><th>Documento</th><th>Scadenza</th><th>Protezione</th><th>Dimensione</th><th>Azioni</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><strong>{document.filename}</strong><small>{kindLabels[document.kind] ?? "Altro"}</small></td><td><strong>{document.expiresOn ? new Intl.DateTimeFormat("it-IT").format(new Date(`${document.expiresOn}T00:00:00`)) : "Nessuna"}</strong></td><td><strong>{document.sensitive ? "Riservato" : "Operativo"}</strong></td><td><strong>{Math.ceil(document.byteSize / 1024)} KB</strong></td><td><div className="document-actions"><a className="button button-secondary" href={`/api/documents/${document.id}`}><Download size={14} /> Scarica</a>{canDelete ? <button className="button button-secondary" disabled={busy === document.id} type="button" onClick={() => remove(document.id)}>{busy === document.id ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />} Elimina</button> : null}</div></td></tr>)}</tbody></table></div>
        {!documents.length ? <div className="empty-state document-empty"><h2>Nessun documento</h2><p>Carica il primo documento autorizzato per questo pellegrino.</p></div> : null}
      </section>
    </div>
  );
}
