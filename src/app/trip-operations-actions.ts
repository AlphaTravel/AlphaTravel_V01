"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import { localDateTimeToIso, todayInTimeZone } from "@/lib/time";
import { accommodationOperationSchema, itineraryOperationSchema, registrationOperationSchema, roomAssignmentOperationSchema, roomOperationSchema, seatAssignmentOperationSchema, tripGroupOperationSchema, vehicleOperationSchema } from "@/lib/trip-operation-schemas";

export type TripOperationResult = { ok: boolean; message: string };

async function getOperatorContext() {
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "operator"].includes(member.roleKey)) return null;
  return { member, supabase };
}

function refreshTrip(tripId: string) {
  revalidatePath(`/viaggi/${tripId}`);
  revalidatePath(`/viaggi/${tripId}/logistica`);
  revalidatePath("/dashboard");
}

export async function registerPilgrimAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = registrationOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Dati dell’iscrizione non validi." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per iscrivere partecipanti." };
  const [tripResult, pilgrimResult, registrationsResult] = await Promise.all([
    context.supabase.from("trips").select("id,capacity,status,registration_deadline").eq("id", parsed.data.tripId).eq("organization_id", context.member.organizationId).single(),
    context.supabase.from("pilgrims").select("id").eq("id", parsed.data.pilgrimId).eq("organization_id", context.member.organizationId).is("archived_at", null).single(),
    context.supabase.from("registrations").select("id", { count: "exact", head: true }).eq("trip_id", parsed.data.tripId).neq("status", "cancelled"),
  ]);
  if (tripResult.error || pilgrimResult.error) return { ok: false, message: "Viaggio o pellegrino non disponibile." };
  if (["full", "completed", "cancelled"].includes(tripResult.data.status)) return { ok: false, message: "Le iscrizioni per questo viaggio sono chiuse." };
  if (tripResult.data.registration_deadline && tripResult.data.registration_deadline < todayInTimeZone()) return { ok: false, message: "La scadenza delle iscrizioni è già trascorsa." };
  if ((registrationsResult.count ?? 0) >= tripResult.data.capacity) return { ok: false, message: "La capienza del viaggio è già stata raggiunta." };
  if (parsed.data.groupId) {
    const { data: group, error: groupError } = await context.supabase.from("trip_groups").select("id,trip_id").eq("id", parsed.data.groupId).eq("organization_id", context.member.organizationId).single();
    if (groupError || group.trip_id !== parsed.data.tripId) return { ok: false, message: "Il gruppo non appartiene a questo viaggio." };
  }
  const { error } = await context.supabase.from("registrations").insert({ organization_id: context.member.organizationId, trip_id: parsed.data.tripId, pilgrim_id: parsed.data.pilgrimId, group_id: parsed.data.groupId || null, status: "pending", room_preference: parsed.data.roomPreference || null, agreed_price: parsed.data.agreedPrice, notes: parsed.data.notes || null });
  if (error) {
    console.error("registerPilgrimAction failed", error.code);
    return { ok: false, message: error.code === "23505" ? "Il pellegrino è già iscritto." : "Iscrizione non salvata." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Pellegrino iscritto." };
}

export async function addTripGroupAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = tripGroupOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Dati del gruppo non validi." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per gestire i gruppi." };
  const { data: trip, error: tripError } = await context.supabase.from("trips").select("id").eq("id", parsed.data.tripId).eq("organization_id", context.member.organizationId).single();
  if (tripError || !trip) return { ok: false, message: "Viaggio non disponibile." };
  const { error } = await context.supabase.from("trip_groups").insert({ organization_id: context.member.organizationId, trip_id: parsed.data.tripId, name: parsed.data.name, leader_name: parsed.data.leaderName || null, leader_phone: parsed.data.leaderPhone || null, meeting_point: parsed.data.meetingPoint || null, notes: parsed.data.notes || null });
  if (error) return { ok: false, message: error.code === "23505" ? "Esiste già un gruppo con questo nome." : "Gruppo non aggiunto." };
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Gruppo aggiunto." };
}

