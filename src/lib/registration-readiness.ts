import type { PaymentStatus, PilgrimStatus } from "./types";
import { todayInTimeZone } from "./time";

type UnknownRow = Record<string, unknown>;

export type RegistrationReadinessInput = {
  hasRegistration: boolean;
  registrationStatus?: string | null;
  documentExpiry?: string | null;
  tripEnd?: string | null;
  hasRoom?: boolean;
  hasSeat?: boolean;
  agreed?: number;
  paid?: number;
  balanceDueOn?: string | null;
  hasOverduePayment?: boolean;
  today?: string;
};

export type RegistrationReadiness = {
  status: PilgrimStatus;
  missingItems: string[];
  paymentStatus: PaymentStatus;
};

function isoToday() {
  return todayInTimeZone();
}

export function paidAmount(payments: UnknownRow[]) {
  return payments.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0;
    if (["paid", "partial"].includes(String(payment.status))) return sum + amount;
    if (payment.status === "refunded") return sum - amount;
    return sum;
  }, 0);
}

export function hasOverduePayment(payments: UnknownRow[], today = isoToday()) {
  return payments.some((payment) => payment.status === "overdue" || (
    typeof payment.due_on === "string"
    && payment.due_on < today
    && !["paid", "refunded"].includes(String(payment.status))
  ));
}

export function latestIdentityDocumentExpiry(pilgrim: UnknownRow | undefined) {
  if (!pilgrim) return "";
  const documents = Array.isArray(pilgrim.documents) ? pilgrim.documents as UnknownRow[] : [];
  const expiries = documents
    .filter((document) => ["identity", "passport"].includes(String(document.kind)))
    .map((document) => typeof document.expires_on === "string" ? document.expires_on : "")
    .filter(Boolean)
    .sort();
  return expiries.at(-1) ?? (typeof pilgrim.document_expiry === "string" ? pilgrim.document_expiry : "");
}

export function registrationReadiness(input: RegistrationReadinessInput): RegistrationReadiness {
  const today = input.today ?? isoToday();
  const agreed = Math.max(0, input.agreed ?? 0);
  const paid = Math.max(0, input.paid ?? 0);
  const remaining = Math.max(0, agreed - paid);
  const overdue = remaining > 0 && (Boolean(input.hasOverduePayment) || (Boolean(input.balanceDueOn) && String(input.balanceDueOn) < today));
  let paymentStatus: PaymentStatus = "Da pagare";
  if (remaining === 0) paymentStatus = "Pagato";
  else if (overdue) paymentStatus = "Scaduto";
  else if (paid > 0) paymentStatus = "Parziale";

  if (!input.hasRegistration) return { status: "Non iscritto", missingItems: ["Viaggio"], paymentStatus };
  if (input.registrationStatus === "cancelled") return { status: "Annullato", missingItems: [], paymentStatus };

  const missingItems: string[] = [];
  const expiry = input.documentExpiry ?? "";
  const invalidDocument = !expiry || Boolean(input.tripEnd && expiry < input.tripEnd) || expiry < today;
  if (invalidDocument) missingItems.push(expiry ? "Documento non valido" : "Documento");
  if (remaining > 0) missingItems.push(overdue ? "Saldo scaduto" : "Saldo");
  if (!input.hasRoom) missingItems.push("Camera");
  if (!input.hasSeat) missingItems.push("Posto");

  if (invalidDocument || overdue) return { status: "Da completare", missingItems, paymentStatus };
  if (!input.hasRoom || !input.hasSeat) return { status: "Da organizzare", missingItems, paymentStatus };
  if (remaining > 0) return { status: "In attesa", missingItems, paymentStatus };
  return { status: "Pronto", missingItems, paymentStatus };
}

export function pickRelevantRegistration(registrations: UnknownRow[], today = isoToday()) {
  const isCurrentOrFuture = (registration: UnknownRow) => {
    const trip = Array.isArray(registration.trips) ? registration.trips[0] as UnknownRow | undefined : registration.trips as UnknownRow | undefined;
    return String(trip?.ends_on ?? "") >= today;
  };
  const relevant = registrations.filter(isCurrentOrFuture);
  const active = relevant.filter((registration) => registration.status !== "cancelled");
  const pool = active.length ? active : relevant;
  return [...pool].sort((left, right) => {
    const leftTrip = Array.isArray(left.trips) ? left.trips[0] as UnknownRow | undefined : left.trips as UnknownRow | undefined;
    const rightTrip = Array.isArray(right.trips) ? right.trips[0] as UnknownRow | undefined : right.trips as UnknownRow | undefined;
    const leftStart = String(leftTrip?.starts_on ?? "");
    const rightStart = String(rightTrip?.starts_on ?? "");
    const leftFuture = leftStart > today;
    const rightFuture = rightStart > today;
    if (leftFuture !== rightFuture) return leftFuture ? -1 : 1;
    return leftFuture ? leftStart.localeCompare(rightStart) : rightStart.localeCompare(leftStart);
  })[0];
}
