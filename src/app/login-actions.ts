"use server";

import { z } from "zod";
import { postLoginPath } from "@/lib/landing-path";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type LoginActionResult =
  | { ok: true; message: string; redirectTo: string }
  | { ok: false; message: string };

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/),
  password: z.string().min(1).max(128),
  next: z.string().max(2048).optional().default(""),
});

const roleSchema = z.enum(["admin", "manager", "operator", "guide", "accountant", "viewer"]);

export async function loginWithUsernameAction(formData: FormData): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Credenziali non valide oppure account non abilitato." };

  const config = getSupabaseConfig();
  const supabase = await createClient();
  if (!config || !supabase) return { ok: false, message: "Servizio di accesso non configurato." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpha-travel-v01.vercel.app";
  try {
    const response = await fetch(`${config.url}/functions/v1/username-login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
        Origin: siteUrl,
      },
      body: JSON.stringify(parsed.data),
    });
    const result = await response.json() as {
      accessToken?: string;
      refreshToken?: string;
      message?: string;
    };

    if (!response.ok || !result.accessToken || !result.refreshToken) {
      return {
        ok: false,
        message: response.status === 429
          ? "Troppi tentativi. Riprova tra 15 minuti."
          : "Credenziali non valide oppure account non abilitato.",
      };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
    if (sessionError || !sessionData.user) return { ok: false, message: "Accesso non riuscito. Riprova." };

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("user_id,role")
      .eq("user_id", sessionData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (memberError || !member) {
      await supabase.auth.signOut();
      return { ok: false, message: "Credenziali non valide oppure account non abilitato." };
    }

    const role = roleSchema.safeParse(member.role);
    if (!role.success) {
      await supabase.auth.signOut();
      return { ok: false, message: "Credenziali non valide oppure account non abilitato." };
    }

    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", sessionData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    return {
      ok: true,
      message: "Accesso effettuato.",
      redirectTo: postLoginPath(parsed.data.next, role.data, Boolean(platformAdmin)),
    };
  } catch {
    return { ok: false, message: "Servizio di accesso temporaneamente non disponibile." };
  }
}
