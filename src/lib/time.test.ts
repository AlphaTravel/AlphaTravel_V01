import { describe, expect, it } from "vitest";
import { localDateTimeToIso, todayInTimeZone } from "./time";

describe("travel date and time handling", () => {
  it("converts Italian summer and winter times without shifting activities", () => {
    expect(localDateTimeToIso("2027-09-10T10:00")).toBe("2027-09-10T08:00:00.000Z");
    expect(localDateTimeToIso("2027-01-10T10:00")).toBe("2027-01-10T09:00:00.000Z");
  });

  it("uses the office timezone for daily automation", () => {
    expect(todayInTimeZone("Europe/Rome", new Date("2027-01-01T23:30:00Z"))).toBe("2027-01-02");
  });
});
