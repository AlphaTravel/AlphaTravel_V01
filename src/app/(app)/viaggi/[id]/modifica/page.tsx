import { notFound, redirect } from "next/navigation";
import { TripEditForm } from "@/components/trip-edit-form";
import { getTripEditData } from "@/lib/edit-data";
import { getCurrentMember } from "@/lib/live-data";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [data, member] = await Promise.all([getTripEditData(id), getCurrentMember()]); if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato"); if (!data) notFound(); return <TripEditForm data={data} />;
}
