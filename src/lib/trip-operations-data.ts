import "server-only";

import { createClient } from "./supabase/server";

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
}

function row(value: unknown): Row | undefined {
  return rows(value)[0] ?? (value && typeof value === "object" ? value as Row : undefined);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type TripParticipant = {
  registrationId: string;
  pilgrimId: string;
  name: string;
  initials: string;
  group: string;
  groupId: string | null;
  status: string;
  roomPreference: string;
  dietary: string[];
  mobility: string;
  room: string | null;
  seat: string | null;
  agreed: number;
  paid: number;
};

export type TripRoom = {
  id: string;
  accommodationId: string;
  accommodationName: string;
  number: string;
  type: string;
  capacity: number;
  floor: string;
  isAccessible: boolean;
  guests: Array<{ registrationId: string; name: string }>;
};

export type TripVehicle = {
  id: string;
  name: string;
  type: string;
  operatorName: string;
  capacity: number;
  seats: Array<{ id: string; label: string; isAccessible: boolean; isReserved: boolean; registrationId: string | null; passenger: string | null }>;
};

export type TripItineraryItem = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  type: string;
  title: string;
  details: string;
  location: string;
  walkingKm: number;
  difficulty: string;
  accessibleAlternative: string;
};

export type TripOperationsData = {
  participants: TripParticipant[];
  rooms: TripRoom[];
  accommodations: Array<{ id: string; name: string; city: string }>;
  vehicles: TripVehicle[];
  itinerary: TripItineraryItem[];
  availablePilgrims: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; leaderName: string; leaderPhone: string; meetingPoint: string }>;
};

