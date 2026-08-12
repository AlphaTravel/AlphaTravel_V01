"use client";

import { AlertTriangle, BedDouble, BusFront, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, FileText, Footprints, Hotel, MapPinned, ReceiptText, Salad, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { TripOperationsData, TripParticipant } from "@/lib/trip-operations-data";
import type { PaymentStatus, Trip } from "@/lib/types";
import { cn, formatCurrency, formatDate, percentage } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const tabs = ["Panoramica", "Partecipanti", "Camere", "Pullman", "Programma", "Pagamenti"] as const;
export type TripWorkspaceTab = (typeof tabs)[number];

function paymentStatus(participant: TripParticipant): PaymentStatus {
  if (participant.paid >= participant.agreed) return "Pagato";
  if (participant.paid > 0) return "Parziale";
  return "Da pagare";
}

export function TripWorkspace({ trip, data, canManage, canViewPayments, canRecordPayments, canViewSensitive, initialTab = "Panoramica" }: { trip: Trip; data: TripOperationsData; canManage: boolean; canViewPayments: boolean; canRecordPayments: boolean; canViewSensitive: boolean; initialTab?: TripWorkspaceTab }) {
  const [active, setActive] = useState<TripWorkspaceTab>(initialTab);
  const visibleTabs = canViewPayments ? tabs : tabs.filter((tab) => tab !== "Pagamenti");
  return (
    <div className="workspace">
      <div className="workspace-tabs" role="tablist" aria-label="Sezioni viaggio">
        {visibleTabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={active === tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}</button>)}
      </div>
      {active === "Panoramica" ? <Overview trip={trip} data={data} canViewSensitive={canViewSensitive} canViewPayments={canViewPayments} /> : null}
      {active === "Partecipanti" ? <Participants trip={trip} data={data} canManage={canManage} canViewSensitive={canViewSensitive} /> : null}
      {active === "Camere" ? <RoomsBoard trip={trip} data={data} canManage={canManage} /> : null}
      {active === "Pullman" ? <CoachBoard trip={trip} data={data} canManage={canManage} /> : null}
      {active === "Programma" ? <Schedule trip={trip} data={data} canManage={canManage} /> : null}
      {active === "Pagamenti" && canViewPayments ? <Payments trip={trip} data={data.participants} canRecord={canRecordPayments} /> : null}
    </div>
  );
}

function Overview({ trip, data, canViewSensitive, canViewPayments }: { trip: Trip; data: TripOperationsData; canViewSensitive: boolean; canViewPayments: boolean }) {
  const menus = data.participants.filter((participant) => participant.dietary.length > 0).length;
  const assisted = data.participants.filter((participant) => participant.mobility !== "independent").length;
  const missingRooms = data.accommodations.length ? data.participants.filter((participant) => !participant.room).length : 0;
  const missingSeats = data.vehicles.length ? data.participants.filter((participant) => !participant.seat).length : 0;
  const openBalances = data.participants.filter((participant) => participant.agreed > participant.paid).length;
  const issueCount = trip.checklist.documents + missingRooms + missingSeats + (canViewPayments ? openBalances : 0);
  const readiness = data.participants.length ? Math.max(0, Math.round(100 - (issueCount / Math.max(1, data.participants.length * 4)) * 100)) : 0;
  const ready = data.participants.filter((participant) => participant.readinessStatus === "Pronto").length;
  const pending = data.participants.length - ready;
  const itineraryWalking = data.itinerary.reduce((sum, item) => sum + item.walkingKm, 0);
  const tasks = [
    { icon: FileText, title: "Documenti da verificare", value: trip.checklist.documents, tone: "rose" },
    { icon: BedDouble, title: "Camere da assegnare", value: missingRooms, tone: "violet" },
    { icon: BusFront, title: "Posti da assegnare", value: missingSeats, tone: "blue" },
    ...(canViewPayments ? [{ icon: CircleDollarSign, title: "Saldi aperti", value: openBalances, tone: "amber" }] : []),
  ];
  return (
    <div className="workspace-grid">
      <section className="panel panel-span-2"><div className="panel-header"><div><p className="eyebrow">Stato operativo</p><h2>Preparazione del viaggio</h2></div><span className="readiness">{readiness}%</span></div><div className="large-progress"><span style={{ width: `${readiness}%` }} /></div><div className="task-grid">{tasks.map(({ icon: Icon, title, value, tone }) => <div className="task-tile" key={title}><span className={`alert-icon alert-icon-${tone}`}><Icon size={17} /></span><strong>{value}</strong><small>{title}</small></div>)}</div></section>
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Capienza</p><h2>Partecipanti</h2></div><Users size={20} /></div><div className="capacity-donut" style={{ "--progress": `${percentage(data.participants.length, trip.capacity) * 3.6}deg` } as CSSProperties}><span><strong>{data.participants.length}</strong><small>su {trip.capacity}</small></span></div><div className="legend-row"><span><i className="dot dot-blue" /> Pronti {ready}</span><span><i className="dot dot-amber" /> Da gestire {pending}</span></div></section>
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Servizi configurati</p><h2>Inventario</h2></div><CalendarDays size={20} /></div><div className="deadline-list"><span><b>{data.accommodations.length}</b><p><strong>Strutture</strong><small>{data.rooms.length} camere</small></p></span><span><b>{data.vehicles.length}</b><p><strong>Mezzi</strong><small>{data.vehicles.reduce((sum, vehicle) => sum + vehicle.seats.length, 0)} posti</small></p></span><span><b>{data.itinerary.length}</b><p><strong>Attività</strong><small>nel programma</small></p></span></div></section>
      <section className="panel panel-span-2"><div className="panel-header"><div><p className="eyebrow">Operatività</p><h2>Esigenze da presidiare</h2></div><AlertTriangle size={20} /></div><div className="needs-grid">{canViewSensitive ? <><div><Salad size={18} /><strong>{menus}</strong><span>menu speciali</span><small>dati correnti</small></div><div><Footprints size={18} /><strong>{assisted}</strong><span>assistenze</span><small>mobilità da coordinare</small></div></> : null}<div><Hotel size={18} /><strong>{data.rooms.filter((room) => room.isAccessible).length}</strong><span>camere accessibili</span><small>configurate</small></div><div><MapPinned size={18} /><strong>{itineraryWalking || trip.walkingKm} km</strong><span>camminate totali</span><small>programma operativo</small></div></div></section>
    </div>
  );
}

