import { buildCsv } from "@/lib/csv";
import { getCurrentMember } from "@/lib/live-data";
import { getPaymentDashboardData } from "@/lib/payment-data";

export async function GET() {
  const member = await getCurrentMember();
  if (!member || !["admin", "manager", "accountant"].includes(member.roleKey)) {
    return new Response("Non autorizzato", { status: 403 });
  }
  const data = await getPaymentDashboardData();
  const header = ["Pellegrino", "Viaggio", "Quota", "Versato", "Residuo", "Stato", "Prossima scadenza"];
  const lines = [header, ...data.positions.map((position) => [position.pilgrimName, position.tripName, position.agreed, position.paid, position.remaining, position.status, position.nextDueOn ?? ""])];
  const csv = buildCsv(lines);
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "attachment; filename=alphatravel-pagamenti.csv",
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
