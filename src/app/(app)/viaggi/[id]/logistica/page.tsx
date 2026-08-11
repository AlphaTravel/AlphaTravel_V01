import { notFound, redirect } from "next/navigation";
import { TripLogisticsManager, type LogisticsSection } from "@/components/trip-logistics-manager";
import { getCurrentMember, getTrips } from "@/lib/live-data";
import { getTripOperationsData } from "@/lib/trip-operations-data";

const validSections = new Set<LogisticsSection>(["participants", "rooms", "transport", "schedule"]);

export default async function TripLogisticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ section?: string }> }) {
  const { id } = await params;
  const { section } = await searchParams;
  const [trips, data, member] = await Promise.all([getTrips(), getTripOperationsData(id), getCurrentMember()]);
  if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato");
  const trip = trips.find((item) => item.id === id);
  if (!trip) notFound();
  const initialSection = section && validSections.has(section as LogisticsSection) ? section as LogisticsSection : "participants";
  return <TripLogisticsManager trip={trip} data={data} initialSection={initialSection} />;
}
