import "server-only";

import { pilgrims as demoPilgrims, trips as demoTrips } from "./demo-data";
import { createClient } from "./supabase/server";
import type { MobilityLevel, PaymentStatus, Pilgrim, PilgrimStatus, Trip, TripStatus } from "./types";

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
  return typeof value === "number" ? value : Number(value) || 0;
}

function tripStatus(value: unknown): TripStatus {
  const statuses: Record<string, TripStatus> = { draft: "Bozza", open: "Aperto", confirmed: "Confermato", full: "Completo", completed: "Concluso", cancelled: "Concluso" };
  return statuses[text(value)] ?? "Bozza";
}

function pilgrimStatus(value: unknown): PilgrimStatus {
  const statuses: Record<string, PilgrimStatus> = { confirmed: "Confermato", pending: "In attesa", incomplete: "Da completare", cancelled: "In attesa" };
  return statuses[text(value)] ?? "Da completare";
}

function mobility(value: unknown): MobilityLevel {
  const levels: Record<string, MobilityLevel> = { independent: "Autonomo", light_support: "Supporto leggero", assistance: "Assistenza" };
  return levels[text(value)] ?? "Autonomo";
}

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  if (!supabase) return demoTrips;

  const { data, error } = await supabase
    .from("trips")
    .select("id,code,title,destination,starts_on,ends_on,status,capacity,base_price,planned_walking_km,registrations(id,agreed_price,payments(amount,status)),accommodations(id),vehicles(id)")
    .order("starts_on", { ascending: true });
  if (error) return demoTrips;

  const tones: Trip["coverTone"][] = ["blue", "amber", "violet", "teal"];
  return (data as unknown as Row[]).map((item, index) => {
    const registrations = rows(item.registrations);
    const collected = registrations.reduce((sum, registration) => sum + rows(registration.payments).filter((payment) => text(payment.status) === "paid").reduce((paymentSum, payment) => paymentSum + numberValue(payment.amount), 0), 0);
    const revenue = registrations.reduce((sum, registration) => sum + numberValue(registration.agreed_price), 0);
    return {
      id: text(item.id), code: text(item.code), title: text(item.title), destination: text(item.destination),
      startDate: text(item.starts_on), endDate: text(item.ends_on), status: tripStatus(item.status),
      participants: registrations.length, capacity: numberValue(item.capacity), revenue, collected,
      hotels: rows(item.accommodations).length, coaches: rows(item.vehicles).length,
      walkingKm: numberValue(item.planned_walking_km), leader: "Da assegnare", coverTone: tones[index % tones.length],
      checklist: { documents: 0, rooms: 0, seats: 0, balances: Math.max(0, registrations.filter((registration) => rows(registration.payments).reduce((sum, payment) => sum + numberValue(payment.amount), 0) < numberValue(registration.agreed_price)).length) },
    };
  });
}

export async function getPilgrims(): Promise<Pilgrim[]> {
  const supabase = await createClient();
  if (!supabase) return demoPilgrims;

  const { data, error } = await supabase
    .from("pilgrims")
    .select("id,first_name,last_name,email,phone,birth_date,city,document_expiry,pilgrim_health_profiles(mobility,indicative_walking_km,dietary_requirements,allergies),emergency_contacts(name,phone,is_primary),registrations(id,trip_id,status,agreed_price,notes,trips(title),payments(amount,status))")
    .is("archived_at", null)
    .order("last_name", { ascending: true });
  if (error) return demoPilgrims;

  return (data as unknown as Row[]).map((item) => {
    const firstName = text(item.first_name);
    const lastName = text(item.last_name);
    const registration = rows(item.registrations)[0];
    const trip = row(registration?.trips);
    const health = row(item.pilgrim_health_profiles);
    const contact = rows(item.emergency_contacts).find((entry) => entry.is_primary === true) ?? rows(item.emergency_contacts)[0];
    const paymentRows = rows(registration?.payments);
    const paid = paymentRows.filter((payment) => text(payment.status) === "paid").reduce((sum, payment) => sum + numberValue(payment.amount), 0);
    const total = numberValue(registration?.agreed_price);
    let paymentStatus: PaymentStatus = "Da pagare";
    if (total > 0 && paid >= total) paymentStatus = "Pagato";
    else if (paid > 0) paymentStatus = "Parziale";
    const needs = [!registration && "Viaggio", !item.document_expiry && "Documento", total > paid && "Saldo"].filter((entry): entry is string => Boolean(entry));
    const dietary = [text(health?.dietary_requirements), text(health?.allergies)].filter(Boolean);
    return {
      id: text(item.id), initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(), name: `${firstName} ${lastName}`.trim(),
      email: text(item.email, "Email non indicata"), phone: text(item.phone, "Telefono non indicato"), birthDate: text(item.birth_date, "1900-01-01"), city: text(item.city, "—"),
      group: text(registration?.notes, "Nessun gruppo"), tripId: text(registration?.trip_id), tripName: text(trip?.title, "Non iscritto"), status: pilgrimStatus(registration?.status),
      paymentStatus, paid, total, room: null, coachSeat: null, dietary, mobility: mobility(health?.mobility), walkingKm: numberValue(health?.indicative_walking_km),
      missingItems: needs, emergencyContact: contact ? `${text(contact.name)} · ${text(contact.phone)}` : "Non indicato", documentExpiry: text(item.document_expiry, "1900-01-01"),
    };
  });
}

export async function getCurrentMember() {
  const fallback = { name: "Federico", role: "Amministratore", initials: "FG" };
  const supabase = await createClient();
  if (!supabase) return fallback;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return fallback;
  const { data, error } = await supabase
    .from("organization_members")
    .select("display_name,role")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error || !data) return fallback;
  const member = data as unknown as Row;
  const name = text(member.display_name, authData.user.email ?? "Utente");
  const roles: Record<string, string> = { admin: "Amministratore", manager: "Responsabile", operator: "Operatore", guide: "Accompagnatore", accountant: "Contabilità", viewer: "Lettore" };
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  return { name, role: roles[text(member.role)] ?? "Utente", initials };
}
