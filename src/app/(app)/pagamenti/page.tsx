import { AlertTriangle, CircleDollarSign, Clock3, Download, ReceiptText, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getPaymentDashboardData } from "@/lib/payment-data";
import { getCurrentMember } from "@/lib/live-data";
import { formatCurrency } from "@/lib/utils";

export default async function PaymentsPage() {
  const [data, member] = await Promise.all([getPaymentDashboardData(), getCurrentMember()]);
  if (!member || !["admin", "manager", "operator", "accountant"].includes(member.roleKey)) redirect("/accesso-negato");
  const canRecord = ["admin", "manager", "accountant"].includes(member.roleKey);
  const openPositions = data.positions.filter((position) => position.remaining > 0).length;
  const overduePositions = data.positions.filter((position) => position.status === "Scaduto").length;
  return (
    <>
      <PageHeader eyebrow="Contabilità operativa" title="Pagamenti" description="Quote, acconti, saldi e scadenze per viaggio e partecipante." action={canRecord ? <><a className="button button-secondary" href="/api/exports/payments"><Download size={15} /> Esporta prima nota</a><Link className="button button-primary" href="/pagamenti/nuovo"><ReceiptText size={15} /> Registra pagamento</Link></> : undefined} />
      <section className="stat-grid">
        <article className="money-card money-primary"><CircleDollarSign size={20} /><span><small>Incassato</small><strong>{formatCurrency(data.collected)}</strong><b>su {formatCurrency(data.expected)}</b></span></article>
        <article className="money-card"><WalletCards size={20} /><span><small>Da incassare</small><strong>{formatCurrency(Math.max(0, data.expected - data.collected))}</strong><b>{openPositions} posizioni aperte</b></span></article>
        <article className="money-card"><Clock3 size={20} /><span><small>In scadenza</small><strong>{formatCurrency(data.dueSoon)}</strong><b>entro 30 giorni</b></span></article>
        <article className="money-card money-danger"><AlertTriangle size={20} /><span><small>Scaduto</small><strong>{formatCurrency(data.overdue)}</strong><b>{overduePositions} partecipanti</b></span></article>
      </section>
      <section className="table-card">
        <div className="panel-header payment-table-head"><div><p className="eyebrow">Situazione aggiornata</p><h2>Quote partecipanti</h2></div></div>
        <div className="table-scroll"><table><thead><tr><th>Pellegrino</th><th>Viaggio</th><th>Versato</th><th>Residuo</th><th>Stato</th></tr></thead><tbody>{data.positions.map((position) => <tr key={position.registrationId}><td><strong>{position.pilgrimName}</strong></td><td><strong>{position.tripName}</strong></td><td><strong>{formatCurrency(position.paid)}</strong></td><td><strong>{formatCurrency(position.remaining)}</strong><small>Quota {formatCurrency(position.agreed)}</small></td><td><StatusBadge label={position.status} /></td></tr>)}</tbody></table></div>
        <div className="table-footer"><span>{data.positions.length} posizioni</span><span>AlphaTravel non memorizza dati di carte di pagamento.</span></div>
      </section>
    </>
  );
}
