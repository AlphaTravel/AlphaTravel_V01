import { ArrowLeft, CalendarDays, MapPin, Pencil, Settings2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { TripWorkspace } from "@/components/trip-workspace";
import { getCurrentMember, getTrips } from "@/lib/live-data";
import { canManageTravel, canReadPayments, canReadSensitivePilgrimData, canWritePayments } from "@/lib/permissions";
import { getTripOperationsData } from "@/lib/trip-operations-data";
import { formatDate } from "@/lib/utils";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trips, operations, member] = await Promise.all([getTrips(), getTripOperationsData(id), getCurrentMember()]);
  const trip = trips.find((item) => item.id === id);
  if (!trip || !member) notFound();
  const canManage = canManageTravel(member.roleKey);
  return (
    <>
      <div className="detail-nav"><Link href="/viaggi"><ArrowLeft size={16} /> Viaggi</Link>{canManage ? <div className="page-actions"><Link className="button button-secondary" href={`/viaggi/${trip.id}/modifica`}><Pencil size={15} /> Dati viaggio</Link><Link className="button button-primary" href={`/viaggi/${trip.id}/logistica`}><Settings2 size={15} /> Organizza viaggio</Link></div> : null}</div>
      <header className={`trip-detail-header trip-detail-${trip.coverTone}`}>
        <div><div className="trip-title-row"><span>{trip.code}</span><StatusBadge label={trip.status} /></div><h1>{trip.title}</h1><p><MapPin size={15} /> {trip.destination}<span>·</span><CalendarDays size={15} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</p></div>
        <div className="trip-header-number"><strong>{trip.participants}</strong><span>partecipanti</span></div>
      </header>
      <TripWorkspace trip={trip} data={operations} canManage={canManage} canViewPayments={canReadPayments(member.roleKey)} canRecordPayments={canWritePayments(member.roleKey)} canViewSensitive={canReadSensitivePilgrimData(member.roleKey)} />
    </>
  );
}