function Participants({ trip, data, canManage, canViewSensitive }: { trip: Trip; data: TripOperationsData; canManage: boolean; canViewSensitive: boolean }) {
  const roomRequired = data.accommodations.length > 0;
  const seatRequired = data.vehicles.length > 0;
  return <section className="panel workspace-full"><div className="panel-header"><div><p className="eyebrow">{data.participants.length} iscritti</p><h2>Partecipanti del viaggio</h2></div>{canManage ? <Link className="button button-primary" href={`/viaggi/${trip.id}/logistica?section=participants`}><Settings2 size={15} /> Gestisci partecipanti</Link> : null}</div><div className="mini-list">{data.participants.length ? data.participants.map((participant) => <div className="mini-list-row" key={participant.registrationId}><span className="table-avatar">{participant.initials}</span><span><strong>{participant.name}</strong><small>{participant.group}</small></span><span><strong>{participant.room ?? (roomRequired ? "Camera mancante" : "Camera non prevista")}</strong><small>{participant.seat ?? (seatRequired ? "Posto mancante" : "Posto non previsto")}</small></span>{canViewSensitive ? <span>{participant.dietary.length ? participant.dietary.join(", ") : "Nessuna esigenza"}</span> : null}<StatusBadge label={participant.readinessStatus} /></div>) : <div className="empty-inline">Nessun partecipante iscritto.</div>}</div></section>;
}

function RoomsBoard({ trip, data, canManage }: { trip: Trip; data: TripOperationsData; canManage: boolean }) {
  const roomsConfigured = data.rooms.length > 0;
  const unassigned = roomsConfigured ? data.participants.filter((participant) => !participant.room) : [];
  const assignmentMessage = roomsConfigured ? "Tutte le persone sono assegnate." : "Configura prima struttura e camere.";
  return <div className="workspace-grid room-workspace"><section className="panel unassigned-panel"><div className="panel-header"><div><p className="eyebrow">{unassigned.length} persone</p><h2>Da assegnare</h2></div><Users size={19} /></div>{unassigned.length ? unassigned.map((participant) => <div className="draggable-person" key={participant.registrationId}><span>{participant.initials}</span><p><strong>{participant.name}</strong><small>{participant.roomPreference}</small></p></div>) : <div className="empty-inline">{assignmentMessage}</div>}</section><section className="panel panel-span-2"><div className="panel-header"><div><p className="eyebrow">{data.accommodations.length} strutture</p><h2>Camere del viaggio</h2></div>{canManage ? <Link className="button button-secondary" href={`/viaggi/${trip.id}/logistica?section=rooms`}><Settings2 size={15} /> Gestisci camere</Link> : null}</div><div className="room-grid">{data.rooms.length ? data.rooms.map((room) => <div className={cn("room-card", room.guests.length >= room.capacity && "room-full")} key={room.id}><div><span><BedDouble size={16} /> {room.accommodationName} · {room.number}</span><StatusBadge label={room.isAccessible ? "Accessibile" : room.type} /></div><p>{room.guests.map((guest) => <strong key={guest.registrationId}>{guest.name}</strong>)}</p><small>{room.guests.length}/{room.capacity} posti · piano {room.floor}</small></div>) : <div className="empty-inline">Nessuna camera configurata.</div>}</div></section></div>;
}

