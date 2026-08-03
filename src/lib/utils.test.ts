import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, percentage } from "./utils";

describe("formatCurrency", () => {
  it("formats euros for the Italian locale", () => {
    expect(formatCurrency(12500)).toContain("12.500");
    expect(formatCurrency(12500)).toContain("€");
  });
});

describe("formatDate", () => {
  it("does not shift a date because of the local timezone", () => {
    expect(formatDate("2026-09-10")).toMatch(/10.*set.*2026/i);
  });
});

describe("percentage", () => {
  it("rounds and clamps a percentage", () => {
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(120, 100)).toBe(100);
    expect(percentage(10, 0)).toBe(0);
  });
});
