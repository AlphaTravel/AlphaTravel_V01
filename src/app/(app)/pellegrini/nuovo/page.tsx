import { PilgrimForm } from "@/components/pilgrim-form";
import { getTrips } from "@/lib/live-data";

export default async function NewPilgrimPage() {
  const trips = await getTrips();
  return <PilgrimForm tripOptions={trips.map(({ id, title }) => ({ id, title }))} />;
}