function CoachBoard({ trip, data, canManage }: { trip: Trip; data: TripOperationsData; canManage: boolean }) {
  return <section className="panel workspace-full"><div className="panel-header"><div><p className="eyebrow">{data.vehicles.length} mezzi</p><h2>Posti sui mezzi</h2></div>{canManage ? <Link className="button button-secondary" href={`/viaggi/${trip.id}/logistica?section=transport`}><Settings2 size={15} /> Gestisci trasporti</Link> : null}</div>{data.vehicles.length ? data.vehicles.map((vehicle) => <div className="coach-layout" key={vehicle.id}><div className="coach-front"><span>{vehicle.name}</span><BusFront size={28} /></div><div className="seat-grid">{vehicle.seats.map((seat) => <div className={cn("seat", seat.passenger && "seat-occupied", seat.isAccessible && "seat-accessible")} key={seat.id} title={seat.passenger ?? (seat.isReserved ? "Riservato" : "Posto libero")}><strong>{seat.label}</strong><small>{seat.passenger?.split(" ")[0] ?? (seat.isReserved ? "Riservato" : "Libero")}</small></div>)}</div></div>) : <div className="empty-inline">Nessun mezzo configurato.</div>}</section>;
}

function Schedule({ trip, data, canManage }: { trip: Trip; data: TripOperationsData; canManage: boolean }) {
  const walking = data.itinerary.reduce((sum, item) => sum + item.walkingKm, 0);
  return <section className="panel workspace-full"><div className="panel-header"><div><p className="eyebrow">{data.itinerary.length} attività</p><h2>Programma del viaggio</h2></div>{canManage ? <Link className="button button-primary" href={`/viaggi/${trip.id}/logistica?section=schedule`}><Settings2 size={15} /> Gestisci programma</Link> : null}</div><div className="timeline">{data.itinerary.length ? data.itinerary.map((item) => <div className="timeline-item" key={item.id}><time>{new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.startsAt))}</time><span className={`timeline-dot timeline-${item.type}`} /><div><strong>{item.title}</strong><p>{[item.location, item.details, item.walkingKm ? `${item.walkingKm} km` : ""].filter(Boolean).join(" · ")}</p></div></div>) : <div className="empty-inline">Programma ancora vuoto.</div>}</div><div className="timeline-footer"><Clock3 size={15} /> {walking} km a piedi pianificati · viaggio dal {formatDate(trip.startDate)} al {formatDate(trip.endDate)}</div></section>;
}

function Payments({ trip, data, canRecord }: { trip: Trip; data: TripParticipant[]; canRecord: boolean }) {
  const collected = data.reduce((sum, participant) => sum + participant.paid, 0);
  const expected = data.reduce((sum, participant) => sum + participant.agreed, 0);
  const paid = data.filter((participant) => paymentStatus(participant) === "Pagato").length;
  const partial = data.filter((participant) => paymentStatus(participant) === "Parziale").length;
  const open = data.filter((participant) => paymentStatus(participant) === "Da pagare").length;
  return <div className="workspace-grid"><section className="panel panel-span-2"><div className="panel-header"><div><p className="eyebrow">Incassi</p><h2>Situazione partecipanti</h2></div><span className="readiness">{percentage(collected, expected)}%</span></div><div className="large-progress"><span style={{ width: `${percentage(collected, expected)}%` }} /></div><div className="payment-headline"><strong>{formatCurrency(collected)}</strong><span>incassati su {formatCurrency(expected)}</span></div><div className="mini-list compact-list">{data.map((participant) => { const remaining = Math.max(0, participant.agreed - participant.paid); return <div className="mini-list-row" key={participant.registrationId}><span className="table-avatar">{participant.initials}</span><span><strong>{participant.name}</strong><small>{participant.group}</small></span><span><strong>{formatCurrency(participant.paid)}</strong><small>su {formatCurrency(participant.agreed)}</small></span><StatusBadge label={paymentStatus(participant)} />{canRecord && remaining > 0 ? <Link className="button button-primary context-payment-action" href={`/pagamenti/nuovo?registrationId=${participant.registrationId}&returnTo=${encodeURIComponent(`/viaggi/${trip.id}?tab=Pagamenti`)}`}><ReceiptText size={14} /> Salda {formatCurrency(remaining)}</Link> : <span className="context-payment-complete">Saldato</span>}</div>; })}</div></section><section className="panel"><div className="panel-header"><div><p className="eyebrow">Riepilogo</p><h2>Stato quote</h2></div><CircleDollarSign size={20} /></div><div className="payment-summary"><span><CheckCircle2 size={16} />Pagati<strong>{paid}</strong></span><span><Clock3 size={16} />Parziali<strong>{partial}</strong></span><span><AlertTriangle size={16} />Da pagare<strong>{open}</strong></span></div>{canRecord ? <Link className="button button-primary" href={`/pagamenti/nuovo?returnTo=${encodeURIComponent(`/viaggi/${trip.id}?tab=Pagamenti`)}`}>Registra pagamento</Link> : null}</section></div>;
}
