import "server-only";

import { createClient } from "./supabase/server";
import { roleLabels } from "./roles";
import type { AppRole } from "./types";

type AdminMemberRow = {
  user_id: string;
  display_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

type AuditRow = {
  id: number;
  actor_user_id: string | null;
  action: string;
  table_name: string;
  occurred_at: string;
};

export async function getAdminDashboardData() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase non configurato");

  const [membersResult, pilgrimsResult, tripsResult, registrationsResult, documentsResult, paymentsResult, auditsResult] = await Promise.all([
    supabase.from("organization_members").select("user_id,display_name,email,role,is_active,created_at").order("display_name"),
    supabase.from("pilgrims").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("trips").select("id", { count: "exact", head: true }),
    supabase.from("registrations").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("amount,status"),
    supabase.from("audit_logs").select("id,actor_user_id,action,table_name,occurred_at").order("occurred_at", { ascending: false }).limit(30),
  ]);

  const firstError = [membersResult, pilgrimsResult, tripsResult, registrationsResult, documentsResult, paymentsResult, auditsResult]
    .find((result) => result.error)?.error;
  if (firstError) {
    console.error("getAdminDashboardData failed", firstError.code);
    throw new Error("Impossibile caricare l’amministrazione");
  }

  const members = (membersResult.data ?? []) as AdminMemberRow[];
  const nameByUserId = new Map(members.map((member) => [member.user_id, member.display_name]));
  const payments = (paymentsResult.data ?? []) as Array<{ amount: number | string; status: string }>;
  const collected = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return {
    stats: {
      activeUsers: members.filter((member) => member.is_active).length,
      pilgrims: pilgrimsResult.count ?? 0,
      trips: tripsResult.count ?? 0,
      registrations: registrationsResult.count ?? 0,
      documents: documentsResult.count ?? 0,
      collected,
    },
    members: members.map((member) => ({
      userId: member.user_id,
      displayName: member.display_name,
      email: member.email ?? "Email non disponibile",
      roleKey: member.role,
      roleLabel: roleLabels[member.role],
      isActive: member.is_active,
      createdAt: member.created_at,
    })),
    audits: ((auditsResult.data ?? []) as AuditRow[]).map((audit) => ({
      id: audit.id,
      actor: audit.actor_user_id ? nameByUserId.get(audit.actor_user_id) ?? "Utente autorizzato" : "Sistema",
      action: audit.action,
      tableName: audit.table_name,
      occurredAt: audit.occurred_at,
    })),
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
