import { notFound, redirect } from "next/navigation";
import { TripLogisticsManager } from "@/components/trip-logistics-manager";
import { getCurrentMember, getTrips } from "@/lib/live-data";
import { getTripOperationsData } from "@/lib/trip-operations-data";

export default async function TripLogisticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trips, data, member] = await Promise.all([getTrips(), getTripOperationsData(id), getCurrentMember()]);
  if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato");
  const trip = trips.find((item) => item.id === id);
  if (!trip) notFound();
  return <TripLogisticsManager trip={trip} data={data} />;
}
