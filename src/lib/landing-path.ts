import { safeLocalPath } from "./safe-redirect";
import type { AppRole } from "./types";

export function defaultLandingPath(role: AppRole) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function postLoginPath(requestedPath: string | null | undefined, role: AppRole) {
  // Administrative sessions must always enter through the protected admin gate.
  // In particular, never let a stale or attacker-controlled `next` parameter
  // bypass the role-specific landing page (the admin page enforces MFA).
  if (role === "admin") return "/admin";

  const requested = safeLocalPath(requestedPath, "/");
  return requested === "/" || requested === "/login"
    ? defaultLandingPath(role)
    : requested;
}
