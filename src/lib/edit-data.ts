import "server-only";

import { createClient } from "./supabase/server";

type Row = Record<string, unknown>;
function row(value: unknown): Row | undefined { return Array.isArray(value) ? value[0] as Row | undefined : value && typeof value === "object" ? value as Row : undefined; }
function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export type TripEditData = {
  id: string; title: string; code: string; destination: string; description: string; startDate: string; endDate: string;
  registrationDeadline: string; minimum: number; capacity: number; price: number; deposit: number; singleSupplement: number; balanceDeadline: string; walkingKm: number;
};

export type PilgrimEditData = {
  id: string; firstName: string; lastName: string; birthDate: string; birthPlace: string; nationality: string; fiscalCode: string; email: string; phone: string; address: string; city: string;
  emergencyName: string; emergencyPhone: string; mobility: string; walkingKm: number; dietary: string; allergies: string; healthNotes: string; healthConsent: boolean; operationalMessagesAllowed: boolean;
};

export async function getTripEditData(id: string): Promise<TripEditData | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("trips").select("id,title,code,destination,description,starts_on,ends_on,registration_deadline,minimum_participants,capacity,base_price,deposit_amount,single_room_supplement,balance_due_on,planned_walking_km").eq("id", id).single();
  if (error || !data) return null;
  const item = data as unknown as Row;
  return { id: text(item.id), title: text(item.title), code: text(item.code), destination: text(item.destination), description: text(item.description), startDate: text(item.starts_on), endDate: text(item.ends_on), registrationDeadline: text(item.registration_deadline), minimum: numberValue(item.minimum_participants), capacity: numberValue(item.capacity), price: numberValue(item.base_price), deposit: numberValue(item.deposit_amount), singleSupplement: numberValue(item.single_room_supplement), balanceDeadline: text(item.balance_due_on), walkingKm: numberValue(item.planned_walking_km) };
}

export async function getPilgrimEditData(id: string): Promise<PilgrimEditData | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("pilgrims").select("id,first_name,last_name,birth_date,birth_place,nationality,fiscal_code,email,phone,address,city,operational_messages_allowed,pilgrim_health_profiles(mobility,indicative_walking_km,dietary_requirements,allergies,assistance_notes,health_data_consent),emergency_contacts(name,phone,is_primary)").eq("id", id).single();
  if (error || !data) return null;
  const item = data as unknown as Row;
  const health = row(item.pilgrim_health_profiles);
  const contacts = Array.isArray(item.emergency_contacts) ? item.emergency_contacts as Row[] : [];
  const contact = contacts.find((entry) => entry.is_primary === true) ?? contacts[0];
  return { id: text(item.id), firstName: text(item.first_name), lastName: text(item.last_name), birthDate: text(item.birth_date), birthPlace: text(item.birth_place), nationality: text(item.nationality, "Italia"), fiscalCode: text(item.fiscal_code), email: text(item.email), phone: text(item.phone), address: text(item.address), city: text(item.city), emergencyName: text(contact?.name), emergencyPhone: text(contact?.phone), mobility: text(health?.mobility, "independent"), walkingKm: numberValue(health?.indicative_walking_km), dietary: text(health?.dietary_requirements), allergies: text(health?.allergies), healthNotes: text(health?.assistance_notes), healthConsent: health?.health_data_consent === true, operationalMessagesAllowed: item.operational_messages_allowed === true };
}
