import { buildCsv } from "@/lib/csv";
import { getCurrentMember, getPilgrims } from "@/lib/live-data";
import { canManageTravel } from "@/lib/permissions";

export async function GET() {
  const member = await getCurrentMember();
  if (!member || !canManageTravel(member.roleKey)) return new Response("Non autorizzato", { status: 403 });
  const pilgrims = await getPilgrims();
  const header = ["Nome", "Email", "Telefono", "Città", "Viaggio", "Gruppo", "Stato"];
  const lines = [header, ...pilgrims.map((pilgrim) => [pilgrim.name, pilgrim.email, pilgrim.phone, pilgrim.city, pilgrim.tripName, pilgrim.group, pilgrim.status])];
  const csv = buildCsv(lines);
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "attachment; filename=alphatravel-pellegrini.csv",
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
