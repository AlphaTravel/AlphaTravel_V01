import { AlertTriangle, Route, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertList, type OperationalAlert } from "@/components/alert-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TripCard } from "@/components/trip-card";
import { getCurrentMember, getDashboardAttention, getTrips } from "@/lib/live-data";
import { canManageTravel, canReadPayments } from "@/lib/permissions";

export default async function DashboardPage() {
  const [trips, attention, member] = await Promise.all([getTrips(), getDashboardAttention(), getCurrentMember()]);
  if (!member) redirect("/accesso-negato");
  const canManage = canManageTravel(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  const participantCount = trips.reduce((sum, trip) => sum + trip.participants, 0);
  const alertCandidates: OperationalAlert[] = [
    { kind: "documents", tone: "rose", count: attention.missingDocuments, title: "Documenti da verificare", detail: "Mancanti o in scadenza prima del viaggio", href: "/pellegrini" },
    ...(canSeePayments ? [{ kind: "balances" as const, tone: "amber" as const, count: attention.openBalances, title: "Saldi da incassare", detail: "Posizioni con quota ancora aperta", href: "/pagamenti" }] : []),
    { kind: "rooms", tone: "violet", count: attention.missingRooms, title: "Persone senza camera", detail: "Apri un viaggio per completare le camere", href: "/viaggi" },
    { kind: "seats", tone: "blue", count: attention.missingSeats, title: "Persone senza posto", detail: "Apri un viaggio per assegnare i posti", href: "/viaggi" },
    { kind: "menus", tone: "green", count: attention.specialMenus, title: "Menu speciali", detail: "Apri un viaggio per coordinare le esigenze", href: "/viaggi" },
  ];
  const alerts = alertCandidates.filter((alert) => alert.count > 0);
  const attentionCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(new Date())}
        title={`Buongiorno, ${member.name.split(" ")[0]}`}
        description="Ecco cosa richiede attenzione nei prossimi viaggi."
        action={canManage ? <Link className="button button-primary" href="/viaggi/nuovo">Crea viaggio</Link> : undefined}
      />
      <section className="stat-grid stat-grid-three" aria-label="Riepilogo">
        <StatCard icon={Users} label="Iscrizioni attive" value={String(participantCount)} detail="su tutte le partenze" trend="up" />
        <StatCard icon={Route} label="Viaggi in programma" value={String(trips.length)} detail="partenze pianificate" tone="violet" />
        <StatCard icon={AlertTriangle} label="Attività da verificare" value={String(attentionCount)} detail={`${alerts.length} categorie operative`} trend={attentionCount ? "down" : undefined} tone="amber" />
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="section-heading"><div><p className="eyebrow">Agenda</p><h2>Prossime partenze</h2></div><Link href="/viaggi">Vedi tutti</Link></div>
          {trips.length ? <div className="dashboard-trip-grid">{trips.slice(0, 2).map((trip) => <TripCard trip={trip} canViewPayments={canSeePayments} key={trip.id} />)}</div> : <div className="empty-state"><h2>Nessuna partenza pianificata</h2>{canManage ? <Link href="/viaggi/nuovo" className="button button-primary">Crea il primo viaggio</Link> : <p>Nessuna partenza disponibile.</p>}</div>}
        </section>
        <aside className="panel dashboard-alerts">
          <div className="panel-header"><div><p className="eyebrow">Controllo automatico</p><h2>Da sistemare</h2></div><span className="alert-count">{attentionCount}</span></div>
          <AlertList alerts={alerts} />
        </aside>
      </div>
    </>
  );
}
