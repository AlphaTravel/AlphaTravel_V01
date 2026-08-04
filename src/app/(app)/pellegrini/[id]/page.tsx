import { AlertTriangle, ArrowLeft, CalendarDays, FileText, FolderLock, HeartPulse, Mail, MapPin, Pencil, Phone, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMember, getPilgrims } from "@/lib/live-data";
import { canManageTravel, canReadPayments, canReadSensitivePilgrimData } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PilgrimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pilgrims, member] = await Promise.all([getPilgrims(), getCurrentMember()]);
  const pilgrim = pilgrims.find((item) => item.id === id);
  if (!pilgrim || !member) notFound();
  const canManage = canManageTravel(member.roleKey);
  const canSeeSensitive = canReadSensitivePilgrimData(member.roleKey);
  const canSeePayments = canReadPayments(member.roleKey);
  const visibleMissingItems = canSeePayments ? pilgrim.missingItems : pilgrim.missingItems.filter((item) => item !== "Saldo");

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
        <section className="panel detail-span-2"><div className="panel-header"><div><p className="eyebrow">Viaggio corrente</p><h2>{pilgrim.tripName}</h2></div><CalendarDays size={19} /></div><div className="info-grid"><span><small>Gruppo</small><strong>{pilgrim.group}</strong></span><span><small>Camera</small><strong>{pilgrim.room ?? "Da assegnare"}</strong></span><span><small>Posto pullman</small><strong>{pilgrim.coachSeat ?? "Da assegnare"}</strong></span>{canSeePayments ? <span><small>Quota</small><strong>{formatCurrency(pilgrim.paid)} / {formatCurrency(pilgrim.total)}</strong></span> : null}</div></section>
        <section className="panel"><div className="panel-header"><div><p className="eyebrow">Documenti</p><h2>Identità</h2></div><FileText size={19} /></div><div className="stacked-info"><span><small>Data di nascita</small><strong>{formatDate(pilgrim.birthDate)}</strong></span><span><small>Scadenza documento</small><strong>{formatDate(pilgrim.documentExpiry)}</strong></span></div></section>
        {canSeeSensitive ? <section className="panel sensitive-card"><div className="panel-header"><div><p className="eyebrow">Accesso ristretto</p><h2>Esigenze</h2></div><HeartPulse size={19} /></div><div className="stacked-info"><span><small>Mobilità</small><strong>{pilgrim.mobility}</strong></span><span><small>Cammino indicativo</small><strong>{pilgrim.walkingKm} km</strong></span><span><small>Alimentazione</small><strong>{pilgrim.dietary.join(", ") || "Nessuna esigenza"}</strong></span></div><div className="privacy-foot"><ShieldCheck size={14} /> Visibile solo ai ruoli autorizzati</div></section> : null}
        {canSeeSensitive ? <section className="panel"><div className="panel-header"><div><p className="eyebrow">Sicurezza</p><h2>Emergenza</h2></div><Users size={19} /></div><p className="emergency-contact">{pilgrim.emergencyContact}</p></section> : null}
      </div>
    </>
  );
}
