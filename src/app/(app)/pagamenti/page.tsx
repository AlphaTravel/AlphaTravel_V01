import { AlertTriangle, CircleDollarSign, Clock3, Download, ReceiptText, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getPilgrims, getTrips } from "@/lib/live-data";
import { formatCurrency } from "@/lib/utils";

export default async function PaymentsPage() {
  const [pilgrims, trips] = await Promise.all([getPilgrims(), getTrips()]);
  const expected = trips.reduce((total, trip) => total + trip.revenue, 0);
  const collected = trips.reduce((total, trip) => total + trip.collected, 0);
  return (
    <>
      <PageHeader eyebrow="Contabilità operativa" title="Pagamenti" description="Quote, acconti, saldi e scadenze per viaggio e partecipante." action={<button className="button button-secondary"><Download size={15} /> Esporta prima nota</button>} />
      <section className="stat-grid">
        <article className="money-card money-primary"><CircleDollarSign size={20} /><span><small>Incassato</small><strong>{formatCurrency(collected)}</strong><b>su {formatCurrency(expected)}</b></span></article>
        <article className="money-card"><WalletCards size={20} /><span><small>Da incassare</small><strong>{formatCurrency(expected - collected)}</strong><b>67 posizioni aperte</b></span></article>
        <article className="money-card"><Clock3 size={20} /><span><small>In scadenza</small><strong>€ 18.460</strong><b>entro 30 giorni</b></span></article>
        <article className="money-card money-danger"><AlertTriangle size={20} /><span><small>Scaduto</small><strong>€ 6.250</strong><b>8 partecipanti</b></span></article>
      </section>
      <section className="table-card">
        <div className="panel-header payment-table-head"><div><p className="eyebrow">Movimenti recenti</p><h2>Quote partecipanti</h2></div><button className="button button-primary"><ReceiptText size={15} /> Registra pagamento</button></div>
        <div className="table-scroll"><table><thead><tr><th>Pellegrino</th><th>Viaggio</th><th>Versato</th><th>Residuo</th><th>Stato</th></tr></thead><tbody>{pilgrims.map((pilgrim) => <tr key={pilgrim.id}><td><strong>{pilgrim.name}</strong><small>{pilgrim.group}</small></td><td><strong>{pilgrim.tripName}</strong><small>{pilgrim.id.toUpperCase()}</small></td><td><strong>{formatCurrency(pilgrim.paid)}</strong><small>Bonifico / contanti</small></td><td><strong>{formatCurrency(pilgrim.total - pilgrim.paid)}</strong><small>Quota {formatCurrency(pilgrim.total)}</small></td><td><StatusBadge label={pilgrim.paymentStatus} /></td></tr>)}</tbody></table></div>
        <div className="table-footer"><span>8 posizioni demo</span><span>AlphaTravel non memorizza dati di carte di pagamento.</span></div>
      </section>
    </>
  );
}
