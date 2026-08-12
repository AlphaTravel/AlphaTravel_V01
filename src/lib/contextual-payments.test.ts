import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("contextual payment navigation", () => {
  it("offers the balance action from both pilgrim and trip views", () => {
    const pilgrim = read("src/app/(app)/pellegrini/[id]/page.tsx");
    const trip = read("src/components/trip-workspace.tsx");
    expect(pilgrim).toContain("Pagamenti dei viaggi");
    expect(pilgrim).toContain("registrationId=${position.registrationId}");
    expect(trip).toContain("registrationId=${participant.registrationId}");
    expect(trip).toContain("?tab=Pagamenti");
  });

  it("accepts only a visible open registration and sanitizes the return path", () => {
    const page = read("src/app/(app)/pagamenti/nuovo/page.tsx");
    expect(page).toContain("positions.some((position) => position.registrationId === registrationId)");
    expect(page).toContain('safeLocalPath(returnTo, "/pagamenti")');
  });

  it("loads only the selected pilgrim payment positions in the profile", () => {
    const data = read("src/lib/payment-data.ts");
    const pilgrim = read("src/app/(app)/pellegrini/[id]/page.tsx");
    expect(data).toContain('query.eq("pilgrim_id", filters.pilgrimId)');
    expect(pilgrim).toContain("getPaymentDashboardData({ pilgrimId: id })");
  });

  it("refreshes every affected screen after recording a payment", () => {
    const actions = read("src/app/payment-actions.ts");
    expect(actions).toContain('revalidatePath("/pellegrini")');
    expect(actions).toContain("revalidatePath(`/pellegrini/${registration.pilgrim_id}`)");
    expect(actions).toContain("revalidatePath(`/viaggi/${registration.trip_id}`)");
  });
});
