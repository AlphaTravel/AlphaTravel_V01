import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030001_initial_schema.sql"),
  "utf8",
);
const commandsMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030003_transactional_commands.sql"),
  "utf8",
);
const grantsMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030004_explicit_api_grants.sql"),
  "utf8",
);
const adminMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030005_admin_security.sql"),
  "utf8",
);
const usernameMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030006_username_auth.sql"),
  "utf8",
);
const usernameRateLimitFix = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030007_fix_username_rate_limit.sql"),
  "utf8",
);
const usernameLookupMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608030008_username_login_lookup.sql"),
  "utf8",
);
const operationalIntegrityMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608040001_operational_integrity.sql"),
  "utf8",
);
const atomicUpdateMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608040002_atomic_pilgrim_updates.sql"),
  "utf8",
);
const platformMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608050001_platform_control_plane.sql"),
  "utf8",
);
const platformCommandsMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608050002_platform_commands.sql"),
  "utf8",
);
const simplifiedPlatformMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608070001_simplify_platform_admin.sql"),
  "utf8",
);
const edgeFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/admin-users/index.ts"),
  "utf8",
);
const usernameLoginFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/username-login/index.ts"),
  "utf8",
);
const proxy = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");
const platformAdminPanel = readFileSync(
  resolve(process.cwd(), "src/components/platform-admin-panel.tsx"),
  "utf8",
);

const tenantTables = [
  "organizations",
  "organization_members",
  "pilgrims",
  "pilgrim_health_profiles",
  "emergency_contacts",
  "trips",
  "trip_groups",
  "registrations",
  "accommodations",
  "rooms",
  "room_assignments",
  "vehicles",
  "vehicle_seats",
  "seat_assignments",
  "itinerary_items",
  "payments",
  "documents",
  "audit_logs",
];

