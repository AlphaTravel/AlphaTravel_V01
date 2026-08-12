import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { paymentSchema } from "./payment-schema";
import { accommodationOperationSchema, itineraryOperationSchema, registrationOperationSchema, roomAssignmentOperationSchema, roomOperationSchema, seatAssignmentOperationSchema, tripGroupOperationSchema, vehicleOperationSchema } from "./trip-operation-schemas";
import { createTripSchema, updateTripSchema } from "./trip-schemas";

const tripId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const baseTrip = { title: "Lourdes 2027", code: "LRD-27", destination: "Lourdes", description: "", startDate: "2027-09-10", endDate: "2027-09-15", minimum: "20", capacity: "50", registrationDeadline: "2027-08-01", price: "900", deposit: "200", singleSupplement: "100", balanceDeadline: "2027-08-20" };

describe("trip creation and state validation", () => {
  it("accepts a valid trip and all editable lifecycle states", () => {
    expect(createTripSchema.safeParse(baseTrip).success).toBe(true);
    for (const status of ["draft", "open", "confirmed", "full", "completed", "cancelled"]) {
      expect(updateTripSchema.safeParse({ ...baseTrip, tripId, status, walkingKm: "15" }).success).toBe(true);
    }
  });

  it("rejects reversed dates and capacity below the minimum", () => {
    expect(createTripSchema.safeParse({ ...baseTrip, endDate: "2027-09-01" }).success).toBe(false);
    expect(createTripSchema.safeParse({ ...baseTrip, minimum: "51" }).success).toBe(false);
  });
});

describe("every trip organization form", () => {
  it("validates registration", () => expect(registrationOperationSchema.safeParse({ tripId, pilgrimId: otherId, groupId: "", roomPreference: "double", agreedPrice: "900", notes: "" }).success).toBe(true));
  it("validates groups", () => expect(tripGroupOperationSchema.safeParse({ tripId, name: "Parrocchia Centro", leaderName: "", leaderPhone: "", meetingPoint: "", notes: "" }).success).toBe(true));
  it("validates accommodations", () => expect(accommodationOperationSchema.safeParse({ tripId, name: "Hotel Alba", city: "Lourdes", address: "", phone: "", accessibleRooms: "2" }).success).toBe(true));
  it("validates rooms and blocks impossible capacity", () => {
    expect(roomOperationSchema.safeParse({ tripId, accommodationId: otherId, roomNumber: "101", roomType: "double", capacity: "2", floor: "1", accessible: "false" }).success).toBe(true);
    expect(roomOperationSchema.safeParse({ tripId, accommodationId: otherId, roomNumber: "101", roomType: "double", capacity: "21", floor: "1", accessible: "false" }).success).toBe(false);
  });
  it("validates room assignment", () => expect(roomAssignmentOperationSchema.safeParse({ tripId, roomId: otherId, registrationId: tripId }).success).toBe(true));
  it("validates vehicles and their capacity", () => {
    expect(vehicleOperationSchema.safeParse({ tripId, name: "Pullman 1", vehicleType: "coach", operatorName: "", reference: "", capacity: "54" }).success).toBe(true);
    expect(vehicleOperationSchema.safeParse({ tripId, name: "Pullman 1", vehicleType: "coach", operatorName: "", reference: "", capacity: "0" }).success).toBe(false);
  });
  it("validates seat assignment", () => expect(seatAssignmentOperationSchema.safeParse({ tripId, vehicleSeatId: otherId, registrationId: tripId }).success).toBe(true));
  it("validates itinerary and rejects an end before the start", () => {
    const item = { tripId, startsAt: "2027-09-10T10:00", endsAt: "2027-09-10T11:00", itemType: "walk", title: "Cammino", details: "", location: "Lourdes", walkingKm: "5", difficulty: "easy", accessibleAlternative: "Navetta" };
    expect(itineraryOperationSchema.safeParse(item).success).toBe(true);
    expect(itineraryOperationSchema.safeParse({ ...item, endsAt: "2027-09-10T09:00" }).success).toBe(false);
  });
  it("validates payments and blocks non-positive amounts", () => {
    const payment = { registrationId: tripId, amount: "100", status: "paid", method: "bank_transfer", dueOn: "", externalReference: "", notes: "" };
    expect(paymentSchema.safeParse(payment).success).toBe(true);
    expect(paymentSchema.safeParse({ ...payment, amount: "0" }).success).toBe(false);
  });
});

describe("trip database invariants", () => {
  const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608120001_one_seat_per_registration.sql"), "utf8");
  const capacityMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608120003_trip_capacity_floor.sql"), "utf8");
  const integrityMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608120004_travel_integrity.sql"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/app/trip-operations-actions.ts"), "utf8");

  it("enforces one seat per registration and replaces it atomically", () => {
    expect(migration).toContain("seat_assignments_registration_unique_idx");
    expect(actions).toContain('{ onConflict: "registration_id" }');
  });

  it("synchronizes the document archive with automatic readiness", () => {
    expect(migration).toContain("sync_pilgrim_document_expiry");
    expect(migration).toContain("documents_sync_pilgrim_expiry");
  });

  it("prevents capacity from dropping below active registrations", () => {
    expect(capacityMigration).toContain("enforce_trip_capacity_floor");
    expect(capacityMigration).toContain("status <> 'cancelled'");
  });

  it("enforces registration windows, itinerary dates and document tenancy in PostgreSQL", () => {
    expect(integrityMigration).toContain("enforce_registration_window");
    expect(integrityMigration).toContain("enforce_itinerary_within_trip");
    expect(integrityMigration).toContain("enforce_document_same_organization");
  });
});
