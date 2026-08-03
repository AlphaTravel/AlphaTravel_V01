import { AlertTriangle, CircleDollarSign, Route, Users } from "lucide-react";
import Link from "next/link";
import { AlertList } from "@/components/alert-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TripCard } from "@/components/trip-card";
import { getCurrentMember, getTrips } from "@/lib/live-data";

export default async function DashboardPage() {
  const [trips, member] = await Promise.all([getTrips(), getCurrentMember()]);
  const participantCount = trips.reduce((sum, trip) => sum + trip.participants, 0);
  const collected = trips.reduce((sum, trip) => sum + trip.collected, 0);
  return (
    <>
      <PageHeader
        eyebrow="Lunedì 3 agosto 2026"
        title={`Buongiorno, ${member.name.split(" ")[0]}`}
        description="Ecco cosa richiede attenzione nei prossimi viaggi."
        action={<Link className="button button-primary" href="/viaggi/nuovo">Crea viaggio</Link>}
      />
      <section className="stat-grid" aria-label="Riepilogo">
        <StatCard icon={Users} label="Iscrizioni attive" value={String(participantCount)} detail="su tutte le partenze" trend="up" />
        <StatCard icon={Route} label="Viaggi in programma" value={String(trips.length)} detail="partenze pianificate" tone="violet" />
        <StatCard icon={CircleDollarSign} label="Incassato" value={new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(collected)} detail="pagamenti registrati" trend="up" tone="green" />
        <StatCard icon={AlertTriangle} label="Attività urgenti" value="12" detail="3 scadono oggi" trend="down" tone="amber" />
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="section-heading"><div><p className="eyebrow">Agenda</p><h2>Prossime partenze</h2></div><Link href="/viaggi">Vedi tutti</Link></div>
          {trips.length ? <div className="dashboard-trip-grid">{trips.slice(0, 2).map((trip) => <TripCard trip={trip} key={trip.id} />)}</div> : <div className="empty-state"><h2>Nessuna partenza pianificata</h2><Link href="/viaggi/nuovo" className="button button-primary">Crea il primo viaggio</Link></div>}
        </section>
        <aside className="panel dashboard-alerts">
          <div className="panel-header"><div><p className="eyebrow">Controllo automatico</p><h2>Da sistemare</h2></div><span className="alert-count">57</span></div>
          <AlertList />
        </aside>
      </div>
    </>
  );
}
