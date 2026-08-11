import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PilgrimTable } from "@/components/pilgrim-table";
import { getCurrentMember, getPilgrims } from "@/lib/live-data";
import { canManageTravel, canReadPayments } from "@/lib/permissions";

export default async function PilgrimsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [pilgrims, member] = await Promise.all([getPilgrims(), getCurrentMember()]);
  if (!member) redirect("/accesso-negato");
  const canManage = canManageTravel(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  const visibleMissingItems = (items: string[]) => canSeePayments ? items : items.filter((item) => item !== "Saldo");
  return (
    <>
      <PageHeader
        eyebrow="Anagrafica centralizzata"
        title="Pellegrini"
        description="Contatti, esigenze, documenti e storico viaggi in un’unica scheda."
        action={canManage ? <><a className="button button-secondary" href="/api/exports/pilgrims"><Download size={15} /> Esporta</a><Link className="button button-primary" href="/pellegrini/nuovo"><Plus size={15} /> Nuovo pellegrino</Link></> : undefined}
      />
      <div className="summary-strip">
        <span><strong>{pilgrims.length}</strong> attivi</span><span><strong>{pilgrims.filter((item) => !visibleMissingItems(item.missingItems).length).length}</strong> completi</span><span><strong>{pilgrims.filter((item) => visibleMissingItems(item.missingItems).length).length}</strong> da verificare</span>
      </div>
      <PilgrimTable data={pilgrims} initialQuery={q.slice(0, 120)} canViewPayments={canSeePayments} />
    </>
  );
}
