"use client";

import {
  AlertTriangle,
  BedDouble,
  BusFront,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Footprints,
  Hotel,
  MapPinned,
  Plus,
  Salad,
  Users,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { coachSeats, itinerary, pilgrims, rooms } from "@/lib/demo-data";
import type { Trip } from "@/lib/types";
import { cn, formatCurrency, percentage } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const tabs = ["Panoramica", "Partecipanti", "Camere", "Pullman", "Programma", "Pagamenti"] as const;
type Tab = (typeof tabs)[number];

export function TripWorkspace({ trip }: { trip: Trip }) {
  const [active, setActive] = useState<Tab>("Panoramica");
  const tripPilgrims = pilgrims.filter((pilgrim) => pilgrim.tripId === trip.id);

  return (
    <div className="workspace">
      <div className="workspace-tabs" role="tablist" aria-label="Sezioni viaggio">
        {tabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={active === tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}</button>
        ))}
      </div>
      {active === "Panoramica" ? <Overview trip={trip} /> : null}
      {active === "Partecipanti" ? <Participants count={trip.participants} data={tripPilgrims} /> : null}
      {active === "Camere" ? <RoomsBoard /> : null}
      {active === "Pullman" ? <CoachBoard /> : null}
      {active === "Programma" ? <Schedule /> : null}
      {active === "Pagamenti" ? <Payments trip={trip} data={tripPilgrims} /> : null}
    </div>
  );
}

