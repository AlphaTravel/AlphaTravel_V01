"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult = { ok: boolean; message: string };

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.enum(["Europe/Rome", "Europe/Paris", "Europe/Madrid", "Europe/Lisbon", "UTC"]),
  currency: z.enum(["EUR", "USD", "GBP"]),
});

export async function updateOrganizationAction(formData: FormData): Promise<SettingsActionResult> {
  const parsed = organizationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Controlla nome, fuso orario e valuta." };
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || member.roleKey !== "admin") return { ok: false, message: "Solo un amministratore può modificare l’organizzazione." };

  const { error } = await supabase.from("organizations").update(parsed.data).eq("id", member.organizationId);
  if (error) {
    console.error("updateOrganizationAction failed", error.code);
    return { ok: false, message: "Impostazioni non salvate." };
  }
  revalidatePath("/impostazioni");
  return { ok: true, message: "Impostazioni aggiornate." };
}
