import { CreditCard, FileLock2, Route, UserCheck, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AdminMfaGate } from "@/components/admin-mfa-gate";
import { AdminPanel } from "@/components/admin-panel";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getAdminDashboardData } from "@/lib/admin-data";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/accesso-negato");
  if (member.roleKey !== "admin") notFound();

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase non configurato");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return (
      <>
        <PageHeader eyebrow="Area protetta" title="Amministrazione" description="Gestione utenti, autorizzazioni, analitiche e registro di sicurezza." />
        <AdminMfaGate hasVerifiedFactor={aal?.nextLevel === "aal2"} />
      </>
    );
  }

  const data = await getAdminDashboardData();
  return (
    <>
      <PageHeader eyebrow="Area protetta · MFA verificata" title="Amministrazione" description="Gestione utenti, autorizzazioni, analitiche e registro di sicurezza." />
      <section className="stat-grid" aria-label="Analitiche amministrative">
        <StatCard icon={UserCheck} label="Utenti attivi" value={String(data.stats.activeUsers)} detail="account autorizzati" tone="green" />
        <StatCard icon={Users} label="Pellegrini" value={String(data.stats.pilgrims)} detail={`${data.stats.registrations} iscrizioni attive`} />
        <StatCard icon={Route} label="Viaggi" value={String(data.stats.trips)} detail="nel database" tone="violet" />
        <StatCard icon={CreditCard} label="Incassato" value={formatCurrency(data.stats.collected)} detail={`${data.stats.documents} documenti privati`} tone="amber" />
      </section>
      <div className="admin-data-note"><FileLock2 size={17} /><span>Le analitiche sono aggregate. I dati riservati restano protetti dalle policy del database.</span></div>
      <AdminPanel data={data} currentUserId={member.id} />
    </>
  );
}
