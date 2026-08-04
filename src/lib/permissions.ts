import type { AppRole } from "./types";

const travelManagers: readonly AppRole[] = ["admin", "manager", "operator"];
const paymentReaders: readonly AppRole[] = ["admin", "manager", "operator", "accountant"];
const paymentWriters: readonly AppRole[] = ["admin", "manager", "accountant"];
const sensitiveReaders: readonly AppRole[] = ["admin", "manager", "operator", "guide"];

export function canManageTravel(role: AppRole) {
  return travelManagers.includes(role);
}

export function canReadPayments(role: AppRole) {
  return paymentReaders.includes(role);
}

export function canWritePayments(role: AppRole) {
  return paymentWriters.includes(role);
}

export function canReadSensitivePilgrimData(role: AppRole) {
  return sensitiveReaders.includes(role);
}
