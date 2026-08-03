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
});
