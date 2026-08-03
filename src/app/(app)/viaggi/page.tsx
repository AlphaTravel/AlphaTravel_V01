import { ListFilter, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TripCard } from "@/components/trip-card";
import { getTrips } from "@/lib/live-data";

export default async function TripsPage() {
  const trips = await getTrips();
  return (
    <>
      <PageHeader eyebrow="Pianificazione" title="Viaggi" description="Dalla bozza alla partenza: persone, servizi, logistica e incassi." action={<Link href="/viaggi/nuovo" className="button button-primary"><Plus size={15} /> Nuovo viaggio</Link>} />
      <div className="view-toolbar"><div className="segmented"><button className="active">In programma <span>{trips.length}</span></button><button>Conclusi</button><button>Archivio</button></div><button className="button button-secondary"><ListFilter size={15} /> Filtri</button></div>
      {trips.length ? <div className="trip-grid">{trips.map((trip) => <TripCard trip={trip} key={trip.id} />)}</div> : <div className="empty-state"><h2>Nessun viaggio</h2><p>Crea la prima partenza per iniziare la pianificazione.</p><Link href="/viaggi/nuovo" className="button button-primary"><Plus size={15} /> Crea viaggio</Link></div>}
    </>
  );
}
