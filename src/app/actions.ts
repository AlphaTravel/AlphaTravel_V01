"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormActionResult = { ok: boolean; demo?: boolean; id?: string; message: string };

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

const tripSchema = z.object({
  title: z.string().trim().min(3).max(160),
  code: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/),
  destination: z.string().trim().min(2).max(160),
  description: optionalText,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  minimum: z.coerce.number().int().min(1).max(5000),
  capacity: z.coerce.number().int().min(1).max(5000),
  registrationDeadline: z.union([z.iso.date(), z.literal("")]),
  price: z.coerce.number().min(0).max(1000000),
  deposit: z.union([z.coerce.number().min(0).max(1000000), z.literal("")]),
  singleSupplement: z.union([z.coerce.number().min(0).max(1000000), z.literal("")]),
  balanceDeadline: z.union([z.iso.date(), z.literal("")]),
}).refine((value) => value.endDate >= value.startDate, { message: "La data di rientro precede la partenza." })
  .refine((value) => value.capacity >= value.minimum, { message: "La capienza è inferiore al numero minimo." });

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

  const supabase = await createClient();
  if (!supabase) return { ok: true, demo: true, message: "Dati validati in modalità demo." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Sessione scaduta. Accedi nuovamente." };
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
  const parsed = tripSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati inseriti." };

  const supabase = await createClient();
  if (!supabase) return { ok: true, demo: true, message: "Dati validati in modalità demo." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Sessione scaduta. Accedi nuovamente." };
  const { data, error } = await supabase.rpc("create_trip", { payload: parsed.data });
  if (error) {
    console.error("create_trip failed", error.code);
    return { ok: false, message: "Salvataggio non riuscito. Il codice potrebbe essere già utilizzato." };
  }
  revalidatePath("/viaggi");
  revalidatePath("/dashboard");
  return { ok: true, id: String(data), message: "Viaggio creato." };
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
