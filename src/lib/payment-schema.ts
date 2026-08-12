import { z } from "zod";

export const paymentSchema = z.object({
  registrationId: z.uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  status: z.enum(["pending", "paid", "overdue", "refunded"]),
  method: z.enum(["bank_transfer", "cash", "card_provider", "cheque", "other"]),
  dueOn: z.union([z.iso.date(), z.literal("")]),
  externalReference: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});
