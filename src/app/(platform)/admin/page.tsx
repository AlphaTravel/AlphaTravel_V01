import { Activity, Building2, CreditCard, Route, UserRoundCheck, Users } from "lucide-react";
import { PlatformAdminPanel } from "@/components/platform-admin-panel";
import { getAdminDashboardData } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <>
      <header className="platform-page-header">
        <div>
          <p className="platform-kicker">Control center</p>
          <h1>Panoramica piattaforma</h1>
          <p>Gestisci gli uffici clienti, gli accessi e l’andamento complessivo di AlphaTravel.</p>
        </div>
        <div className="platform-live"><span /> Sistema operativo</div>
      </header>

      <section className="platform-stat-grid" aria-label="Indicatori piattaforma">
        <article><span><Building2 /></span><div><small>Uffici clienti</small><strong>{data.stats.totalOffices}</strong><p>{data.stats.activeOffices} attivi</p></div></article>
        <article><span><UserRoundCheck /></span><div><small>Utenti attivi</small><strong>{data.stats.activeUsers}</strong><p>su tutti gli uffici</p></div></article>
        <article><span><Users /></span><div><small>Pellegrini gestiti</small><strong>{data.stats.pilgrims}</strong><p>{data.stats.registrations} iscrizioni</p></div></article>
        <article><span><Route /></span><div><small>Viaggi creati</small><strong>{data.stats.trips}</strong><p>totale piattaforma</p></div></article>
        <article><span><CreditCard /></span><div><small>Transato registrato</small><strong>{formatCurrency(data.stats.collected)}</strong><p>dati aggregati</p></div></article>
        <article><span><Activity /></span><div><small>Stato servizio</small><strong>Online</strong><p>controlli attivi</p></div></article>
      </section>

      <PlatformAdminPanel data={data} />
    </>
  );
}
