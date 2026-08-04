import { redirect } from "next/navigation";
import { TripForm } from "@/components/trip-form";
import { getCurrentMember } from "@/lib/live-data";

export default async function NewTripPage() {
  const member = await getCurrentMember();
  if (!member || !["admin", "manager", "operator"].includes(member.roleKey)) redirect("/accesso-negato");
  return <TripForm />;
}
