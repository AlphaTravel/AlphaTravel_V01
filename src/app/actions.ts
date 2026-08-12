"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import { createTripSchema, updateTripSchema } from "@/lib/trip-schemas";

export type FormActionResult = { ok: boolean; id?: string; message: string };

const optionalText = z.string().trim().max(1000).optional().default("");
const pilgrimSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: z.iso.date(),
  birthPlace: optionalText,
  nationality: z.string().trim().min(2).max(80),
  fiscalCode: z.string().trim().max(24).optional().default(""),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().max(250).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  emergencyName: z.string().trim().min(2).max(120),
  emergencyPhone: z.string().trim().min(5).max(40),
  mobility: z.enum(["independent", "light_support", "assistance"]),
  walkingKm: z.coerce.number().min(0).max(100),
  dietary: optionalText,
  allergies: optionalText,
  healthNotes: optionalText,
  tripId: z.union([z.uuid(), z.literal("")]),
  groupName: z.string().trim().max(160).optional().default(""),
  roomPreference: z.enum(["", "single", "double", "triple", "accessible"]),
  roommate: z.string().trim().max(160).optional().default(""),
  privacyNoticeVersion: z.string().trim().max(30).default("v1"),
  privacyDelivered: z.literal(true),
  healthConsent: z.boolean().default(false),
  operationalMessagesAllowed: z.boolean().default(false),
});

const updatePilgrimSchema = pilgrimSchema.extend({ pilgrimId: z.uuid() });

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function createPilgrimAction(formData: FormData): Promise<FormActionResult> {
  const parsed = pilgrimSchema.safeParse({
    ...formValues(formData),
    privacyDelivered: checkbox(formData, "privacyDelivered"),
    healthConsent: checkbox(formData, "healthConsent"),
    operationalMessagesAllowed: checkbox(formData, "operationalMessagesAllowed"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };

  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "operator"].includes(member.roleKey)) return { ok: false, message: "Non hai i permessi per creare pellegrini." };
  const { data, error } = await supabase.rpc("create_pilgrim_with_details", { payload: parsed.data });
  if (error) {
    console.error("create_pilgrim_with_details failed", error.code);
    return { ok: false, message: "Salvataggio non riuscito. Verifica permessi e campi obbligatori." };
  }
  revalidatePath("/pellegrini");
  revalidatePath("/dashboard");
  return { ok: true, id: String(data), message: "Pellegrino salvato." };
}

export async function createTripAction(formData: FormData): Promise<FormActionResult> {
  const parsed = createTripSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };

  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "operator"].includes(member.roleKey)) return { ok: false, message: "Non hai i permessi per creare viaggi." };
  const { data, error } = await supabase.rpc("create_trip", { payload: parsed.data });
  if (error) {
    console.error("create_trip failed", error.code);
    return { ok: false, message: "Salvataggio non riuscito. Il codice potrebbe essere già utilizzato." };
  }
  revalidatePath("/viaggi");
  revalidatePath("/dashboard");
  return { ok: true, id: String(data), message: "Viaggio creato." };
}

export async function updatePilgrimAction(formData: FormData): Promise<FormActionResult> {
  const parsed = updatePilgrimSchema.safeParse({
    ...formValues(formData),
    privacyDelivered: checkbox(formData, "privacyDelivered"),
    healthConsent: checkbox(formData, "healthConsent"),
    operationalMessagesAllowed: checkbox(formData, "operationalMessagesAllowed"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "operator"].includes(member.roleKey)) return { ok: false, message: "Non hai i permessi per modificare i pellegrini." };

  const { error } = await supabase.rpc("update_pilgrim_with_details", { payload: parsed.data });
  if (error) {
    console.error("update_pilgrim_with_details failed", error.code);
    return { ok: false, message: error.code === "23505" ? "Codice fiscale già utilizzato." : "Pellegrino non aggiornato; nessuna modifica parziale è stata mantenuta." };
  }
  revalidatePath(`/pellegrini/${parsed.data.pilgrimId}`);
  revalidatePath("/pellegrini");
  revalidatePath("/dashboard");
  return { ok: true, id: parsed.data.pilgrimId, message: "Pellegrino aggiornato." };
}

export async function updateTripAction(formData: FormData): Promise<FormActionResult> {
  const parsed = updateTripSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "operator"].includes(member.roleKey)) return { ok: false, message: "Non hai i permessi per modificare i viaggi." };
  const { count: activeRegistrations, error: countError } = await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("trip_id", parsed.data.tripId).neq("status", "cancelled");
  if (countError) return { ok: false, message: "Non è stato possibile verificare la capienza del viaggio." };
  if ((activeRegistrations ?? 0) > parsed.data.capacity) return { ok: false, message: `La capienza non può essere inferiore ai ${activeRegistrations} partecipanti già iscritti.` };
  const { error } = await supabase.from("trips").update({ code: parsed.data.code.toUpperCase(), title: parsed.data.title, destination: parsed.data.destination, description: parsed.data.description || null, status: parsed.data.status, starts_on: parsed.data.startDate, ends_on: parsed.data.endDate, registration_deadline: parsed.data.registrationDeadline || null, minimum_participants: parsed.data.minimum, capacity: parsed.data.capacity, base_price: parsed.data.price, deposit_amount: parsed.data.deposit || 0, single_room_supplement: parsed.data.singleSupplement || 0, balance_due_on: parsed.data.balanceDeadline || null, planned_walking_km: parsed.data.walkingKm }).eq("id", parsed.data.tripId).eq("organization_id", member.organizationId);
  if (error) {
    console.error("updateTripAction failed", error.code);
    return { ok: false, message: error.code === "23505" ? "Codice viaggio già utilizzato." : "Viaggio non aggiornato." };
  }
  revalidatePath(`/viaggi/${parsed.data.tripId}`);
  revalidatePath("/viaggi");
  revalidatePath("/dashboard");
  return { ok: true, id: parsed.data.tripId, message: "Viaggio aggiornato." };
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
