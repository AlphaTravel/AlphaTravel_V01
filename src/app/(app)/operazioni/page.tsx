import { AlertTriangle, BedDouble, BusFront, Footprints, Hotel, Salad, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

const checks = [
  { icon: Salad, title: "Allergie e menu", value: "11", detail: "2 allergie severe da confermare", tone: "rose" },
  { icon: Footprints, title: "Mobilità e cammini", value: "7", detail: "4 percorsi alternativi necessari", tone: "amber" },
  { icon: BedDouble, title: "Assegnazioni camere", value: "6", detail: "persone ancora senza camera", tone: "violet" },
  { icon: BusFront, title: "Posti pullman", value: "3", detail: "posti ancora da assegnare", tone: "blue" },
];

export default function OperationsPage() {
  return (
    <>
      <PageHeader eyebrow="Centro operativo" title="Operazioni" description="Controlli trasversali su esigenze, camere, trasporti e attività." action={<Link className="button button-primary" href="/viaggi/lourdes-2026">Apri il prossimo viaggio</Link>} />
      <section className="operation-grid">{checks.map(({ icon: Icon, title, value, detail, tone }) => <article className="operation-card" key={title}><span className={`alert-icon alert-icon-${tone}`}><Icon size={19} /></span><div><p>{title}</p><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
      <div className="operations-layout">
        <section className="panel operations-main">
          <div className="panel-header"><div><p className="eyebrow">Lourdes · Settembre 2026</p><h2>Controlli prima della partenza</h2></div><span className="readiness">78%</span></div>
          <div className="checklist">
            <div className="check-row check-ok"><span>✓</span><p><strong>Contratti hotel confermati</strong><small>Hotel Alba e Hotel Miramont · verificato il 2 agosto</small></p><b>Completo</b></div>
            <div className="check-row check-warning"><span>!</span><p><strong>Rooming list</strong><small>6 partecipanti senza camera, 1 richiesta accessibile aperta</small></p><b>Da completare</b></div>
            <div className="check-row check-warning"><span>!</span><p><strong>Menu e allergie</strong><small>Conferma scritta mancante per due allergie severe</small></p><b>Urgente</b></div>
            <div className="check-row"><span>3</span><p><strong>Posti pullman</strong><small>Tre partecipanti non ancora assegnati</small></p><b>In corso</b></div>
            <div className="check-row"><span>14</span><p><strong>Documenti personali</strong><small>11 mancanti e 3 in scadenza prima della partenza</small></p><b>Da verificare</b></div>
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><div><p className="eyebrow">Riepilogo servizi</p><h2>Inventario</h2></div><Hotel size={19} /></div>
          <div className="inventory-list"><span><Hotel size={16} /><p><strong>2 hotel</strong><small>74 camere totali</small></p></span><span><BusFront size={16} /><p><strong>3 pullman</strong><small>146 posti disponibili</small></p></span><span><Users size={16} /><p><strong>9 gruppi</strong><small>126 partecipanti</small></p></span><span><ShieldAlert size={16} /><p><strong>7 assistenze</strong><small>da condividere solo con incaricati</small></p></span></div>
          <div className="inline-warning"><AlertTriangle size={15} /> Le informazioni sanitarie non compaiono nelle esportazioni generiche.</div>
        </aside>
      </div>
    </>
  );
}
