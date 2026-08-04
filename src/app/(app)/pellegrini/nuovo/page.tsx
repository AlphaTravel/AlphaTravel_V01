import { redirect } from "next/navigation";
import { PilgrimForm } from "@/components/pilgrim-form";
import { getCurrentMember, getTrips } from "@/lib/live-data";

export default async function NewPilgrimPage() {
  const [trips, member] = await Promise.all([getTrips(), getCurrentMember()]);
  if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato");
  return <PilgrimForm tripOptions={trips.map(({ id, title }) => ({ id, title }))} />;
}
