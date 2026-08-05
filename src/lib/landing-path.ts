import { safeLocalPath } from "./safe-redirect";
import type { AppRole } from "./types";

export function defaultLandingPath(role: AppRole, isPlatformAdmin = false) {
  return isPlatformAdmin ? "/admin" : "/dashboard";
}

export function postLoginPath(requestedPath: string | null | undefined, role: AppRole, isPlatformAdmin = false) {
  // Platform administrators always enter the dedicated control plane. Office
  // administrators remain in their own workspace.
  if (isPlatformAdmin) return "/admin";

  const requested = safeLocalPath(requestedPath, "/");
  return requested === "/" || requested === "/login"
    ? defaultLandingPath(role, isPlatformAdmin)
    : requested;
}
