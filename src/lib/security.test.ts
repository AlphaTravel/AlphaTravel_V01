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
const edgeFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/admin-users/index.ts"),
  "utf8",
);
const proxy = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");

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

  it("requires MFA for administrative reads and role changes", () => {
    expect(adminMigration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'");
    expect(adminMigration).toContain("coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'");
    expect(adminMigration).toContain("revoke insert, update, delete on table public.organization_members from authenticated;");
  });

  it("prevents removal of the last active administrator", () => {
    expect(adminMigration).toContain("create or replace function public.protect_last_active_admin()");
    expect(adminMigration).toContain("At least one active administrator is required");
  });

  it("keeps privileged invitation logic inside an authenticated Edge Function", () => {
    expect(edgeFunction).toContain('withSupabase({ auth: "user" }');
    expect(edgeFunction).toContain('jwtClaims?.aal !== "aal2"');
    expect(edgeFunction).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("uses per-request CSP nonces without unsafe inline scripts", () => {
    expect(proxy).toContain("crypto.randomUUID()");
    expect(proxy).toContain("'strict-dynamic'");
    expect(proxy).toContain("script-src-attr 'none'");
    expect(proxy).not.toMatch(/script-src[^\n]+unsafe-inline/);
  });
});
