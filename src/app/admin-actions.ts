"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/live-data";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult = { ok: boolean; message: string };

const roleSchema = z.enum(["admin", "manager", "operator", "guide", "accountant", "viewer"]);
const inviteSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/),
  email: z.email().max(254),
  displayName: z.string().trim().min(2).max(120),
  role: roleSchema,
});
const updateSchema = z.object({
  userId: z.uuid(),
  username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/),
  role: roleSchema,
  active: z.enum(["true", "false"]),
});

async function getVerifiedAdminContext() {
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!supabase || !member || member.roleKey !== "admin") return null;

  const [{ data: authData }, { data: aalData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!authData.user || aalData?.currentLevel !== "aal2") return null;
  return { member, supabase };
}

export async function inviteMemberAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Controlla username, nome, email e ruolo." };

  const context = await getVerifiedAdminContext();
  const config = getSupabaseConfig();
  if (!context || !config) return { ok: false, message: "Sessione amministrativa non valida. Verifica di nuovo l’MFA." };

  const { data: sessionData } = await context.supabase.auth.getSession();
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
      body: JSON.stringify(parsed.data),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) return { ok: false, message: result.message ?? "Invito non riuscito." };
  } catch {
    return { ok: false, message: "Servizio inviti temporaneamente non disponibile." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Invito inviato. L’utente imposterà personalmente la password." };
}

export async function updateMemberAction(formData: FormData): Promise<AdminActionResult> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Modifica non valida." };

  const context = await getVerifiedAdminContext();
  if (!context) return { ok: false, message: "Sessione amministrativa non valida. Verifica di nuovo l’MFA." };

  const { error } = await context.supabase.rpc("admin_update_member", {
    target_user_id: parsed.data.userId,
    target_username: parsed.data.username,
    target_role: parsed.data.role,
    target_active: parsed.data.active === "true",
  });
  if (error) {
    console.error("admin_update_member failed", error.code);
    const lastAdmin = error.message.includes("At least one active administrator");
    return { ok: false, message: lastAdmin ? "Deve rimanere almeno un amministratore attivo." : "Modifica non applicata." };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Username, ruolo e stato aggiornati." };
}
