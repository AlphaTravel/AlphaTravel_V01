import type { AppRole } from "./types";

export const roleLabels: Record<AppRole, string> = {
  admin: "Amministratore",
  manager: "Responsabile",
  operator: "Operatore",
  guide: "Accompagnatore",
  accountant: "Contabilità",
  viewer: "Lettore",
};

export const roleOptions = (Object.entries(roleLabels) as Array<[AppRole, string]>).map(
  ([value, label]) => ({ value, label }),
);