describe("database security migration", () => {
  it.each(tenantTables)("enables RLS for %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it("keeps health data in a dedicated protected table", () => {
    const pilgrimsTable = migration
      .split("create table public.pilgrims (")[1]
      .split("comment on table public.pilgrims")[0];
    expect(migration).toContain("create table public.pilgrim_health_profiles");
    expect(migration).toContain("create policy health_read");
    expect(pilgrimsTable).not.toContain("allergies text");
  });

  it("does not grant anonymous access to sensitive tables", () => {
    expect(migration).toContain("revoke all on public.pilgrim_health_profiles from anon;");
    expect(migration).toContain("revoke all on public.documents from anon;");
  });

  it("keeps form commands under caller RLS and removes public execution", () => {
    expect(commandsMigration).toContain("security invoker");
    expect(commandsMigration).toContain("revoke all on function public.create_pilgrim_with_details(jsonb) from public;");
    expect(commandsMigration).toContain("revoke all on function public.create_trip(jsonb) from public;");
  });

  it("uses explicit authenticated grants without anonymous table access", () => {
    expect(grantsMigration).toContain("revoke all privileges on all tables in schema public from anon;");
    expect(grantsMigration).toContain("grant select, insert, update, delete on table public.pilgrims to authenticated;");
    expect(grantsMigration).not.toMatch(/grant .* on table public\.[a-z_]+ to anon;/);
  });

  it("historically hardened administrative reads before the platform split", () => {
    expect(adminMigration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'");
    expect(adminMigration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'");
    expect(adminMigration).toContain("revoke insert, update, delete on table public.organization_members from authenticated;");
  });

  it("separates platform administrators and removes the MFA dependency", () => {
    expect(platformMigration).toContain("create table public.platform_admins");
    expect(platformMigration).toContain("create or replace function public.is_platform_admin()");
    expect(platformMigration).toContain("create or replace function public.platform_dashboard()");
    expect(platformMigration).toContain("drop policy if exists audit_admin_mfa_read");
    const replacement = platformMigration.split("create or replace function public.admin_update_member(")[1];
    expect(replacement).not.toContain("auth.jwt() ->> 'aal'");
  });

  it("prevents removal of the last active administrator", () => {
    expect(adminMigration).toContain("create or replace function public.protect_last_active_admin()");
    expect(adminMigration).toContain("At least one active administrator is required");
  });

  it("keeps platform mutations inside a platform-admin authenticated Edge Function", () => {
    expect(edgeFunction).toContain("caller.auth.getUser()");
    expect(edgeFunction).toContain('caller.rpc("is_platform_admin")');
    expect(edgeFunction).toContain('caller.rpc("platform_create_office"');
    expect(edgeFunction).toContain('caller.rpc("platform_update_office"');
    expect(edgeFunction).toContain('caller.rpc("platform_create_member"');
    expect(edgeFunction).toContain('caller.rpc("platform_update_member"');
    expect(edgeFunction).toContain('caller.rpc("platform_set_office_active"');
    expect(edgeFunction).toContain('caller.rpc("platform_prepare_delete_office"');
    expect(edgeFunction).toContain('caller.rpc("platform_delete_office"');
    expect(edgeFunction).toContain('admin.storage.from("private-documents").remove');
    expect(edgeFunction).toContain("admin.auth.admin.deleteUser");
    expect(edgeFunction).not.toMatch(/admin\.from\(/);
    expect(edgeFunction).toContain('operation === "create_office"');
    expect(edgeFunction).toContain('operation === "update_member"');
    expect(edgeFunction).not.toContain("aal2");
  });

  it("authorizes every transactional platform command with the caller JWT", () => {
    for (const command of [
      "platform_create_office",
      "platform_update_office",
      "platform_create_member",
      "platform_get_member",
      "platform_update_member",
    ]) {
      const body = platformCommandsMigration.split(`function public.${command}`)[1];
      expect(body).toContain("auth.uid() is null or not public.is_platform_admin()");
      expect(platformCommandsMigration).toContain(`grant execute on function public.${command}`);
    }
    expect(platformCommandsMigration).toContain("security definer");
    expect(platformCommandsMigration).toContain("set search_path = public, pg_temp");
  });

  it("blocks suspended offices in both login resolution and tenant RLS helpers", () => {
    expect(platformMigration).toContain("member.is_active and organization.is_active");
    expect(platformMigration).toContain("and organization.is_active");
    expect(platformMigration).toContain("create policy members_self_read");
  });

  it("keeps usernames unique and login throttling private", () => {
    expect(usernameMigration).toContain("organization_members_username_unique_idx");
    expect(usernameMigration).toContain("organization_members_user_unique_idx");
    expect(usernameMigration).toContain("create table private.username_login_attempts");
    expect(usernameMigration).toContain("revoke all on schema private from public, anon, authenticated;");
    expect(usernameMigration).toContain("grant execute on function public.consume_username_login_attempt(text) to service_role;");
    expect(usernameMigration).not.toContain("grant execute on function public.consume_username_login_attempt(text) to anon;");
    expect(usernameMigration).toContain("observed_at timestamptz := clock_timestamp()");
    expect(usernameMigration).not.toContain("current_time timestamptz");
    expect(usernameRateLimitFix).toContain("observed_at timestamptz := clock_timestamp()");
    expect(usernameLookupMigration).toContain("security definer");
    expect(usernameLookupMigration).toContain("grant execute on function public.resolve_username_login(text) to service_role;");
    expect(usernameLookupMigration).not.toContain("to anon;");
  });

  it("resolves usernames only inside the rate-limited login Edge Function", () => {
    expect(usernameLoginFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(usernameLoginFunction).toContain('keyFromSet("SUPABASE_SECRET_KEYS", "sb_secret_")');
    expect(usernameLoginFunction).toContain('keyFromSet("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_")');
    expect(usernameLoginFunction).toContain('Deno.env.get("LOGIN_RATE_LIMIT_SECRET")');
    expect(usernameLoginFunction).toContain('admin.rpc("consume_username_login_attempt"');
    expect(usernameLoginFunction).toContain('admin.rpc("resolve_username_login"');
    expect(usernameLoginFunction).not.toContain('.from("organization_members")');
    expect(usernameLoginFunction).not.toMatch(/return json\(\{[^}]*email/);
  });

  it("uses per-request CSP nonces without unsafe inline scripts", () => {
    expect(proxy).toContain("crypto.randomUUID()");
    expect(proxy).toContain("'strict-dynamic'");
    expect(proxy).toContain("script-src-attr 'none'");
    expect(proxy).not.toMatch(/script-src[^\n]+unsafe-inline/);
  });

  it("renders platform dates in one explicit timezone on server and browser", () => {
    expect(platformAdminPanel.match(/timeZone: "Europe\/Rome"/g)).toHaveLength(1);
    expect(platformAdminPanel).not.toContain("T12:00:00`");
  });

  it("permanently deletes a tenant only after exact confirmation and protects the platform office", () => {
    expect(simplifiedPlatformMigration).toContain("create or replace function public.platform_prepare_delete_office");
    expect(simplifiedPlatformMigration).toContain("create or replace function public.platform_delete_office");
    expect(simplifiedPlatformMigration).toContain("confirmation <> office_name");
    expect(simplifiedPlatformMigration).toContain("office_slug = 'alphatravel'");
    expect(simplifiedPlatformMigration).toContain("delete from public.payments");
    expect(simplifiedPlatformMigration).toContain("delete from public.registrations");
    expect(simplifiedPlatformMigration).toContain("delete from public.organizations");
  });

  it("builds the compact platform dashboard with aggregate rollups instead of per-row subqueries", () => {
    expect(simplifiedPlatformMigration).toContain("member_rollup as");
    expect(simplifiedPlatformMigration).toContain("cross join authorized");
    expect(simplifiedPlatformMigration).toContain("pilgrim_rollup as");
    expect(simplifiedPlatformMigration).toContain("trip_rollup as");
    expect(simplifiedPlatformMigration).not.toContain("'monthly'");
    expect(simplifiedPlatformMigration).not.toContain("'activity'");
  });

  it("enforces cross-trip and accounting invariants in PostgreSQL", () => {
    expect(operationalIntegrityMigration).toContain("create trigger registrations_capacity");
    expect(operationalIntegrityMigration).toContain("create trigger registrations_group_same_trip");
    expect(operationalIntegrityMigration).toContain("create trigger room_assignments_same_trip");
    expect(operationalIntegrityMigration).toContain("create trigger seat_assignments_same_trip");
    expect(operationalIntegrityMigration).toContain("create trigger payments_balance_guard");
    expect(operationalIntegrityMigration).toContain("for update;");
  });

  it("updates pilgrim core, emergency and health data atomically", () => {
    expect(atomicUpdateMigration).toContain("create or replace function public.update_pilgrim_with_details(payload jsonb)");
    expect(atomicUpdateMigration).toContain("security invoker");
    expect(atomicUpdateMigration).toContain("revoke all on function public.update_pilgrim_with_details(jsonb) from public;");
  });
});
