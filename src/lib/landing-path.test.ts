import { describe, expect, it } from "vitest";
import { defaultLandingPath, postLoginPath } from "./landing-path";

describe("defaultLandingPath", () => {
  it("sends administrators to the administration area", () => {
    expect(defaultLandingPath("admin")).toBe("/admin");
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
    expect(postLoginPath("/", "admin")).toBe("/admin");
    expect(postLoginPath(null, "admin")).toBe("/admin");
    expect(postLoginPath("/login", "operator")).toBe("/dashboard");
  });

  it("always sends administrators through the MFA-protected administration area", () => {
    expect(postLoginPath("/dashboard", "admin")).toBe("/admin");
    expect(postLoginPath("/pellegrini", "admin")).toBe("/admin");
    expect(postLoginPath("//evil.example", "admin")).toBe("/admin");
  });

  it("preserves a valid protected destination for operational roles", () => {
    expect(postLoginPath("/pellegrini", "operator")).toBe("/pellegrini");
  });

  it("rejects external destinations", () => {
    expect(postLoginPath("https://evil.example", "admin")).toBe("/admin");
  });
});
