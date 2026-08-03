import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PilgrimTable } from "@/components/pilgrim-table";
import { getPilgrims } from "@/lib/live-data";

export default async function PilgrimsPage() {
  const pilgrims = await getPilgrims();
  return (
    <>
      <PageHeader
        eyebrow="Anagrafica centralizzata"
        title="Pellegrini"
        description="Contatti, esigenze, documenti e storico viaggi in un’unica scheda."
        action={<><button className="button button-secondary"><Download size={15} /> Esporta</button><Link className="button button-primary" href="/pellegrini/nuovo"><Plus size={15} /> Nuovo pellegrino</Link></>}
      />
      <div className="summary-strip">
        <span><strong>{pilgrims.length}</strong> attivi</span><span><strong>{pilgrims.filter((item) => !item.missingItems.length).length}</strong> completi</span><span><strong>{pilgrims.filter((item) => item.missingItems.length).length}</strong> da verificare</span><span><strong>{pilgrims.filter((item) => item.status === "In attesa").length}</strong> in attesa</span>
      </div>
      <PilgrimTable data={pilgrims} />
    </>
  );
}