function Overview({ trip }: { trip: Trip }) {
  const tasks = [
    { icon: FileText, title: "Documenti mancanti", value: trip.checklist.documents, tone: "rose" },
    { icon: BedDouble, title: "Camere da assegnare", value: trip.checklist.rooms, tone: "violet" },
    { icon: BusFront, title: "Posti da assegnare", value: trip.checklist.seats, tone: "blue" },
    { icon: CircleDollarSign, title: "Saldi aperti", value: trip.checklist.balances, tone: "amber" },
  ];
  return (
    <div className="workspace-grid">
      <section className="panel panel-span-2">
        <div className="panel-header"><div><p className="eyebrow">Stato operativo</p><h2>Pronto per la partenza</h2></div><span className="readiness">78%</span></div>
        <div className="large-progress"><span style={{ width: "78%" }} /></div>
        <div className="task-grid">
          {tasks.map(({ icon: Icon, title, value, tone }) => (
            <div className="task-tile" key={title}><span className={`alert-icon alert-icon-${tone}`}><Icon size={17} /></span><strong>{value}</strong><small>{title}</small></div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Capienza</p><h2>Partecipanti</h2></div><Users size={20} /></div>
        <div className="capacity-donut" style={{ "--progress": `${percentage(trip.participants, trip.capacity) * 3.6}deg` } as CSSProperties}>
          <span><strong>{trip.participants}</strong><small>su {trip.capacity}</small></span>
        </div>
        <div className="legend-row"><span><i className="dot dot-blue" /> Confermati 118</span><span><i className="dot dot-amber" /> Attesa 8</span></div>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Oggi</p><h2>Prossime scadenze</h2></div><CalendarDays size={20} /></div>
        <div className="deadline-list">
          <span><b>08 AGO</b><p><strong>Conferma camere Hotel Alba</strong><small>Mancano 5 giorni</small></p></span>
          <span><b>15 AGO</b><p><strong>Secondo acconto pullman</strong><small>€ 4.800</small></p></span>
          <span><b>22 AGO</b><p><strong>Invio rooming list</strong><small>Hotel Alba e Miramont</small></p></span>
        </div>
      </section>
      <section className="panel panel-span-2">
        <div className="panel-header"><div><p className="eyebrow">Operatività</p><h2>Esigenze da presidiare</h2></div><AlertTriangle size={20} /></div>
        <div className="needs-grid">
          <div><Salad size={18} /><strong>11</strong><span>menu speciali</span><small>2 allergie severe</small></div>
          <div><Footprints size={18} /><strong>7</strong><span>mobilità ridotta</span><small>4 percorsi alternativi</small></div>
          <div><Hotel size={18} /><strong>2</strong><span>camere accessibili</span><small>1 ancora disponibile</small></div>
          <div><MapPinned size={18} /><strong>{trip.walkingKm} km</strong><span>camminate totali</span><small>Difficoltà massima: media</small></div>
        </div>
      </section>
    </div>
  );
}

function Participants({ data, count }: { data: typeof pilgrims; count: number }) {
  return (
    <section className="panel workspace-full">
      <div className="panel-header"><div><p className="eyebrow">{count} iscritti</p><h2>Partecipanti del viaggio</h2></div><button className="button button-primary"><Plus size={15} /> Iscrivi pellegrino</button></div>
      <div className="mini-list">
        {data.map((pilgrim) => (
          <div className="mini-list-row" key={pilgrim.id}>
            <span className="table-avatar">{pilgrim.initials}</span>
            <span><strong>{pilgrim.name}</strong><small>{pilgrim.group}</small></span>
            <span><strong>{pilgrim.room ?? "Camera mancante"}</strong><small>{pilgrim.coachSeat ?? "Posto mancante"}</small></span>
            <span>{pilgrim.dietary.length ? pilgrim.dietary.join(", ") : "Nessuna esigenza"}</span>
            <StatusBadge label={pilgrim.status} />
          </div>
        ))}
        <div className="demo-more">In produzione saranno mostrati tutti i {count} partecipanti.</div>
      </div>
    </section>
  );
}

function RoomsBoard() {
  return (
    <div className="workspace-grid room-workspace">
      <section className="panel unassigned-panel">
        <div className="panel-header"><div><p className="eyebrow">6 persone</p><h2>Da assegnare</h2></div><Users size={19} /></div>
        {["Giuseppe Marino", "Mario Fontana", "Teresa Galli", "Paola Ricci"].map((name) => <div className="draggable-person" key={name}><span>{name.split(" ").map((part) => part[0]).join("")}</span><p><strong>{name}</strong><small>Doppia · stesso gruppo</small></p></div>)}
      </section>
      <section className="panel panel-span-2">
        <div className="panel-header"><div><p className="eyebrow">Hotel Alba · Piano 2 e 3</p><h2>Rooming board</h2></div><button className="button button-secondary"><Plus size={15} /> Aggiungi camera</button></div>
        <div className="room-grid">
          {rooms.map((room) => (
            <div className={cn("room-card", room.guests.length >= room.capacity && "room-full")} key={room.id}>
              <div><span><BedDouble size={16} /> {room.number}</span><StatusBadge label={room.type} /></div>
              <p>{room.guests.map((guest) => <strong key={guest}>{guest}</strong>)}</p>
              <small>{room.guests.length}/{room.capacity} posti · piano {room.floor}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CoachBoard() {
  return (
    <section className="panel workspace-full">
      <div className="panel-header"><div><p className="eyebrow">Pullman 1 · Bologna → Lourdes</p><h2>Assegnazione posti</h2></div><div className="legend-row"><span><i className="dot dot-blue" /> Occupato</span><span><i className="dot dot-amber" /> Assistenza</span></div></div>
      <div className="coach-layout">
        <div className="coach-front"><span>Autista</span><BusFront size={28} /></div>
        <div className="seat-grid">
          {coachSeats.map((seat, index) => (
            <div className={cn("seat", seat.passenger && "seat-occupied", seat.accessibility && "seat-accessible", index % 4 === 1 && "seat-aisle")} key={seat.number} title={seat.passenger ?? "Posto libero"}>
              <strong>{seat.number}</strong><small>{seat.passenger?.split(" ")[0] ?? "Libero"}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Schedule() {
  return (
    <section className="panel workspace-full">
      <div className="panel-header"><div><p className="eyebrow">Giorno 1 · Giovedì 10 settembre</p><h2>Programma operativo</h2></div><button className="button button-primary"><Plus size={15} /> Attività</button></div>
      <div className="timeline">
        {itinerary.map((item) => (
          <div className="timeline-item" key={`${item.time}-${item.title}`}>
            <time>{item.time}</time><span className={`timeline-dot timeline-${item.type}`} />
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
          </div>
        ))}
      </div>
      <div className="timeline-footer"><Clock3 size={15} /> Durata operativa prevista: 16 ore · 2.4 km a piedi</div>
    </section>
  );
}

function Payments({ trip, data }: { trip: Trip; data: typeof pilgrims }) {
  return (
    <div className="workspace-grid">
      <section className="panel panel-span-2">
        <div className="panel-header"><div><p className="eyebrow">Incassi</p><h2>Situazione partecipanti</h2></div><span className="readiness">{percentage(trip.collected, trip.revenue)}%</span></div>
        <div className="large-progress"><span style={{ width: `${percentage(trip.collected, trip.revenue)}%` }} /></div>
        <div className="payment-headline"><strong>{formatCurrency(trip.collected)}</strong><span>incassati su {formatCurrency(trip.revenue)}</span></div>
        <div className="mini-list compact-list">
          {data.map((pilgrim) => <div className="mini-list-row" key={pilgrim.id}><span className="table-avatar">{pilgrim.initials}</span><span><strong>{pilgrim.name}</strong><small>{pilgrim.group}</small></span><span><strong>{formatCurrency(pilgrim.paid)}</strong><small>su {formatCurrency(pilgrim.total)}</small></span><StatusBadge label={pilgrim.paymentStatus} /></div>)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Riepilogo</p><h2>Stato quote</h2></div><CircleDollarSign size={20} /></div>
        <div className="payment-summary"><span><CheckCircle2 size={16} />Pagati<strong>81</strong></span><span><Clock3 size={16} />Parziali<strong>22</strong></span><span><AlertTriangle size={16} />Scaduti<strong>8</strong></span></div>
      </section>
    </div>
  );
}
