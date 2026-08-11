import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TripCard } from "@/components/trip-card";
import { getCurrentMember, getTrips } from "@/lib/live-data";
import { canManageTravel, canReadPayments } from "@/lib/permissions";

export default async function TripsPage() {
  const [trips, member] = await Promise.all([getTrips(), getCurrentMember()]);
  if (!member) redirect("/accesso-negato");
  const canManage = canManageTravel(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  return (
    <>
      <PageHeader eyebrow="Pianificazione" title="Viaggi" description="Dalla bozza alla partenza: persone, servizi, logistica e incassi." action={canManage ? <Link href="/viaggi/nuovo" className="button button-primary"><Plus size={15} /> Nuovo viaggio</Link> : undefined} />
      {trips.length ? <div className="trip-grid">{trips.map((trip) => <TripCard trip={trip} canViewPayments={canSeePayments} key={trip.id} />)}</div> : <div className="empty-state"><h2>Nessun viaggio</h2><p>{canManage ? "Crea la prima partenza per iniziare la pianificazione." : "Nessuna partenza disponibile."}</p>{canManage ? <Link href="/viaggi/nuovo" className="button button-primary"><Plus size={15} /> Crea viaggio</Link> : null}</div>}
    </>
  );
}
