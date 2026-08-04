"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";

export type PaymentActionResult = { ok: boolean; message: string };

const paymentSchema = z.object({
  registrationId: z.uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  status: z.enum(["pending", "paid", "overdue", "refunded"]),
  method: z.enum(["bank_transfer", "cash", "card_provider", "cheque", "other"]),
  dueOn: z.union([z.iso.date(), z.literal("")]),
  externalReference: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function recordPaymentAction(formData: FormData): Promise<PaymentActionResult> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Controlla i dati del pagamento." };

  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager", "accountant"].includes(member.roleKey)) {
    return { ok: false, message: "Non hai i permessi per registrare pagamenti." };
  }

  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("agreed_price,payments(amount,status)")
    .eq("id", parsed.data.registrationId)
    .eq("organization_id", member.organizationId)
    .single();
  if (registrationError || !registration) return { ok: false, message: "Iscrizione non disponibile." };
  const entries = Array.isArray(registration.payments) ? registration.payments : [];
  const paid = entries.reduce((sum, entry) => sum + (["paid", "partial"].includes(entry.status) ? Number(entry.amount) : entry.status === "refunded" ? -Number(entry.amount) : 0), 0);
  const agreed = Number(registration.agreed_price) || 0;
  if (parsed.data.status === "paid" && parsed.data.amount > Math.max(0, agreed - paid)) return { ok: false, message: "L’importo supera il residuo dell’iscrizione." };
  if (parsed.data.status === "refunded" && parsed.data.amount > paid) return { ok: false, message: "Il rimborso supera quanto effettivamente incassato." };

  const { error } = await supabase.from("payments").insert({
    organization_id: member.organizationId,
    registration_id: parsed.data.registrationId,
    amount: parsed.data.amount,
    currency: "EUR",
    status: parsed.data.status,
    method: parsed.data.method,
    due_on: parsed.data.dueOn || null,
    paid_at: parsed.data.status === "paid" ? new Date().toISOString() : null,
    external_reference: parsed.data.externalReference || null,
    notes: parsed.data.notes || null,
  });
  if (error) {
    console.error("recordPaymentAction failed", error.code);
    return { ok: false, message: "Pagamento non registrato. Controlla iscrizione e permessi." };
  }

  revalidatePath("/pagamenti");
  revalidatePath("/dashboard");
  return { ok: true, message: "Pagamento registrato." };
}
