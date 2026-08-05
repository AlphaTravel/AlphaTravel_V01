import "server-only";

import { createClient } from "./supabase/server";
import type { AppRole } from "./types";

export type PlatformOfficeMember = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

export type PlatformOffice = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  phone: string;
  timezone: string;
  currency: string;
  plan: "starter" | "professional" | "enterprise";
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
  isActive: boolean;
  userLimit: number;
  renewalDate: string | null;
  notes: string;
  createdAt: string;
  memberCount: number;
  pilgrimCount: number;
  tripCount: number;
  registrationCount: number;
  collected: number;
  isPlatformOffice: boolean;
  members: PlatformOfficeMember[];
};

export type PlatformDashboardData = {
  stats: {
    totalOffices: number;
    activeOffices: number;
    activeUsers: number;
    pilgrims: number;
    trips: number;
    registrations: number;
    collected: number;
  };
  offices: PlatformOffice[];
  monthly: Array<{
    month: string;
    offices: number;
    pilgrims: number;
    trips: number;
    collected: number;
  }>;
  activity: Array<{
    id: number;
    action: string;
    officeName: string;
    actorName: string;
    occurredAt: string;
  }>;
};

type PlatformAdminIdentity = {
  userId: string;
  displayName: string;
  email: string;
};

function emptyDashboard(): PlatformDashboardData {
  return {
    stats: { totalOffices: 0, activeOffices: 0, activeUsers: 0, pilgrims: 0, trips: 0, registrations: 0, collected: 0 },
    offices: [],
    monthly: [],
    activity: [],
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
