"use client";

import { BedDouble, BusFront, CalendarDays, Hotel, LoaderCircle, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  addAccommodationAction,
  addItineraryItemAction,
  addTripGroupAction,
  addRoomAction,
  addVehicleAction,
  assignRoomAction,
  assignSeatAction,
  registerPilgrimAction,
  type TripOperationResult,
} from "@/app/trip-operations-actions";
import type { TripOperationsData } from "@/lib/trip-operations-data";
import type { Trip } from "@/lib/types";

type Action = (formData: FormData) => Promise<TripOperationResult>;

export function TripLogisticsManager({ trip, data }: { trip: Trip; data: TripOperationsData }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, key: string, action: Action) {
    event.preventDefault();
    setBusy(key);
    setMessage(null);
    const result = await action(new FormData(event.currentTarget));
    setBusy("");
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  const availableRooms = data.rooms.filter((room) => room.guests.length < room.capacity);
  const availableSeats = data.vehicles.flatMap((vehicle) => vehicle.seats.filter((seat) => !seat.passenger && !seat.isReserved).map((seat) => ({ ...seat, vehicleName: vehicle.name })));

  return (
    <div className="admin-sections">
      <div className="detail-nav"><Link href={`/viaggi/${trip.id}`}>← Torna al viaggio</Link></div>
      <header className="editor-heading"><div><p className="eyebrow">Logistica operativa</p><h1>{trip.title}</h1><p>Iscrizioni, strutture, camere, mezzi, posti e programma.</p></div></header>
      {message ? <div className={message.ok ? "success-banner" : "form-error form-error-block"}>{message.text}</div> : null}

      <form className="form-card" onSubmit={(event) => submit(event, "group", addTripGroupAction)}>
        <div className="form-card-title"><span><Users size={18} /></span><div><h2>Aggiungi gruppo</h2><p>Parrocchia, associazione o sottogruppo con referente e punto di ritrovo.</p></div></div>
        <input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Nome gruppo *</span><input name="name" minLength={2} maxLength={160} required /></label><label><span>Referente</span><input name="leaderName" maxLength={120} /></label><label><span>Telefono referente</span><input name="leaderPhone" type="tel" maxLength={40} /></label><label><span>Punto di ritrovo</span><input name="meetingPoint" maxLength={250} /></label><label className="form-span-2"><span>Note</span><textarea name="notes" rows={2} maxLength={1000} /></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "group"} type="submit">Aggiungi gruppo</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "registration", registerPilgrimAction)}>
        <div className="form-card-title"><span><UserPlus size={18} /></span><div><h2>Iscrivi un pellegrino esistente</h2><p>La stessa persona non può essere iscritta due volte allo stesso viaggio.</p></div></div>
        <input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Pellegrino *</span><select name="pilgrimId" defaultValue="" required><option value="" disabled>Seleziona</option>{data.availablePilgrims.map((pilgrim) => <option value={pilgrim.id} key={pilgrim.id}>{pilgrim.name}</option>)}</select></label><label><span>Quota concordata *</span><input name="agreedPrice" type="number" min="0" step="0.01" defaultValue={trip.basePrice ?? 0} required /></label><label><span>Gruppo</span><select name="groupId" defaultValue=""><option value="">Nessun gruppo</option>{data.groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label><span>Preferenza camera</span><select name="roomPreference" defaultValue=""><option value="">Nessuna</option><option value="single">Singola</option><option value="double">Doppia</option><option value="triple">Tripla</option><option value="accessible">Accessibile</option></select></label><label className="form-span-2"><span>Note</span><input name="notes" maxLength={1000} /></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "registration" || data.availablePilgrims.length === 0} type="submit">{busy === "registration" ? <LoaderCircle className="spin" size={15} /> : null} Iscrivi</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "accommodation", addAccommodationAction)}>
        <div className="form-card-title"><span><Hotel size={18} /></span><div><h2>Aggiungi struttura</h2><p>Hotel, casa religiosa o altra sistemazione.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Nome *</span><input name="name" minLength={2} maxLength={160} required /></label><label><span>Città</span><input name="city" maxLength={120} /></label><label><span>Indirizzo</span><input name="address" maxLength={250} /></label><label><span>Telefono</span><input name="phone" maxLength={40} /></label><label><span>Camere accessibili dichiarate</span><input name="accessibleRooms" type="number" min="0" defaultValue="0" required /></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "accommodation"} type="submit">Aggiungi struttura</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "room", addRoomAction)}>
        <div className="form-card-title"><span><BedDouble size={18} /></span><div><h2>Aggiungi camera</h2><p>La capienza viene protetta anche nel database.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Struttura *</span><select name="accommodationId" defaultValue="" required><option value="" disabled>Seleziona</option>{data.accommodations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>Numero camera *</span><input name="roomNumber" maxLength={40} required /></label><label><span>Tipo *</span><select name="roomType" defaultValue="double"><option value="single">Singola</option><option value="double">Doppia</option><option value="triple">Tripla</option><option value="quad">Quadrupla</option><option value="accessible">Accessibile</option><option value="other">Altro</option></select></label><label><span>Capienza *</span><input name="capacity" type="number" min="1" max="20" defaultValue="2" required /></label><label><span>Piano</span><input name="floor" maxLength={40} /></label><label><span>Accessibile</span><select name="accessible" defaultValue="false"><option value="false">No</option><option value="true">Sì</option></select></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "room" || data.accommodations.length === 0} type="submit">Aggiungi camera</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "room-assignment", assignRoomAction)}>
        <div className="form-card-title"><span><BedDouble size={18} /></span><div><h2>Assegna camera</h2><p>Una nuova assegnazione sostituisce quella precedente.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Partecipante *</span><select name="registrationId" defaultValue="" required><option value="" disabled>Seleziona</option>{data.participants.map((participant) => <option value={participant.registrationId} key={participant.registrationId}>{participant.name}{participant.room ? ` · ora ${participant.room}` : ""}</option>)}</select></label><label><span>Camera disponibile *</span><select name="roomId" defaultValue="" required><option value="" disabled>Seleziona</option>{availableRooms.map((room) => <option value={room.id} key={room.id}>{room.accommodationName} · {room.number} ({room.guests.length}/{room.capacity})</option>)}</select></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "room-assignment" || availableRooms.length === 0 || data.participants.length === 0} type="submit">Assegna camera</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "vehicle", addVehicleAction)}>
        <div className="form-card-title"><span><BusFront size={18} /></span><div><h2>Aggiungi mezzo</h2><p>I posti vengono creati automaticamente in base alla capienza.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Nome *</span><input name="name" placeholder="Pullman 1" maxLength={120} required /></label><label><span>Tipo *</span><select name="vehicleType" defaultValue="coach"><option value="coach">Pullman</option><option value="minibus">Minibus</option><option value="plane">Aereo</option><option value="train">Treno</option><option value="ship">Nave</option><option value="other">Altro</option></select></label><label><span>Fornitore</span><input name="operatorName" maxLength={120} /></label><label><span>Targa o riferimento</span><input name="reference" maxLength={120} /></label><label><span>Capienza *</span><input name="capacity" type="number" min="1" max="500" required /></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "vehicle"} type="submit">Aggiungi mezzo</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "seat-assignment", assignSeatAction)}>
        <div className="form-card-title"><span><BusFront size={18} /></span><div><h2>Assegna posto</h2><p>Il sistema impedisce che lo stesso posto venga assegnato due volte.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Partecipante *</span><select name="registrationId" defaultValue="" required><option value="" disabled>Seleziona</option>{data.participants.map((participant) => <option value={participant.registrationId} key={participant.registrationId}>{participant.name}{participant.seat ? ` · ora ${participant.seat}` : ""}</option>)}</select></label><label><span>Posto libero *</span><select name="vehicleSeatId" defaultValue="" required><option value="" disabled>Seleziona</option>{availableSeats.map((seat) => <option value={seat.id} key={seat.id}>{seat.vehicleName} · {seat.label}</option>)}</select></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "seat-assignment" || availableSeats.length === 0 || data.participants.length === 0} type="submit">Assegna posto</button></div>
      </form>

      <form className="form-card" onSubmit={(event) => submit(event, "itinerary", addItineraryItemAction)}>
        <div className="form-card-title"><span><CalendarDays size={18} /></span><div><h2>Aggiungi attività</h2><p>Orari, camminate, difficoltà e alternativa accessibile.</p></div></div><input type="hidden" name="tripId" value={trip.id} />
        <div className="form-grid"><label><span>Inizio *</span><input name="startsAt" type="datetime-local" required /></label><label><span>Fine</span><input name="endsAt" type="datetime-local" /></label><label><span>Tipo *</span><select name="itemType" defaultValue="event"><option value="travel">Trasferimento</option><option value="walk">Camminata</option><option value="meal">Pasto</option><option value="event">Attività</option><option value="hotel">Hotel</option><option value="free_time">Tempo libero</option><option value="other">Altro</option></select></label><label><span>Titolo *</span><input name="title" minLength={2} maxLength={160} required /></label><label><span>Luogo</span><input name="location" maxLength={160} /></label><label><span>Cammino (km)</span><input name="walkingKm" type="number" min="0" max="1000" step="0.01" defaultValue="0" required /></label><label><span>Difficoltà</span><select name="difficulty" defaultValue=""><option value="">Non applicabile</option><option value="easy">Facile</option><option value="medium">Media</option><option value="hard">Impegnativa</option></select></label><label className="form-span-2"><span>Dettagli</span><textarea name="details" rows={3} maxLength={1000} /></label><label className="form-span-2"><span>Alternativa accessibile</span><textarea name="accessibleAlternative" rows={2} maxLength={1000} /></label></div>
        <div className="settings-actions"><button className="button button-primary" disabled={busy === "itinerary"} type="submit">Aggiungi attività</button></div>
      </form>
    </div>
  );
}
