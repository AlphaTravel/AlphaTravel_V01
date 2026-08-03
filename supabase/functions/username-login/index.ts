import { createClient } from "npm:@supabase/supabase-js@2";

const usernamePattern = /^[a-z][a-z0-9._-]{2,31}$/;

function keyFromSet(name: string, prefix: string) {
  const raw = Deno.env.get(name) ?? "";
  if (raw.startsWith(prefix)) return raw;
  try {
    const pending: unknown[] = [JSON.parse(raw)];
    while (pending.length > 0) {
      const value = pending.shift();
      if (typeof value === "string" && value.startsWith(prefix)) return value;
      if (value && typeof value === "object") pending.push(...Object.values(value));
    }
  } catch {
    return "";
  }
  return "";
}

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

async function rateKey(secret: string, username: string, address: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${username}\n${address}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ message: "Metodo non consentito." }, 405);

  const siteUrl = Deno.env.get("APP_SITE_URL") ?? "";
  const origin = request.headers.get("origin") ?? "";
  if (!siteUrl || origin !== siteUrl) return json({ message: "Richiesta non autorizzata." }, 403);
  if (
    Number(request.headers.get("content-length") ?? "0") > 4096
    || !request.headers.get("content-type")?.includes("application/json")
  ) return json({ message: "Richiesta non valida." }, 400);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Credenziali non valide oppure account non abilitato." }, 401);
  }

  const username = String(payload.username ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  if (!usernamePattern.test(username) || password.length < 1 || password.length > 128) {
    return json({ message: "Credenziali non valide oppure account non abilitato." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = keyFromSet("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_")
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const serviceRoleKey = keyFromSet("SUPABASE_SECRET_KEYS", "sb_secret_")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
  const rateLimitSecret = Deno.env.get("LOGIN_RATE_LIMIT_SECRET") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || rateLimitSecret.length < 32) {
    console.error("username-login: configuration unavailable");
    return json({ message: "Servizio di accesso temporaneamente non disponibile." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const attemptKey = await rateKey(rateLimitSecret, username, clientAddress(request));
  const { data: allowed, error: rateError } = await admin.rpc("consume_username_login_attempt", {
    attempt_key: attemptKey,
  });
  if (rateError) {
    console.error("username-login: rate limit unavailable", rateError.code);
    return json({ message: "Servizio di accesso temporaneamente non disponibile." }, 503);
  }
  if (!allowed) return json({ message: "Troppi tentativi. Riprova tra 15 minuti." }, 429);

  const { data: memberRows, error: memberError } = await admin.rpc("resolve_username_login", {
    target_username: username,
  });
  if (memberError) {
    console.error("username-login: member lookup unavailable", memberError.code);
    return json({ message: "Servizio di accesso temporaneamente non disponibile." }, 503);
  }
  const member = Array.isArray(memberRows) ? memberRows[0] : undefined;

  const identityEmail = member?.is_active && member.email
    ? member.email
    : `invalid-${attemptKey.slice(0, 20)}@auth.invalid`;
  const { data: authData, error: authError } = await auth.auth.signInWithPassword({
    email: identityEmail,
    password,
  });

  if (
    authError
    || !member?.is_active
    || !authData.user
    || authData.user.id !== member.user_id
    || !authData.session
  ) return json({ message: "Credenziali non valide oppure account non abilitato." }, 401);

  await admin.rpc("clear_username_login_attempt", { attempt_key: attemptKey });
  return json({
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  }, 200);
});