export async function getTripOperationsData(tripId: string): Promise<TripOperationsData> {
  const empty: TripOperationsData = { participants: [], rooms: [], accommodations: [], vehicles: [], itinerary: [], availablePilgrims: [], groups: [] };
  const supabase = await createClient();
  if (!supabase) return empty;

  const [registrationsResult, accommodationsResult, vehiclesResult, itineraryResult, pilgrimsResult, groupsResult] = await Promise.all([
    supabase.from("registrations").select("id,pilgrim_id,group_id,status,agreed_price,room_preference,preferred_roommate,trip_groups(name),pilgrims(first_name,last_name,pilgrim_health_profiles(mobility,dietary_requirements,allergies)),payments(amount,status)").eq("trip_id", tripId).neq("status", "cancelled").order("created_at"),
    supabase.from("accommodations").select("id,name,city").eq("trip_id", tripId).order("name"),
    supabase.from("vehicles").select("id,name,vehicle_type,operator_name,capacity").eq("trip_id", tripId).order("name"),
    supabase.from("itinerary_items").select("id,starts_at,ends_at,item_type,title,details,location,walking_km,difficulty,accessible_alternative").eq("trip_id", tripId).order("starts_at"),
    supabase.from("pilgrims").select("id,first_name,last_name").is("archived_at", null).order("last_name"),
    supabase.from("trip_groups").select("id,name,leader_name,leader_phone,meeting_point").eq("trip_id", tripId).order("name"),
  ]);
  const firstError = [registrationsResult, accommodationsResult, vehiclesResult, itineraryResult, pilgrimsResult, groupsResult].find((result) => result.error)?.error;
  if (firstError) {
    console.error("getTripOperationsData base query failed", firstError.code);
    return empty;
  }

  const registrationRows = registrationsResult.data as unknown as Row[];
  const accommodationRows = accommodationsResult.data as unknown as Row[];
  const vehicleRows = vehiclesResult.data as unknown as Row[];
  const accommodationIds = accommodationRows.map((item) => text(item.id)).filter(Boolean);
  const vehicleIds = vehicleRows.map((item) => text(item.id)).filter(Boolean);
  const [roomsResult, seatsResult] = await Promise.all([
    accommodationIds.length ? supabase.from("rooms").select("id,accommodation_id,room_number,room_type,capacity,floor,is_accessible").in("accommodation_id", accommodationIds).order("room_number") : Promise.resolve({ data: [], error: null }),
    vehicleIds.length ? supabase.from("vehicle_seats").select("id,vehicle_id,seat_label,is_accessible,is_reserved").in("vehicle_id", vehicleIds).order("seat_label") : Promise.resolve({ data: [], error: null }),
  ]);
  if (roomsResult.error || seatsResult.error) {
    console.error("getTripOperationsData inventory query failed", roomsResult.error?.code ?? seatsResult.error?.code);
    return empty;
  }

  const roomRows = roomsResult.data as unknown as Row[];
  const seatRows = seatsResult.data as unknown as Row[];
  const roomIds = roomRows.map((item) => text(item.id)).filter(Boolean);
  const seatIds = seatRows.map((item) => text(item.id)).filter(Boolean);
  const [roomAssignmentsResult, seatAssignmentsResult] = await Promise.all([
    roomIds.length ? supabase.from("room_assignments").select("room_id,registration_id").in("room_id", roomIds) : Promise.resolve({ data: [], error: null }),
    seatIds.length ? supabase.from("seat_assignments").select("vehicle_seat_id,registration_id").in("vehicle_seat_id", seatIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (roomAssignmentsResult.error || seatAssignmentsResult.error) {
    console.error("getTripOperationsData assignment query failed", roomAssignmentsResult.error?.code ?? seatAssignmentsResult.error?.code);
    return empty;
  }

  const nameByRegistration = new Map<string, string>();
  const roomByRegistration = new Map<string, string>();
  const seatByRegistration = new Map<string, string>();
  const accommodationById = new Map(accommodationRows.map((item) => [text(item.id), text(item.name)]));
  const vehicleById = new Map(vehicleRows.map((item) => [text(item.id), text(item.name)]));
  const roomById = new Map(roomRows.map((item) => [text(item.id), item]));
  const seatById = new Map(seatRows.map((item) => [text(item.id), item]));

  for (const registration of registrationRows) {
    const pilgrim = row(registration.pilgrims);
    const name = `${text(pilgrim?.first_name)} ${text(pilgrim?.last_name)}`.trim() || "Pellegrino";
    nameByRegistration.set(text(registration.id), name);
  }
  for (const assignment of roomAssignmentsResult.data as unknown as Row[]) {
    const roomData = roomById.get(text(assignment.room_id));
    if (!roomData) continue;
    roomByRegistration.set(text(assignment.registration_id), `${accommodationById.get(text(roomData.accommodation_id)) ?? "Struttura"} · ${text(roomData.room_number)}`);
  }
  for (const assignment of seatAssignmentsResult.data as unknown as Row[]) {
    const seatData = seatById.get(text(assignment.vehicle_seat_id));
    if (!seatData) continue;
    seatByRegistration.set(text(assignment.registration_id), `${vehicleById.get(text(seatData.vehicle_id)) ?? "Mezzo"} · ${text(seatData.seat_label)}`);
  }

  const participants: TripParticipant[] = registrationRows.map((registration) => {
    const pilgrim = row(registration.pilgrims);
    const health = row(pilgrim?.pilgrim_health_profiles);
    const name = nameByRegistration.get(text(registration.id)) ?? "Pellegrino";
    const paid = rows(registration.payments).reduce((sum, payment) => sum + (["paid", "partial"].includes(text(payment.status)) ? numberValue(payment.amount) : text(payment.status) === "refunded" ? -numberValue(payment.amount) : 0), 0);
    return {
      registrationId: text(registration.id),
      pilgrimId: text(registration.pilgrim_id),
      name,
      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
      group: text(row(registration.trip_groups)?.name, "Nessun gruppo"),
      groupId: text(registration.group_id) || null,
      status: text(registration.status),
      roomPreference: text(registration.room_preference, "Nessuna preferenza"),
      dietary: [text(health?.dietary_requirements), text(health?.allergies)].filter(Boolean),
      mobility: text(health?.mobility, "independent"),
      room: roomByRegistration.get(text(registration.id)) ?? null,
      seat: seatByRegistration.get(text(registration.id)) ?? null,
      agreed: numberValue(registration.agreed_price),
      paid,
    };
  });
  const registeredPilgrimIds = new Set(participants.map((participant) => participant.pilgrimId));

  const roomsData: TripRoom[] = roomRows.map((roomData) => {
    const roomId = text(roomData.id);
    const guests = (roomAssignmentsResult.data as unknown as Row[])
      .filter((assignment) => text(assignment.room_id) === roomId)
      .map((assignment) => ({ registrationId: text(assignment.registration_id), name: nameByRegistration.get(text(assignment.registration_id)) ?? "Pellegrino" }));
    return {
      id: roomId,
      accommodationId: text(roomData.accommodation_id),
      accommodationName: accommodationById.get(text(roomData.accommodation_id)) ?? "Struttura",
      number: text(roomData.room_number),
      type: text(roomData.room_type),
      capacity: numberValue(roomData.capacity),
      floor: text(roomData.floor, "—"),
      isAccessible: roomData.is_accessible === true,
      guests,
    };
  });

  const vehicles: TripVehicle[] = vehicleRows.map((vehicleData) => {
    const vehicleId = text(vehicleData.id);
    return {
      id: vehicleId,
      name: text(vehicleData.name),
      type: text(vehicleData.vehicle_type),
      operatorName: text(vehicleData.operator_name, "Non indicato"),
      capacity: numberValue(vehicleData.capacity),
      seats: seatRows.filter((seat) => text(seat.vehicle_id) === vehicleId).map((seat) => {
        const assignment = (seatAssignmentsResult.data as unknown as Row[]).find((item) => text(item.vehicle_seat_id) === text(seat.id));
        const registrationId = assignment ? text(assignment.registration_id) : null;
        return { id: text(seat.id), label: text(seat.seat_label), isAccessible: seat.is_accessible === true, isReserved: seat.is_reserved === true, registrationId, passenger: registrationId ? nameByRegistration.get(registrationId) ?? "Pellegrino" : null };
      }),
    };
  });

  return {
    participants,
    rooms: roomsData,
    accommodations: accommodationRows.map((item) => ({ id: text(item.id), name: text(item.name), city: text(item.city) })),
    vehicles,
    itinerary: (itineraryResult.data as unknown as Row[]).map((item) => ({ id: text(item.id), startsAt: text(item.starts_at), endsAt: text(item.ends_at) || null, type: text(item.item_type), title: text(item.title), details: text(item.details), location: text(item.location), walkingKm: numberValue(item.walking_km), difficulty: text(item.difficulty), accessibleAlternative: text(item.accessible_alternative) })),
    availablePilgrims: (pilgrimsResult.data as unknown as Row[]).filter((item) => !registeredPilgrimIds.has(text(item.id))).map((item) => ({ id: text(item.id), name: `${text(item.first_name)} ${text(item.last_name)}`.trim() })),
    groups: (groupsResult.data as unknown as Row[]).map((item) => ({ id: text(item.id), name: text(item.name), leaderName: text(item.leader_name), leaderPhone: text(item.leader_phone), meetingPoint: text(item.meeting_point) })),
  };
}
