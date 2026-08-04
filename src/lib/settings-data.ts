import "server-only";

import { getCurrentMember } from "./live-data";
import { createClient } from "./supabase/server";
import type { AppRole } from "./types";

export async function getOrganizationSettings() {
  const member = await getCurrentMember();
  const supabase = await createClient();
  if (!member || !supabase) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const canManage = member.roleKey === "admin" && aal?.currentLevel === "aal2";
  const [organizationResult, membersResult] = await Promise.all([
    supabase.from("organizations").select("id,name,timezone,currency").eq("id", member.organizationId).single(),
    supabase.from("organization_members").select("role,is_active").eq("organization_id", member.organizationId),
  ]);
  if (organizationResult.error || membersResult.error || !organizationResult.data) {
    console.error("getOrganizationSettings failed", organizationResult.error?.code ?? membersResult.error?.code);
    return null;
  }

  const roleCounts: Record<AppRole, number> = { admin: 0, manager: 0, operator: 0, guide: 0, accountant: 0, viewer: 0 };
  for (const row of membersResult.data ?? []) {
    if (row.is_active && row.role in roleCounts) roleCounts[row.role as AppRole] += 1;
  }
  return {
    organization: organizationResult.data,
    roleCounts,
    canManage,
    canViewRoleCounts: canManage,
  };
}
