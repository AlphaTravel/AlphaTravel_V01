import { createClient } from "npm:@supabase/supabase-js@2";

const usernamePattern = /^[a-z][a-z0-9._-]{2,31}$/;
const slugPattern = /^[a-z0-9][a-z0-9-]{1,62}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const roles = new Set(["admin", "manager", "operator", "guide", "accountant", "viewer"]);
const plans = new Set(["starter", "professional", "enterprise"]);
const subscriptions = new Set(["trial", "active", "past_due", "cancelled"]);
const timezones = new Set(["Europe/Rome", "Europe/Paris", "Europe/Madrid", "Europe/Lisbon", "UTC"]);
const currencies = new Set(["EUR", "USD", "GBP"]);

function keyFromSet(name: string, prefix: string) {
  const raw = Deno.env.get(name) ?? "";
  if (raw.startsWith(prefix)) return raw;
  try {
    const pending: unknown[] = [JSON.parse(raw)];
    while (pending.length) {
      const value = pending.shift();
      if (typeof value === "string" && value.startsWith(prefix)) return value;
      if (value && typeof value === "object") pending.push(...Object.values(value));
    }
  } catch {
    return "";
  }
  return "";
}

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clean(value: unknown, maximum = 2000) {
  return String(value ?? "").trim().slice(0, maximum);
}

