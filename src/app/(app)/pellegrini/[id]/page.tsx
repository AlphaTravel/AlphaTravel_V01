import { AlertTriangle, ArrowLeft, CalendarDays, CircleDollarSign, FileText, FolderLock, HeartPulse, Mail, MapPin, Pencil, Phone, ReceiptText, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMember, getPilgrims } from "@/lib/live-data";
import { getPaymentDashboardData } from "@/lib/payment-data";
import { canManageTravel, canReadPayments, canReadSensitivePilgrimData, canWritePayments } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PilgrimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) notFound();
  const canManage = canManageTravel(member.roleKey);
  const canSeeSensitive = canReadSensitivePilgrimData(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  const canRecordPayments = canWritePayments(member.roleKey);
  const [pilgrims, paymentData] = await Promise.all([getPilgrims(), canSeePayments ? getPaymentDashboardData({ pilgrimId: id }) : Promise.resolve({ positions: [] })]);
  const pilgrim = pilgrims.find((item) => item.id === id);
  if (!pilgrim) notFound();
  const paymentPositions = paymentData.positions.filter((position) => position.pilgrimId === pilgrim.id);
  const visibleMissingItems = canSeePayments ? pilgrim.missingItems : pilgrim.missingItems.filter((item) => !item.startsWith("Saldo"));
  const readableDate = (value: string) => value ? formatDate(value) : "Non indicata";

  return (
    <>
      <div className="detail-nav"><Link href="/pellegrini"><ArrowLeft size={16} /> Pellegrini</Link><div className="page-actions"><Link className="button button-secondary" href={`/pellegrini/${pilgrim.id}/documenti`}><FolderLock size={15} /> Documenti</Link>{canManage ? <Link className="button button-secondary" href={`/pellegrini/${pilgrim.id}/modifica`}><Pencil size={15} /> Modifica</Link> : null}</div></div>
      <header className="profile-header">
        <span className="profile-avatar">{pilgrim.initials}</span>
        <div><p className="eyebrow">Scheda pellegrino</p><h1>{pilgrim.name}</h1><div className="profile-meta"><span><Mail size={14} /> {pilgrim.email}</span><span><Phone size={14} /> {pilgrim.phone}</span><span><MapPin size={14} /> {pilgrim.city}</span></div></div>
        <StatusBadge label={pilgrim.status} />
      </header>
      {visibleMissingItems.length ? <div className="warning-banner"><AlertTriangle size={18} /><div><strong>Scheda da completare</strong><span>{visibleMissingItems.join(" · ")}</span></div></div> : null}
      <div className="detail-grid">
        <section className="panel detail-span-2"><div className="panel-header"><div><p className="eyebrow">Viaggio corrente</p><h2>{pilgrim.tripName}</h2></div><CalendarDays size={19} /></div><div className="info-grid"><span><small>Gruppo</small><strong>{pilgrim.group}</strong></span><span><small>Camera</small><strong>{pilgrim.room ?? (pilgrim.roomRequired ? "Da assegnare" : "Non prevista")}</strong></span><span><small>Posto pullman</small><strong>{pilgrim.coachSeat ?? (pilgrim.seatRequired ? "Da assegnare" : "Non previsto")}</strong></span>{canSeePayments ? <span><small>Quota</small><strong>{formatCurrency(pilgrim.paid)} / {formatCurrency(pilgrim.total)}</strong></span> : null}</div></section>
        {canSeePayments ? <section className="panel detail-span-2"><div className="panel-header"><div><p className="eyebrow">Contabilità del pellegrino</p><h2>Pagamenti dei viaggi</h2></div><CircleDollarSign size={19} /></div><div className="context-payment-list">{paymentPositions.length ? paymentPositions.map((position) => <div className="context-payment-row" key={position.registrationId}><span><strong>{position.tripName}</strong><small>Versato {formatCurrency(position.paid)} su {formatCurrency(position.agreed)}</small></span><span><strong>{formatCurrency(position.remaining)}</strong><small>residuo</small></span><StatusBadge label={position.status} />{canRecordPayments && position.remaining > 0 ? <Link className="button button-primary context-payment-action" href={`/pagamenti/nuovo?registrationId=${position.registrationId}&returnTo=${encodeURIComponent(`/pellegrini/${pilgrim.id}`)}`}><ReceiptText size={14} /> Salda {formatCurrency(position.remaining)}</Link> : <span className="context-payment-complete">Saldo completato</span>}</div>) : <div className="empty-inline">Nessun viaggio associato.</div>}</div></section> : null}
        <section className="panel"><div className="panel-header"><div><p className="eyebrow">Dati personali</p><h2>Identità e documento</h2></div><FileText size={19} /></div><div className="stacked-info"><span><small>Data di nascita</small><strong>{readableDate(pilgrim.birthDate)}</strong></span><span><small>Scadenza documento</small><strong>{readableDate(pilgrim.documentExpiry)}</strong></span></div></section>
        {canSeeSensitive ? <section className="panel sensitive-card"><div className="panel-header"><div><p className="eyebrow">Dati riservati</p><h2>Esigenze personali</h2></div><HeartPulse size={19} /></div><div className="stacked-info"><span><small>Mobilità</small><strong>{pilgrim.mobility}</strong></span><span><small>Cammino indicativo</small><strong>{pilgrim.walkingKm} km</strong></span><span><small>Alimentazione</small><strong>{pilgrim.dietary.join(", ") || "Nessuna esigenza"}</strong></span></div><div className="privacy-foot"><ShieldCheck size={14} /> Visibile solo ai ruoli autorizzati</div></section> : null}
        {canSeeSensitive ? <section className="panel"><div className="panel-header"><div><p className="eyebrow">Contatto</p><h2>Emergenza</h2></div><Users size={19} /></div><p className="emergency-contact">{pilgrim.emergencyContact}</p></section> : null}
      </div>
    </>
  );
}
