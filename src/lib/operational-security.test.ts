import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tripActions = readFileSync(resolve(process.cwd(), "src/app/trip-operations-actions.ts"), "utf8");
const paymentActions = readFileSync(resolve(process.cwd(), "src/app/payment-actions.ts"), "utf8");
const settingsActions = readFileSync(resolve(process.cwd(), "src/app/settings-actions.ts"), "utf8");
const coreActions = readFileSync(resolve(process.cwd(), "src/app/actions.ts"), "utf8");
const documentRoute = readFileSync(resolve(process.cwd(), "src/app/api/documents/route.ts"), "utf8");
const proxy = readFileSync(resolve(process.cwd(), "src/lib/supabase/proxy.ts"), "utf8");
const liveData = readFileSync(resolve(process.cwd(), "src/lib/live-data.ts"), "utf8");

describe("operational server-action authorization", () => {
  it("restricts logistics changes to operational roles and derives the tenant server-side", () => {
    expect(tripActions).toContain('["admin", "manager", "operator"].includes(member.roleKey)');
    expect(tripActions).toContain("organization_id: context.member.organizationId");
    expect(tripActions).not.toMatch(/organizationId:\s*z\./);
  });

  it("restricts payment writes to finance-capable roles", () => {
    expect(paymentActions).toContain('["admin", "manager", "accountant"].includes(member.roleKey)');
    expect(paymentActions).toContain("organization_id: member.organizationId");
  });

  it("requires an authenticated office administrator before organization changes", () => {
    expect(settingsActions).toContain('member.roleKey !== "admin"');
    expect(settingsActions).not.toContain("auth.mfa");
    expect(settingsActions).toContain('.eq("id", member.organizationId)');
  });

  it("checks roles before editing pilgrims and trips", () => {
    expect(coreActions.match(/\["admin", "manager", "operator"\]\.includes\(member\.roleKey\)/g)).toHaveLength(4);
  });

  it("fails closed when Supabase is unavailable", () => {
    expect(liveData).not.toContain("demo-admin");
    expect(liveData).not.toContain("demoTrips");
    expect(proxy).toContain('url.pathname = "/accesso-negato"');
  });

  it("validates private documents by binary signature and server-derived tenant", () => {
    expect(documentRoute).toContain("detectDocumentMime(bytes)");
    expect(documentRoute).toContain("organization_id: member.organizationId");
    expect(documentRoute).toContain('parsed.data.kind !== "voucher"');
  });
});
