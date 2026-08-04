import { AlertTriangle, BedDouble, BusFront, Footprints, Hotel, Salad, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentMember, getPilgrims, getTrips } from "@/lib/live-data";
import { canManageTravel, canReadPayments, canReadSensitivePilgrimData } from "@/lib/permissions";

export default async function OperationsPage() {
  const [trips, pilgrims, member] = await Promise.all([getTrips(), getPilgrims(), getCurrentMember()]);
  if (!member) redirect("/accesso-negato");
  const canManage = canManageTravel(member.roleKey);
  const canSeeSensitive = canReadSensitivePilgrimData(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  const trip = trips[0];
  const tripPilgrims = trip ? pilgrims.filter((pilgrim) => pilgrim.tripId === trip.id) : [];
  const specialMenus = tripPilgrims.filter((pilgrim) => pilgrim.dietary.length > 0).length;
  const assisted = tripPilgrims.filter((pilgrim) => pilgrim.mobility !== "Autonomo").length;
  const missingRooms = tripPilgrims.filter((pilgrim) => !pilgrim.room).length;
  const missingSeats = tripPilgrims.filter((pilgrim) => !pilgrim.coachSeat).length;
  const missingDocuments = tripPilgrims.filter((pilgrim) => pilgrim.missingItems.includes("Documento")).length;
  const openBalances = tripPilgrims.filter((pilgrim) => pilgrim.total > pilgrim.paid).length;
  const issueCount = (canSeeSensitive ? specialMenus + assisted : 0) + missingRooms + missingSeats + missingDocuments + (canSeePayments ? openBalances : 0);
  const readiness = tripPilgrims.length === 0 ? 0 : Math.max(0, Math.round(100 - (issueCount / Math.max(1, tripPilgrims.length * 4)) * 100));
  const groupCount = new Set(tripPilgrims.map((pilgrim) => pilgrim.group).filter((group) => group && group !== "Nessun gruppo")).size;
  const checks = [
    ...(canSeeSensitive ? [
      { icon: Salad, title: "Allergie e menu", value: specialMenus, detail: "esigenze alimentari da coordinare", tone: "rose" },
      { icon: Footprints, title: "Mobilità e cammini", value: assisted, detail: "persone con supporto o assistenza", tone: "amber" },
    ] : []),
    { icon: BedDouble, title: "Assegnazioni camere", value: missingRooms, detail: "persone ancora senza camera", tone: "violet" },
    { icon: BusFront, title: "Posti sui mezzi", value: missingSeats, detail: "persone ancora senza posto", tone: "blue" },
  ];

  return (
    <>
      <PageHeader eyebrow="Centro operativo" title="Operazioni" description="Controlli trasversali su esigenze, camere, trasporti e attività." action={trip ? <Link className="button button-primary" href={`/viaggi/${trip.id}`}>Apri il prossimo viaggio</Link> : canManage ? <Link className="button button-primary" href="/viaggi/nuovo">Crea il primo viaggio</Link> : undefined} />
      <section className="operation-grid">{checks.map(({ icon: Icon, title, value, detail, tone }) => <article className="operation-card" key={title}><span className={`alert-icon alert-icon-${tone}`}><Icon size={19} /></span><div><p>{title}</p><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
      {trip ? <div className="operations-layout">
        <section className="panel operations-main">
          <div className="panel-header"><div><p className="eyebrow">{trip.title}</p><h2>Controlli prima della partenza</h2></div><span className="readiness">{readiness}%</span></div>
          <div className="checklist">
            <div className={missingRooms ? "check-row check-warning" : "check-row check-ok"}><span>{missingRooms || "✓"}</span><p><strong>Rooming list</strong><small>{missingRooms ? `${missingRooms} partecipanti senza camera` : "Tutte le persone risultano assegnate"}</small></p><b>{missingRooms ? "Da completare" : "Completo"}</b></div>
            {canSeeSensitive ? <div className={specialMenus ? "check-row check-warning" : "check-row check-ok"}><span>{specialMenus || "✓"}</span><p><strong>Menu e allergie</strong><small>{specialMenus ? `${specialMenus} esigenze da condividere con i fornitori autorizzati` : "Nessuna esigenza registrata"}</small></p><b>{specialMenus ? "Da verificare" : "Completo"}</b></div> : null}
            <div className={missingSeats ? "check-row check-warning" : "check-row check-ok"}><span>{missingSeats || "✓"}</span><p><strong>Posti sui mezzi</strong><small>{missingSeats ? `${missingSeats} partecipanti non ancora assegnati` : "Assegnazioni complete"}</small></p><b>{missingSeats ? "In corso" : "Completo"}</b></div>
            <div className={missingDocuments ? "check-row check-warning" : "check-row check-ok"}><span>{missingDocuments || "✓"}</span><p><strong>Documenti personali</strong><small>{missingDocuments ? `${missingDocuments} documenti mancanti o in scadenza` : "Documenti verificati"}</small></p><b>{missingDocuments ? "Da verificare" : "Completo"}</b></div>
            {canSeePayments ? <div className={openBalances ? "check-row check-warning" : "check-row check-ok"}><span>{openBalances || "✓"}</span><p><strong>Saldi</strong><small>{openBalances ? `${openBalances} quote ancora aperte` : "Quote complete"}</small></p><b>{openBalances ? "Da incassare" : "Completo"}</b></div> : null}
          </div>
        </section>
        <aside className="panel">
          <div className="panel-header"><div><p className="eyebrow">Riepilogo servizi</p><h2>Inventario</h2></div><Hotel size={19} /></div>
          <div className="inventory-list"><span><Hotel size={16} /><p><strong>{trip.hotels} strutture</strong><small>collegate al viaggio</small></p></span><span><BusFront size={16} /><p><strong>{trip.coaches} mezzi</strong><small>configurati</small></p></span><span><Users size={16} /><p><strong>{groupCount} gruppi</strong><small>{trip.participants} partecipanti</small></p></span>{canSeeSensitive ? <span><ShieldAlert size={16} /><p><strong>{assisted} assistenze</strong><small>visibili solo agli incaricati</small></p></span> : null}</div>
          <div className="inline-warning"><AlertTriangle size={15} /> Le informazioni sanitarie non compaiono nelle esportazioni generiche.</div>
        </aside>
      </div> : <div className="empty-state"><h2>Nessun viaggio da controllare</h2><p>{canManage ? "Crea una partenza per attivare i controlli operativi." : "Nessuna partenza disponibile."}</p>{canManage ? <Link className="button button-primary" href="/viaggi/nuovo">Crea viaggio</Link> : null}</div>}
    </>
  );
}
