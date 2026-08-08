import "server-only";

import { createClient } from "./supabase/server";
import type { AppRole } from "./types";

export type PlatformOfficeMember = {
  userId: string;
  username: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
};

export type PlatformOffice = {
  id: string;
  name: string;
  contactEmail: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  activeMemberCount: number;
  pilgrimCount: number;
  tripCount: number;
  members: PlatformOfficeMember[];
};

export type PlatformDashboardData = {
  stats: {
    totalOffices: number;
    activeOffices: number;
    activeUsers: number;
    pilgrims: number;
    trips: number;
  };
  offices: PlatformOffice[];
};

type PlatformAdminIdentity = {
  userId: string;
  displayName: string;
  email: string;
};

function emptyDashboard(): PlatformDashboardData {
  return {
    stats: { totalOffices: 0, activeOffices: 0, activeUsers: 0, pilgrims: 0, trips: 0 },
    offices: [],
  };
}

export async function getCurrentPlatformAdmin(): Promise<PlatformAdminIdentity | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id,display_name")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: String(data.user_id),
    displayName: String(data.display_name),
    email: authData.user.email ?? "",
  };
}

export async function getAdminDashboardData(): Promise<PlatformDashboardData> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase non configurato");
  const { data, error } = await supabase.rpc("platform_dashboard");
  if (error) {
    console.error("platform_dashboard failed", error.code);
    throw new Error("Impossibile caricare il controllo piattaforma");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return emptyDashboard();
  return data as unknown as PlatformDashboardData;
}
