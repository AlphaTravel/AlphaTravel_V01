import { Building2, Database, Users } from "lucide-react";
import { PlatformAdminPanel } from "@/components/platform-admin-panel";
import { getAdminDashboardData } from "@/lib/admin-data";

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <>
      <header className="platform-page-header">
        <div>
          <p className="platform-kicker">Amministrazione</p>
          <h1>Uffici clienti</h1>
          <p>Crea gli uffici, assegna le credenziali e controlla chi può accedere ad AlphaTravel.</p>
        </div>
        <div className="platform-live"><span /> Sistema operativo</div>
      </header>

      <section className="platform-stat-grid" aria-label="Indicatori piattaforma">
        <article><span><Building2 /></span><div><small>Uffici</small><strong>{data.stats.totalOffices}</strong><p>{data.stats.activeOffices} attivi</p></div></article>
        <article><span><Users /></span><div><small>Accessi attivi</small><strong>{data.stats.activeUsers}</strong><p>solo uffici attivi</p></div></article>
        <article><span><Database /></span><div><small>Dati gestiti</small><strong>{data.stats.pilgrims}</strong><p>{data.stats.trips} viaggi</p></div></article>
      </section>

      <PlatformAdminPanel data={data} />
    </>
  );
}
