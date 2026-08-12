import "server-only";

import { createClient } from "./supabase/server";
import type { PaymentStatus } from "./types";

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
}

function row(value: unknown): Row | undefined {
  return rows(value)[0] ?? (value && typeof value === "object" ? value as Row : undefined);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PaymentPosition = {
  registrationId: string;
  pilgrimName: string;
  tripName: string;
  agreed: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  nextDueOn: string | null;
};

export async function getPaymentDashboardData() {
  const supabase = await createClient();
  if (!supabase) return { positions: [] as PaymentPosition[], expected: 0, collected: 0, dueSoon: 0, overdue: 0 };

  const { data, error } = await supabase
    .from("registrations")
    .select("id,status,agreed_price,trips(title),pilgrims(first_name,last_name),payments(amount,status,due_on,paid_at)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getPaymentDashboardData failed", error.code);
    return { positions: [] as PaymentPosition[], expected: 0, collected: 0, dueSoon: 0, overdue: 0 };
  }

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const dueLimit = new Date(today);
  dueLimit.setDate(dueLimit.getDate() + 30);
  const dueLimitIso = dueLimit.toISOString().slice(0, 10);

  const positions: PaymentPosition[] = (data as unknown as Row[]).map((registration) => {
    const pilgrim = row(registration.pilgrims);
    const trip = row(registration.trips);
    const paymentRows = rows(registration.payments);
    const agreed = amount(registration.agreed_price);
    const paid = paymentRows.reduce((sum, payment) => sum + (["paid", "partial"].includes(text(payment.status)) ? amount(payment.amount) : text(payment.status) === "refunded" ? -amount(payment.amount) : 0), 0);
    const remaining = Math.max(0, agreed - paid);
    const openDueDates = paymentRows
      .filter((payment) => text(payment.status) !== "paid" && text(payment.status) !== "refunded" && text(payment.due_on))
      .map((payment) => text(payment.due_on))
      .sort();
    const hasOverduePayment = paymentRows.some((payment) =>
      (text(payment.status) === "overdue" || (text(payment.due_on) && text(payment.due_on) < todayIso))
      && text(payment.status) !== "paid"
      && text(payment.status) !== "refunded");
    let status: PaymentStatus = "Da pagare";
    if (remaining === 0) status = "Pagato";
    else if (hasOverduePayment) status = "Scaduto";
    else if (paid > 0) status = "Parziale";
    return {
      registrationId: text(registration.id),
      pilgrimName: `${text(pilgrim?.first_name)} ${text(pilgrim?.last_name)}`.trim() || "Pellegrino",
      tripName: text(trip?.title, "Viaggio"),
      agreed,
      paid,
      remaining,
      status,
      nextDueOn: openDueDates[0] ?? null,
    };
  });

  return {
    positions,
    expected: positions.reduce((sum, position) => sum + position.agreed, 0),
    collected: positions.reduce((sum, position) => sum + position.paid, 0),
    dueSoon: positions.filter((position) => position.remaining > 0 && position.nextDueOn && position.nextDueOn >= todayIso && position.nextDueOn <= dueLimitIso).reduce((sum, position) => sum + position.remaining, 0),
    overdue: positions.filter((position) => position.status === "Scaduto").reduce((sum, position) => sum + position.remaining, 0),
  };
}
