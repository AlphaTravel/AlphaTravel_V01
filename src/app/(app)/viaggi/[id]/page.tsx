import { ArrowLeft, CalendarDays, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { TripWorkspace } from "@/components/trip-workspace";
import { getTrips } from "@/lib/live-data";
import { formatDate } from "@/lib/utils";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trips = await getTrips();
  const trip = trips.find((item) => item.id === id);
  if (!trip) notFound();
  return (
    <>
      <div className="detail-nav"><Link href="/viaggi"><ArrowLeft size={16} /> Viaggi</Link><button className="button button-secondary"><Pencil size={15} /> Modifica viaggio</button></div>
      <header className={`trip-detail-header trip-detail-${trip.coverTone}`}>
        <div><div className="trip-title-row"><span>{trip.code}</span><StatusBadge label={trip.status} /></div><h1>{trip.title}</h1><p><MapPin size={15} /> {trip.destination}<span>·</span><CalendarDays size={15} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</p></div>
        <div className="trip-header-number"><strong>{trip.participants}</strong><span>partecipanti</span></div>
      </header>
      <TripWorkspace trip={trip} />
    </>
  );
}