function validPassword(value: string) {
  return value.length >= 8 && value.length <= 128 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

function officePayload(payload: Record<string, unknown>) {
  const name = clean(payload.name, 120);
  const slug = clean(payload.slug, 63).toLowerCase();
  const contactEmail = clean(payload.contactEmail, 254).toLowerCase();
  const phone = clean(payload.phone, 40);
  const timezone = clean(payload.timezone, 40);
  const currency = clean(payload.currency, 3);
  const plan = clean(payload.plan, 20);
  const subscriptionStatus = clean(payload.subscriptionStatus, 20);
  const userLimit = Number(payload.userLimit);
  const renewalDate = clean(payload.renewalDate, 10) || null;
  const notes = clean(payload.notes, 2000);
  if (
    name.length < 2 || !slugPattern.test(slug) || !emailPattern.test(contactEmail)
    || !timezones.has(timezone) || !currencies.has(currency) || !plans.has(plan)
    || !subscriptions.has(subscriptionStatus) || !Number.isInteger(userLimit)
    || userLimit < 1 || userLimit > 1000
    || (renewalDate && !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate))
  ) return null;
  return { name, slug, contact_email: contactEmail, phone: phone || null, timezone, currency, plan, subscription_status: subscriptionStatus, user_limit: userLimit, renewal_date: renewalDate, notes: notes || null };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ message: "Metodo non consentito." }, 405);
  const siteUrl = Deno.env.get("APP_SITE_URL") ?? "";
  if (!siteUrl || request.headers.get("origin") !== siteUrl) return json({ message: "Richiesta non autorizzata." }, 403);
  if (Number(request.headers.get("content-length") ?? "0") > 16_384 || !request.headers.get("content-type")?.includes("application/json")) {
    return json({ message: "Richiesta non valida." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = keyFromSet("SUPABASE_SECRET_KEYS", "sb_secret_") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!supabaseUrl || !serviceKey || !bearer) return json({ message: "Servizio amministrativo non configurato." }, 503);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(bearer);
  if (userError || !userData.user) return json({ message: "Sessione non valida." }, 401);
  const callerId = userData.user.id;
  const { data: platformAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", callerId).eq("is_active", true).maybeSingle();
  if (!platformAdmin) return json({ message: "Accesso riservato al proprietario della piattaforma." }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Richiesta non valida." }, 400);
  }

  const operation = clean(payload.operation, 40);

  if (operation === "create_office") {
    const office = officePayload(payload);
    const username = clean(payload.adminUsername, 32).toLowerCase();
    const email = clean(payload.adminEmail, 254).toLowerCase();
    const displayName = clean(payload.adminDisplayName, 120);
    const password = String(payload.adminPassword ?? "");
    if (!office || !usernamePattern.test(username) || !emailPattern.test(email) || displayName.length < 2 || !validPassword(password)) {
      return json({ message: "Controlla i dati dell’ufficio e del primo accesso." }, 400);
    }

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (authError || !authUser.user) return json({ message: "Email o account già utilizzato." }, 409);

    const { data: organization, error: organizationError } = await admin.from("organizations").insert({ ...office, is_active: true }).select("id").single();
    if (organizationError || !organization) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return json({ message: "Nome breve già utilizzato oppure dati non validi." }, 409);
    }

    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: organization.id,
      user_id: authUser.user.id,
      username,
      email,
      display_name: displayName,
      role: "admin",
      is_active: true,
    });
    if (memberError) {
      await admin.from("organizations").delete().eq("id", organization.id);
      await admin.auth.admin.deleteUser(authUser.user.id);
      return json({ message: "Username già utilizzato. Nessun ufficio è stato creato." }, 409);
    }

    await admin.from("platform_audit_logs").insert({ actor_user_id: callerId, action: "Ufficio creato", target_organization_id: organization.id, details: { plan: office.plan } });
    return json({ id: organization.id, message: "Ufficio e primo accesso creati." });
  }

  if (operation === "update_office") {
    const organizationId = clean(payload.organizationId, 36);
    const office = officePayload(payload);
    const isActive = payload.isActive === true;
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !office) return json({ message: "Dati ufficio non validi." }, 400);
    const { data: existing } = await admin.from("organizations").select("slug").eq("id", organizationId).maybeSingle();
    if (!existing) return json({ message: "Ufficio non trovato." }, 404);
    if (existing.slug === "alphatravel" && !isActive) return json({ message: "L’ufficio proprietario della piattaforma non può essere disattivato." }, 400);
    const { error } = await admin.from("organizations").update({ ...office, is_active: isActive }).eq("id", organizationId);
    if (error) return json({ message: "Modifica non applicata. Controlla slug ed email." }, 409);
    await admin.from("platform_audit_logs").insert({ actor_user_id: callerId, action: isActive ? "Ufficio aggiornato" : "Ufficio disattivato", target_organization_id: organizationId, details: { plan: office.plan, subscriptionStatus: office.subscription_status } });
    return json({ message: isActive ? "Ufficio aggiornato." : "Ufficio disattivato: gli accessi sono stati bloccati." });
  }

  if (operation === "create_member") {
    const organizationId = clean(payload.organizationId, 36);
    const username = clean(payload.username, 32).toLowerCase();
    const email = clean(payload.email, 254).toLowerCase();
    const displayName = clean(payload.displayName, 120);
    const role = clean(payload.role, 20);
    const password = String(payload.password ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !usernamePattern.test(username) || !emailPattern.test(email) || displayName.length < 2 || !roles.has(role) || !validPassword(password)) {
      return json({ message: "Controlla username, email, ruolo e password." }, 400);
    }
    const [{ data: organization }, { count }] = await Promise.all([
      admin.from("organizations").select("id,user_limit").eq("id", organizationId).maybeSingle(),
      admin.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_active", true),
    ]);
    if (!organization) return json({ message: "Ufficio non trovato." }, 404);
    if ((count ?? 0) >= organization.user_limit) return json({ message: "Limite utenti del piano raggiunto. Aumentalo prima di creare l’accesso." }, 409);

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (authError || !authUser.user) return json({ message: "Email o account già utilizzato." }, 409);
    const { error: memberError } = await admin.from("organization_members").insert({ organization_id: organizationId, user_id: authUser.user.id, username, email, display_name: displayName, role, is_active: true });
    if (memberError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return json({ message: "Username già utilizzato. Nessun accesso è stato creato." }, 409);
    }
    await admin.from("platform_audit_logs").insert({ actor_user_id: callerId, action: "Accesso creato", target_organization_id: organizationId, details: { userId: authUser.user.id, role } });
    return json({ id: authUser.user.id, message: "Accesso creato e subito utilizzabile." });
  }

  if (operation === "update_member") {
    const organizationId = clean(payload.organizationId, 36);
    const userId = clean(payload.userId, 36);
    const username = clean(payload.username, 32).toLowerCase();
    const email = clean(payload.email, 254).toLowerCase();
    const displayName = clean(payload.displayName, 120);
    const role = clean(payload.role, 20);
    const password = String(payload.password ?? "");
    const isActive = payload.isActive === true;
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !/^[0-9a-f-]{36}$/i.test(userId) || !usernamePattern.test(username) || !emailPattern.test(email) || displayName.length < 2 || !roles.has(role) || (password && !validPassword(password))) {
      return json({ message: "Controlla i dati dell’utente." }, 400);
    }
    const [{ data: member }, { data: protectedAdmin }, { data: organization }, { count }] = await Promise.all([
      admin.from("organization_members").select("user_id,is_active").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle(),
      admin.from("platform_admins").select("user_id").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      admin.from("organizations").select("user_limit").eq("id", organizationId).maybeSingle(),
      admin.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_active", true),
    ]);
    if (!member || !organization) return json({ message: "Utente o ufficio non trovato." }, 404);
    if (protectedAdmin && !isActive) return json({ message: "Il super amministratore della piattaforma non può essere sospeso." }, 400);
    if (!member.is_active && isActive && (count ?? 0) >= organization.user_limit) return json({ message: "Limite utenti del piano raggiunto." }, 409);

    const authChanges: { email: string; password?: string; user_metadata: { display_name: string } } = { email, user_metadata: { display_name: displayName } };
    if (password) authChanges.password = password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authChanges);
    if (authError) return json({ message: "Email o password non aggiornate. Verifica che l’email non sia già usata." }, 409);
    const { error: memberError } = await admin.from("organization_members").update({ username, email, display_name: displayName, role, is_active: isActive }).eq("organization_id", organizationId).eq("user_id", userId);
    if (memberError) return json({ message: memberError.message.includes("At least one active administrator") ? "Deve rimanere almeno un amministratore attivo nell’ufficio." : "Username già utilizzato o modifica non valida." }, 409);
    await admin.from("platform_audit_logs").insert({ actor_user_id: callerId, action: password ? "Accesso e password aggiornati" : "Accesso aggiornato", target_organization_id: organizationId, details: { userId, role, isActive } });
    return json({ message: password ? "Utente e nuova password aggiornati." : "Utente aggiornato." });
  }

  return json({ message: "Operazione non riconosciuta." }, 400);
});
