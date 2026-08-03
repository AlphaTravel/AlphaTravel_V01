import { withSupabase } from "npm:@supabase/server";

const roles = new Set(["admin", "manager", "operator", "guide", "accountant", "viewer"]);
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const handler = {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") return json({ message: "Metodo non consentito." }, 405);

    const configuredSiteUrl = Deno.env.get("APP_SITE_URL") ?? "";
    const origin = request.headers.get("origin");
    if (!configuredSiteUrl || (origin && origin !== configuredSiteUrl)) {
      return json({ message: "Richiesta non autorizzata." }, 403);
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 8192 || !request.headers.get("content-type")?.includes("application/json")) {
      return json({ message: "Richiesta non valida." }, 400);
    }

    const jwtClaims = context.jwtClaims as Record<string, unknown> | undefined;
    const userClaims = context.userClaims as Record<string, unknown> | undefined;
    const callerId = String(userClaims?.id ?? jwtClaims?.sub ?? "");
    if (!callerId || jwtClaims?.aal !== "aal2") {
      return json({ message: "Verifica a due fattori richiesta." }, 403);
    }

    const { data: caller, error: callerError } = await context.supabase
      .from("organization_members")
      .select("organization_id,role,is_active")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();

    if (callerError || !caller || caller.role !== "admin") {
      return json({ message: "Richiesta non autorizzata." }, 403);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch {
      return json({ message: "Richiesta non valida." }, 400);
    }

    const email = String(payload.email ?? "").trim().toLowerCase();
    const displayName = String(payload.displayName ?? "").trim();
    const role = String(payload.role ?? "");
    if (
      !emailPattern.test(email) || email.length > 254 ||
      displayName.length < 2 || displayName.length > 120 ||
      !roles.has(role)
    ) {
      return json({ message: "Controlla i dati dell’invito." }, 400);
    }

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await context.supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", caller.organization_id)
      .eq("actor_user_id", callerId)
      .eq("action", "INVITE")
      .gte("occurred_at", since);
    if ((count ?? 0) >= 5) {
      return json({ message: "Troppi inviti ravvicinati. Riprova più tardi." }, 429);
    }

    const { data: invited, error: inviteError } = await context.supabaseAdmin.auth.admin
      .inviteUserByEmail(email, {
        redirectTo: `${configuredSiteUrl}/imposta-password`,
        data: { display_name: displayName },
      });

    if (inviteError || !invited.user) {
      return json({ message: "Invito non inviato. Verifica l’indirizzo o riprova più tardi." }, 400);
    }

    const invitedUserId = invited.user.id;
    const { error: membershipError } = await context.supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: caller.organization_id,
        user_id: invitedUserId,
        email,
        display_name: displayName,
        role,
        is_active: true,
      });

    if (membershipError) {
      await context.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      return json({ message: "Invito non completato. Nessun account è stato attivato." }, 409);
    }

    await context.supabaseAdmin.from("audit_logs").insert({
      organization_id: caller.organization_id,
      actor_user_id: callerId,
      action: "INVITE",
      table_name: "organization_members",
      record_id: invitedUserId,
    });

    return json({ ok: true, message: "Invito inviato in modo sicuro." });
  }),
};

export default handler;
