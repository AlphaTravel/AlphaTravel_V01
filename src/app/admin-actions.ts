"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult = { ok: boolean; message: string; id?: string };

const roleSchema = z.enum(["admin", "manager", "operator", "guide", "accountant", "viewer"]);
const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/);
const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(8).max(128).regex(/[A-Za-z]/).regex(/[0-9]/);
const officeFields = {
  name: z.string().trim().min(2).max(120),
  contactEmail: emailSchema,
};

const createOfficeSchema = z.object({
  ...officeFields,
  adminUsername: usernameSchema,
  adminDisplayName: z.string().trim().min(2).max(120),
  adminPassword: passwordSchema,
});

const updateOfficeSchema = z.object({
  ...officeFields,
  organizationId: z.uuid(),
});

const officeStateSchema = z.object({ organizationId: z.uuid(), isActive: z.enum(["true", "false"]) });
const deleteOfficeSchema = z.object({ organizationId: z.uuid(), confirmation: z.string().min(2).max(120) });

const createMemberSchema = z.object({
  organizationId: z.uuid(),
  username: usernameSchema,
  displayName: z.string().trim().min(2).max(120),
  role: roleSchema,
  password: passwordSchema,
});

const updateMemberSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  username: usernameSchema,
  displayName: z.string().trim().min(2).max(120),
  role: roleSchema,
  isActive: z.enum(["true", "false"]),
  password: z.union([passwordSchema, z.literal("")]),
});

async function callPlatformControl(operation: string, payload: Record<string, unknown>): Promise<AdminActionResult> {
  const supabase = await createClient();
  const config = getSupabaseConfig();
  if (!supabase || !config) return { ok: false, message: "Sessione amministrativa non valida." };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, message: "Sessione scaduta. Accedi nuovamente." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpha-travel-v01.vercel.app";
  try {
    const response = await fetch(`${config.url}/functions/v1/admin-users`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: config.publishableKey,
        "Content-Type": "application/json",
        Origin: siteUrl,
      },
      body: JSON.stringify({ operation, ...payload }),
    });
    const result = await response.json() as { message?: string; id?: string };
    if (!response.ok) return { ok: false, message: result.message ?? "Operazione non riuscita." };
    revalidatePath("/admin");
    return { ok: true, message: result.message ?? "Operazione completata.", id: result.id };
  } catch {
    return { ok: false, message: "Servizio amministrativo temporaneamente non disponibile." };
  }
}

export async function createOfficeAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = createOfficeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati dell’ufficio." };
  return callPlatformControl("create_office", parsed.data);
}

export async function updateOfficeAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = updateOfficeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati dell’ufficio." };
  return callPlatformControl("update_office", parsed.data);
}

export async function setOfficeActiveAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = officeStateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Ufficio non valido." };
  return callPlatformControl("set_office_active", { ...parsed.data, isActive: parsed.data.isActive === "true" });
}

export async function deleteOfficeAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = deleteOfficeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Conferma di eliminazione non valida." };
  return callPlatformControl("delete_office", parsed.data);
}

export async function createOfficeMemberAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = createMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati di accesso." };
  return callPlatformControl("create_member", parsed.data);
}

export async function updateOfficeMemberAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = updateMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati dell’utente." };
  return callPlatformControl("update_member", { ...parsed.data, isActive: parsed.data.isActive === "true" });
}
