import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentManager } from "@/components/document-manager";
import { PageHeader } from "@/components/page-header";
import { getPilgrimDocuments } from "@/lib/document-data";
import { getCurrentMember, getPilgrims } from "@/lib/live-data";
import { canManageTravel } from "@/lib/permissions";

export default async function PilgrimDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, pilgrims, documents] = await Promise.all([getCurrentMember(), getPilgrims(), getPilgrimDocuments(id)]);
  const pilgrim = pilgrims.find((item) => item.id === id);
  if (!member || !pilgrim) notFound();
  return <><div className="detail-nav"><Link href={`/pellegrini/${id}`}><ArrowLeft size={16} /> Torna alla scheda</Link></div><PageHeader eyebrow="Archivio protetto" title={`Documenti · ${pilgrim.name}`} description="File privati con controllo del formato e download temporanei firmati." /><DocumentManager pilgrimId={id} documents={documents} canUpload={canManageTravel(member.roleKey)} canDelete={["admin", "manager"].includes(member.roleKey)} /></>;
}
