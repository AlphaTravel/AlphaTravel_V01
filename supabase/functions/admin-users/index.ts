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
  return { name, slug, contactEmail, phone: phone || null, timezone, currency, plan, subscriptionStatus, userLimit, renewalDate, notes: notes || null };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ message: "Metodo non consentito." }, 405);
  const siteUrl = Deno.env.get("APP_SITE_URL") ?? "";
  if (!siteUrl || request.headers.get("origin") !== siteUrl) return json({ message: "Richiesta non autorizzata." }, 403);
  if (Number(request.headers.get("content-length") ?? "0") > 16_384 || !request.headers.get("content-type")?.includes("application/json")) {
    return json({ message: "Richiesta non valida." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = keyFromSet("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = keyFromSet("SUPABASE_SECRET_KEYS", "sb_secret_") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!supabaseUrl || !publishableKey || !serviceKey || !bearer) return json({ message: "Servizio amministrativo non configurato." }, 503);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const caller = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const [{ data: userData, error: userError }, { data: isPlatformAdmin, error: platformError }] = await Promise.all([
    caller.auth.getUser(),
    caller.rpc("is_platform_admin"),
  ]);
  if (userError || !userData.user) return json({ message: "Sessione non valida." }, 401);
  if (platformError || isPlatformAdmin !== true) return json({ message: "Accesso riservato al proprietario della piattaforma." }, 403);

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

    const { data: organizationId, error: organizationError } = await caller.rpc("platform_create_office", {
      payload: {
        ...office,
        adminUsername: username,
        adminEmail: email,
        adminDisplayName: displayName,
      },
      new_user_id: authUser.user.id,
    });
    if (organizationError || !organizationId) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return json({ message: "Nome breve già utilizzato oppure dati non validi." }, 409);
    }
    return json({ id: organizationId, message: "Ufficio e primo accesso creati." });
  }

  if (operation === "update_office") {
    const organizationId = clean(payload.organizationId, 36);
    const office = officePayload(payload);
    const isActive = payload.isActive === true;
    if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !office) return json({ message: "Dati ufficio non validi." }, 400);
    const { error } = await caller.rpc("platform_update_office", { payload: { ...office, organizationId, isActive } });
    if (error?.message.includes("Office not found")) return json({ message: "Ufficio non trovato." }, 404);
    if (error?.message.includes("Platform office cannot be disabled")) return json({ message: "L’ufficio proprietario della piattaforma non può essere disattivato." }, 400);
    if (error) return json({ message: "Modifica non applicata. Controlla nome breve ed email." }, 409);
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
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (authError || !authUser.user) return json({ message: "Email o account già utilizzato." }, 409);
    const { error: memberError } = await caller.rpc("platform_create_member", {
      payload: { organizationId, username, email, displayName, role },
      new_user_id: authUser.user.id,
    });
    if (memberError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      const message = memberError.message.includes("User limit reached")
        ? "Limite utenti del piano raggiunto. Aumentalo prima di creare l’accesso."
        : memberError.message.includes("Office not found")
          ? "Ufficio non trovato."
          : "Username già utilizzato. Nessun accesso è stato creato.";
      return json({ message }, memberError.message.includes("Office not found") ? 404 : 409);
    }
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
    const { data: previousMember, error: lookupError } = await caller.rpc("platform_get_member", {
      target_organization_id: organizationId,
      target_user_id: userId,
    });
    if (lookupError || !previousMember) return json({ message: "Utente o ufficio non trovato." }, 404);

    const memberPayload = { organizationId, userId, username, email, displayName, role, isActive, passwordChanged: Boolean(password) };
    const { error: memberError } = await caller.rpc("platform_update_member", { payload: memberPayload });
    if (memberError?.message.includes("Platform administrator cannot be suspended")) return json({ message: "Il super amministratore della piattaforma non può essere sospeso." }, 400);
    if (memberError?.message.includes("User limit reached")) return json({ message: "Limite utenti del piano raggiunto." }, 409);
    if (memberError?.message.includes("At least one active administrator")) return json({ message: "Deve rimanere almeno un amministratore attivo nell’ufficio." }, 409);
    if (memberError) return json({ message: "Username già utilizzato o modifica non valida." }, 409);

    const authChanges: { email: string; password?: string; user_metadata: { display_name: string } } = { email, user_metadata: { display_name: displayName } };
    if (password) authChanges.password = password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authChanges);
    if (authError) {
      await caller.rpc("platform_update_member", { payload: previousMember });
      return json({ message: "Email o password non aggiornate. Verifica che l’email non sia già usata." }, 409);
    }
    return json({ message: password ? "Utente e nuova password aggiornati." : "Utente aggiornato." });
  }

  return json({ message: "Operazione non riconosciuta." }, 400);
});
