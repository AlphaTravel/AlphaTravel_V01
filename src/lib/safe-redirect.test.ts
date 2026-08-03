import { describe, expect, it } from "vitest";
import { safeLocalPath } from "./safe-redirect";

describe("safeLocalPath", () => {
  it("keeps local application paths", () => {
    expect(safeLocalPath("/viaggi?stato=aperto#inizio")).toBe("/viaggi?stato=aperto#inizio");
  });

  it("rejects absolute, protocol-relative and backslash-based redirects", () => {
    expect(safeLocalPath("https://example.com")).toBe("/dashboard");
    expect(safeLocalPath("//example.com/path")).toBe("/dashboard");
    expect(safeLocalPath("/\\example.com/path")).toBe("/dashboard");
  });

  it("uses the requested fallback for empty or invalid values", () => {
    expect(safeLocalPath(null, "/login")).toBe("/login");
    expect(safeLocalPath("dashboard", "/login")).toBe("/login");
  });
});
