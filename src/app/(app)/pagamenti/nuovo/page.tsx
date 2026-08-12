import { redirect } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { getCurrentMember } from "@/lib/live-data";
import { getPaymentDashboardData } from "@/lib/payment-data";
import { safeLocalPath } from "@/lib/safe-redirect";

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ registrationId?: string; returnTo?: string }> }) {
  const { registrationId, returnTo } = await searchParams;
  const [data, member] = await Promise.all([getPaymentDashboardData(), getCurrentMember()]);
  if (!member || !["admin", "manager", "accountant"].includes(member.roleKey)) redirect("/accesso-negato");
  const positions = data.positions.filter((position) => position.remaining > 0);
  const defaultRegistrationId = positions.some((position) => position.registrationId === registrationId) ? registrationId : undefined;
  return <PaymentForm positions={positions} defaultRegistrationId={defaultRegistrationId} returnTo={safeLocalPath(returnTo, "/pagamenti")} />;
}
