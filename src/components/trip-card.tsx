import { ArrowUpRight, BedDouble, BusFront, CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { Trip } from "@/lib/types";
import { cn, formatCurrency, formatDate, percentage } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function TripCard({ trip, canViewPayments = false }: { trip: Trip; canViewPayments?: boolean }) {
  const fill = percentage(trip.participants, trip.capacity);
  return (
    <article className="trip-card">
      <div className={cn("trip-cover", `trip-cover-${trip.coverTone}`)}>
        <div className="trip-cover-grid" />
        <span className="trip-code">{trip.code}</span>
        <StatusBadge label={trip.status} />
        <div className="trip-cover-title">
          <MapPin size={16} />
          <h2>{trip.title}</h2>
          <p>{trip.destination}</p>
        </div>
      </div>
      <div className="trip-card-body">
        <div className="trip-meta">
          <span><CalendarDays size={15} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
          <span><Users size={15} /> {trip.participants}/{trip.capacity} partecipanti</span>
        </div>
        <div className="capacity-row">
          <div><strong>{fill}%</strong><span>capienza</span></div>
          <div className="progress-track"><span style={{ width: `${fill}%` }} /></div>
        </div>
        <div className="trip-numbers">
          <span><BedDouble size={16} /><strong>{trip.hotels}</strong><small>hotel</small></span>
          <span><BusFront size={16} /><strong>{trip.coaches}</strong><small>mezzi</small></span>
          <span><strong>{canViewPayments ? formatCurrency(trip.collected) : "Riservato"}</strong><small>{canViewPayments ? "incassato" : "dati finanziari"}</small></span>
        </div>
        <div className="trip-card-footer">
          <span>Responsabile <strong>{trip.leader}</strong></span>
          <Link href={`/viaggi/${trip.id}`}>Apri viaggio <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