export async function addAccommodationAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = accommodationOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Dati della struttura non validi." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per gestire le strutture." };
  const { error } = await context.supabase.from("accommodations").insert({ organization_id: context.member.organizationId, trip_id: parsed.data.tripId, name: parsed.data.name, city: parsed.data.city || null, address: parsed.data.address || null, phone: parsed.data.phone || null, accessible_rooms: parsed.data.accessibleRooms });
  if (error) {
    console.error("addAccommodationAction failed", error.code);
    return { ok: false, message: "Struttura non aggiunta." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Struttura aggiunta." };
}

export async function addRoomAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = roomOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Dati della camera non validi." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per gestire le camere." };
  const { data: accommodation, error: accommodationError } = await context.supabase.from("accommodations").select("id,trip_id").eq("id", parsed.data.accommodationId).eq("organization_id", context.member.organizationId).single();
  if (accommodationError || accommodation.trip_id !== parsed.data.tripId) return { ok: false, message: "La struttura non appartiene a questo viaggio." };
  const { error } = await context.supabase.from("rooms").insert({ organization_id: context.member.organizationId, accommodation_id: parsed.data.accommodationId, room_number: parsed.data.roomNumber, room_type: parsed.data.roomType, capacity: parsed.data.capacity, floor: parsed.data.floor || null, is_accessible: parsed.data.accessible === "true" });
  if (error) {
    console.error("addRoomAction failed", error.code);
    return { ok: false, message: error.code === "23505" ? "Numero camera già presente nella struttura." : "Camera non aggiunta." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Camera aggiunta." };
}

export async function assignRoomAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = roomAssignmentOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Assegnazione camera non valida." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per assegnare camere." };
  const [roomResult, registrationResult] = await Promise.all([
    context.supabase.from("rooms").select("id,accommodation_id").eq("id", parsed.data.roomId).eq("organization_id", context.member.organizationId).single(),
    context.supabase.from("registrations").select("id,trip_id").eq("id", parsed.data.registrationId).eq("organization_id", context.member.organizationId).single(),
  ]);
  if (roomResult.error || registrationResult.error) return { ok: false, message: "Camera o iscrizione non disponibile." };
  const { data: accommodation, error: accommodationError } = await context.supabase.from("accommodations").select("trip_id").eq("id", roomResult.data.accommodation_id).single();
  if (accommodationError || accommodation.trip_id !== parsed.data.tripId || registrationResult.data.trip_id !== parsed.data.tripId) return { ok: false, message: "Camera e partecipante devono appartenere allo stesso viaggio." };
  const { error } = await context.supabase.from("room_assignments").upsert({ organization_id: context.member.organizationId, room_id: parsed.data.roomId, registration_id: parsed.data.registrationId }, { onConflict: "registration_id" });
  if (error) {
    console.error("assignRoomAction failed", error.code);
    return { ok: false, message: error.message.includes("capacity") ? "La camera ha già raggiunto la capienza." : "Camera non assegnata." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Camera assegnata." };
}

export async function addVehicleAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = vehicleOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Dati del mezzo non validi." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per gestire i mezzi." };
  const { data: vehicle, error: vehicleError } = await context.supabase.from("vehicles").insert({ organization_id: context.member.organizationId, trip_id: parsed.data.tripId, name: parsed.data.name, vehicle_type: parsed.data.vehicleType, operator_name: parsed.data.operatorName || null, plate_or_reference: parsed.data.reference || null, capacity: parsed.data.capacity }).select("id").single();
  if (vehicleError || !vehicle) {
    console.error("addVehicleAction failed", vehicleError?.code);
    return { ok: false, message: "Mezzo non aggiunto." };
  }
  const seats = Array.from({ length: parsed.data.capacity }, (_, index) => ({ organization_id: context.member.organizationId, vehicle_id: vehicle.id, seat_label: String(index + 1) }));
  const { error: seatsError } = await context.supabase.from("vehicle_seats").insert(seats);
  if (seatsError) {
    await context.supabase.from("vehicles").delete().eq("id", vehicle.id);
    console.error("addVehicleAction seats failed", seatsError.code);
    return { ok: false, message: "Mezzo non completato; nessun dato parziale è stato mantenuto." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Mezzo e posti aggiunti." };
}

export async function assignSeatAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = seatAssignmentOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Assegnazione posto non valida." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per assegnare posti." };
  const [seatResult, registrationResult] = await Promise.all([
    context.supabase.from("vehicle_seats").select("id,vehicle_id").eq("id", parsed.data.vehicleSeatId).eq("organization_id", context.member.organizationId).single(),
    context.supabase.from("registrations").select("id,trip_id").eq("id", parsed.data.registrationId).eq("organization_id", context.member.organizationId).single(),
  ]);
  const { data: targetSeat, error: seatError } = seatResult;
  if (seatError || !targetSeat) return { ok: false, message: "Posto non disponibile." };
  if (registrationResult.error) return { ok: false, message: "Iscrizione non disponibile." };
  const { data: vehicle, error: vehicleError } = await context.supabase.from("vehicles").select("trip_id").eq("id", targetSeat.vehicle_id).single();
  if (vehicleError || vehicle.trip_id !== parsed.data.tripId || registrationResult.data.trip_id !== parsed.data.tripId) return { ok: false, message: "Posto e partecipante devono appartenere allo stesso viaggio." };
  const { error: insertError } = await context.supabase.from("seat_assignments").upsert({ organization_id: context.member.organizationId, vehicle_seat_id: parsed.data.vehicleSeatId, registration_id: parsed.data.registrationId }, { onConflict: "registration_id" });
  if (insertError) {
    console.error("assignSeatAction failed", insertError.code);
    return { ok: false, message: insertError.code === "23505" ? "Il posto è già occupato." : "Posto non assegnato." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Posto assegnato." };
}

export async function addItineraryItemAction(formData: FormData): Promise<TripOperationResult> {
  const parsed = itineraryOperationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Attività non valida." };
  const context = await getOperatorContext();
  if (!context) return { ok: false, message: "Non hai i permessi per modificare il programma." };
  const { data: trip, error: tripError } = await context.supabase.from("trips").select("starts_on,ends_on").eq("id", parsed.data.tripId).eq("organization_id", context.member.organizationId).single();
  if (tripError || !trip) return { ok: false, message: "Viaggio non disponibile." };
  const startDay = parsed.data.startsAt.slice(0, 10);
  const endDay = (parsed.data.endsAt || parsed.data.startsAt).slice(0, 10);
  if (startDay < trip.starts_on || endDay > trip.ends_on) return { ok: false, message: "L’attività deve rientrare nelle date del viaggio." };
  const { error } = await context.supabase.from("itinerary_items").insert({ organization_id: context.member.organizationId, trip_id: parsed.data.tripId, starts_at: localDateTimeToIso(parsed.data.startsAt), ends_at: parsed.data.endsAt ? localDateTimeToIso(parsed.data.endsAt) : null, item_type: parsed.data.itemType, title: parsed.data.title, details: parsed.data.details || null, location: parsed.data.location || null, walking_km: parsed.data.walkingKm, difficulty: parsed.data.difficulty || null, accessible_alternative: parsed.data.accessibleAlternative || null });
  if (error) {
    console.error("addItineraryItemAction failed", error.code);
    return { ok: false, message: "Attività non aggiunta." };
  }
  refreshTrip(parsed.data.tripId);
  return { ok: true, message: "Attività aggiunta al programma." };
}
