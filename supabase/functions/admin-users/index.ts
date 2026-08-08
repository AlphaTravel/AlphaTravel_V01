import { createClient } from "npm:@supabase/supabase-js@2";

const usernamePattern = /^[a-z][a-z0-9._-]{2,31}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const roles = new Set(["admin", "manager", "operator", "guide", "accountant", "viewer"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const contactEmail = clean(payload.contactEmail, 254).toLowerCase();
  if (name.length < 2 || !emailPattern.test(contactEmail)) return null;
  return { name, contactEmail };
}

function internalEmail(username: string) {
  return `${username}@auth.alphatravel.local`;
}

function officeSlug(name: string) {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const prefix = (normalized || "ufficio").slice(0, 54).replace(/-+$/g, "");
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function removePrivateFiles(admin: ReturnType<typeof createClient>, root: string) {
  const folders = [root];
  while (folders.length) {
    const folder = folders.pop() as string;
    const files: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from("private-documents").list(folder, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) return false;
      for (const entry of data ?? []) {
        const path = `${folder}/${entry.name}`;
        if (entry.id) files.push(path);
        else folders.push(path);
      }
      if (!data || data.length < 100) break;
      offset += 100;
    }
    for (let index = 0; index < files.length; index += 100) {
      const { error } = await admin.storage.from("private-documents").remove(files.slice(index, index + 100));
      if (error) return false;
    }
  }
  return true;
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
    const displayName = clean(payload.adminDisplayName, 120);
    const password = String(payload.adminPassword ?? "");
    if (!office || !usernamePattern.test(username) || displayName.length < 2 || !validPassword(password)) {
      return json({ message: "Controlla i dati dell’ufficio e del primo accesso." }, 400);
    }
    const email = internalEmail(username);

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (authError || !authUser.user) return json({ message: "Username già utilizzato." }, 409);

    const { data: organizationId, error: organizationError } = await caller.rpc("platform_create_office", {
      payload: {
        ...office,
        slug: officeSlug(office.name),
        adminUsername: username,
        adminEmail: email,
        adminDisplayName: displayName,
      },
      new_user_id: authUser.user.id,
    });
    if (organizationError || !organizationId) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return json({ message: "Username già utilizzato oppure dati non validi." }, 409);
    }
    return json({ id: organizationId, message: "Ufficio e primo accesso creati." });
  }

  if (operation === "update_office") {
    const organizationId = clean(payload.organizationId, 36);
    const office = officePayload(payload);
    if (!uuidPattern.test(organizationId) || !office) return json({ message: "Dati ufficio non validi." }, 400);
    const { error } = await caller.rpc("platform_update_office", { payload: { ...office, organizationId } });
    if (error?.message.includes("Office not found")) return json({ message: "Ufficio non trovato." }, 404);
    if (error) return json({ message: "Modifica non applicata. Controlla nome ed email." }, 409);
    return json({ message: "Ufficio aggiornato." });
  }

  if (operation === "set_office_active") {
    const organizationId = clean(payload.organizationId, 36);
    const isActive = payload.isActive === true;
    if (!uuidPattern.test(organizationId)) return json({ message: "Ufficio non valido." }, 400);
    const { error } = await caller.rpc("platform_set_office_active", { target_organization_id: organizationId, target_active: isActive });
    if (error?.message.includes("Office not found")) return json({ message: "Ufficio non trovato." }, 404);
    if (error) return json({ message: "Stato dell’ufficio non aggiornato." }, 409);
    return json({ message: isActive ? "Ufficio riattivato. Gli accessi funzionano di nuovo." : "Ufficio sospeso. Tutti gli accessi sono bloccati." });
  }

  if (operation === "create_member") {
    const organizationId = clean(payload.organizationId, 36);
    const username = clean(payload.username, 32).toLowerCase();
    const displayName = clean(payload.displayName, 120);
    const role = clean(payload.role, 20);
    const password = String(payload.password ?? "");
    if (!uuidPattern.test(organizationId) || !usernamePattern.test(username) || displayName.length < 2 || !roles.has(role) || !validPassword(password)) {
      return json({ message: "Controlla username, ruolo e password." }, 400);
    }
    const email = internalEmail(username);
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (authError || !authUser.user) return json({ message: "Username già utilizzato." }, 409);
    const { error: memberError } = await caller.rpc("platform_create_member", {
      payload: { organizationId, username, email, displayName, role },
      new_user_id: authUser.user.id,
    });
    if (memberError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      const message = memberError.message.includes("Office not found")
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
    const displayName = clean(payload.displayName, 120);
    const role = clean(payload.role, 20);
    const password = String(payload.password ?? "");
    const isActive = payload.isActive === true;
    if (!uuidPattern.test(organizationId) || !uuidPattern.test(userId) || !usernamePattern.test(username) || displayName.length < 2 || !roles.has(role) || (password && !validPassword(password))) {
      return json({ message: "Controlla i dati dell’utente." }, 400);
    }
    const { data: previousMember, error: lookupError } = await caller.rpc("platform_get_member", {
      target_organization_id: organizationId,
      target_user_id: userId,
    });
    if (lookupError || !previousMember) return json({ message: "Utente o ufficio non trovato." }, 404);

    const memberPayload = { organizationId, userId, username, email: previousMember.email, displayName, role, isActive, passwordChanged: Boolean(password) };
    const { error: memberError } = await caller.rpc("platform_update_member", { payload: memberPayload });
    if (memberError?.message.includes("Platform administrator cannot be suspended")) return json({ message: "Il super amministratore della piattaforma non può essere sospeso." }, 400);
    if (memberError?.message.includes("At least one active administrator")) return json({ message: "Deve rimanere almeno un amministratore attivo nell’ufficio." }, 409);
    if (memberError) return json({ message: "Username già utilizzato o modifica non valida." }, 409);

    const authChanges: { password?: string; user_metadata: { display_name: string } } = { user_metadata: { display_name: displayName } };
    if (password) authChanges.password = password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authChanges);
    if (authError) {
      await caller.rpc("platform_update_member", { payload: previousMember });
      return json({ message: "Password non aggiornata. Riprova." }, 409);
    }
    return json({ message: password ? "Utente e nuova password aggiornati." : "Utente aggiornato." });
  }

  if (operation === "delete_office") {
    const organizationId = clean(payload.organizationId, 36);
    const confirmation = clean(payload.confirmation, 120);
    if (!uuidPattern.test(organizationId) || confirmation.length < 2) return json({ message: "Conferma di eliminazione non valida." }, 400);

    const { data: deletion, error: prepareError } = await caller.rpc("platform_prepare_delete_office", {
      target_organization_id: organizationId,
      confirmation,
    });
    if (prepareError?.message.includes("Invalid confirmation")) return json({ message: "Scrivi esattamente il nome dell’ufficio." }, 400);
    if (prepareError?.message.includes("Office not found")) return json({ message: "Ufficio non trovato." }, 404);
    if (prepareError?.message.includes("Platform office cannot be deleted")) return json({ message: "L’ufficio interno AlphaTravel non può essere eliminato." }, 400);
    if (prepareError || !deletion || typeof deletion !== "object") return json({ message: "Eliminazione non avviata." }, 409);

    const storageRemoved = await removePrivateFiles(admin, organizationId);
    if (!storageRemoved) return json({ message: "Documenti non eliminati: l’ufficio è stato sospeso. Riprova l’eliminazione." }, 503);

    const userIds = Array.isArray(deletion.userIds) ? deletion.userIds.filter((value): value is string => typeof value === "string" && uuidPattern.test(value)) : [];
    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error && !error.message.toLowerCase().includes("not found")) {
        return json({ message: "Account non eliminati completamente: l’ufficio resta sospeso. Riprova." }, 503);
      }
    }

    const { error: deleteError } = await caller.rpc("platform_delete_office", {
      target_organization_id: organizationId,
      confirmation,
    });
    if (deleteError) return json({ message: "Dati non eliminati completamente: l’ufficio resta sospeso. Riprova." }, 503);
    return json({ message: "Ufficio, accessi, documenti e dati associati eliminati definitivamente." });
  }

  return json({ message: "Operazione non riconosciuta." }, 400);
});
