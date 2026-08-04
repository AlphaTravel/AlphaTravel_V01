import { notFound, redirect } from "next/navigation";
import { PilgrimEditForm } from "@/components/pilgrim-edit-form";
import { getPilgrimEditData } from "@/lib/edit-data";
import { getCurrentMember } from "@/lib/live-data";

export default async function EditPilgrimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [data, member] = await Promise.all([getPilgrimEditData(id), getCurrentMember()]); if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato"); if (!data) notFound(); return <PilgrimEditForm data={data} />;
}
