import { redirect } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { getCurrentMember } from "@/lib/live-data";
import { getPaymentDashboardData } from "@/lib/payment-data";

export default async function NewPaymentPage() {
  const [data, member] = await Promise.all([getPaymentDashboardData(), getCurrentMember()]);
  if (!member || !["admin", "manager", "accountant"].includes(member.roleKey)) redirect("/accesso-negato");
  return <PaymentForm positions={data.positions.filter((position) => position.remaining > 0)} />;
}
