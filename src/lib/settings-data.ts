import "server-only";

import { getCurrentMember } from "./live-data";
import { createClient } from "./supabase/server";

export async function getOrganizationSettings() {
  const member = await getCurrentMember();
  const supabase = await createClient();
  if (!member || !supabase) return null;

  const canManage = member.roleKey === "admin";
  const organizationResult = await supabase
    .from("organizations")
    .select("id,name,timezone,currency")
    .eq("id", member.organizationId)
    .single();
  if (organizationResult.error || !organizationResult.data) {
    console.error("getOrganizationSettings failed", organizationResult.error?.code);
    return null;
  }
  return {
    organization: organizationResult.data,
    canManage,
  };
}
