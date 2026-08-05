import { describe, expect, it } from "vitest";
import { defaultLandingPath, postLoginPath } from "./landing-path";

describe("defaultLandingPath", () => {
  it("sends platform administrators to the administration area", () => {
    expect(defaultLandingPath("admin", true)).toBe("/admin");
    expect(defaultLandingPath("admin")).toBe("/dashboard");
  });

  it("sends operational roles to the workspace dashboard", () => {
    expect(defaultLandingPath("manager")).toBe("/dashboard");
    expect(defaultLandingPath("operator")).toBe("/dashboard");
    expect(defaultLandingPath("guide")).toBe("/dashboard");
    expect(defaultLandingPath("accountant")).toBe("/dashboard");
    expect(defaultLandingPath("viewer")).toBe("/dashboard");
  });
});

describe("postLoginPath", () => {
  it("uses the role landing page for the root and direct login", () => {
    expect(postLoginPath("/", "admin", true)).toBe("/admin");
    expect(postLoginPath(null, "admin", true)).toBe("/admin");
    expect(postLoginPath("/login", "operator")).toBe("/dashboard");
  });

  it("always sends platform administrators to the control plane", () => {
    expect(postLoginPath("/dashboard", "admin", true)).toBe("/admin");
    expect(postLoginPath("/pellegrini", "admin", true)).toBe("/admin");
    expect(postLoginPath("//evil.example", "admin", true)).toBe("/admin");
  });

  it("preserves a valid protected destination for operational roles", () => {
    expect(postLoginPath("/pellegrini", "operator")).toBe("/pellegrini");
  });

  it("rejects external destinations", () => {
    expect(postLoginPath("https://evil.example", "admin", true)).toBe("/admin");
  });
});
