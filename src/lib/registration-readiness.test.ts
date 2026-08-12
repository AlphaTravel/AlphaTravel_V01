import { describe, expect, it } from "vitest";
import { hasOverduePayment, latestIdentityDocumentExpiry, paidAmount, pickRelevantRegistration, registrationReadiness } from "./registration-readiness";

const ready = {
  hasRegistration: true,
  registrationStatus: "incomplete",
  documentExpiry: "2028-01-01",
  tripEnd: "2027-09-20",
  hasRoom: true,
  hasSeat: true,
  agreed: 1000,
  paid: 1000,
  balanceDueOn: "2027-08-01",
  today: "2027-07-01",
} as const;

describe("automatic registration readiness", () => {
  it("becomes ready even if the obsolete stored value is incomplete", () => {
    expect(registrationReadiness(ready)).toEqual({ status: "Pronto", missingItems: [], paymentStatus: "Pagato" });
  });

  it("separates missing data, organization and payments", () => {
    expect(registrationReadiness({ ...ready, documentExpiry: "" }).status).toBe("Da completare");
    expect(registrationReadiness({ ...ready, hasRoom: false }).status).toBe("Da organizzare");
    expect(registrationReadiness({ ...ready, paid: 300 }).status).toBe("In attesa");
    expect(registrationReadiness({ ...ready, paid: 300, today: "2027-08-02" }).status).toBe("Da completare");
  });

  it("handles non-enrolled and cancelled people explicitly", () => {
    expect(registrationReadiness({ hasRegistration: false, today: "2027-01-01" }).status).toBe("Non iscritto");
    expect(registrationReadiness({ ...ready, registrationStatus: "cancelled" }).status).toBe("Annullato");
  });

  it("uses the latest real identity document and net paid amount", () => {
    expect(latestIdentityDocumentExpiry({ document_expiry: "2026-01-01", documents: [{ kind: "identity", expires_on: "2028-01-01" }, { kind: "consent", expires_on: "2030-01-01" }] })).toBe("2028-01-01");
    expect(paidAmount([{ amount: 500, status: "paid" }, { amount: 100, status: "refunded" }, { amount: 200, status: "pending" }])).toBe(400);
    expect(hasOverduePayment([{ amount: 200, status: "pending", due_on: "2027-01-01" }], "2027-01-02")).toBe(true);
  });

  it("selects the nearest future trip instead of an arbitrary registration", () => {
    const selected = pickRelevantRegistration([
      { id: "old", status: "confirmed", trips: { starts_on: "2026-01-01", ends_on: "2026-01-07" } },
      { id: "later", status: "pending", trips: { starts_on: "2028-01-01", ends_on: "2028-01-07" } },
      { id: "next", status: "incomplete", trips: { starts_on: "2027-06-01", ends_on: "2027-06-07" } },
    ], "2027-01-01");
    expect(selected?.id).toBe("next");
    expect(pickRelevantRegistration([{ id: "old", status: "confirmed", trips: { starts_on: "2026-01-01", ends_on: "2026-01-07" } }], "2027-01-01")).toBeUndefined();
  });
});
