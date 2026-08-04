"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";

export async function deleteDocumentAction(formData: FormData) {
  const parsed = z.object({ id: z.uuid(), pilgrimId: z.uuid() }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "Documento non valido." };
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !["admin", "manager"].includes(member.roleKey)) return { ok: false, message: "Non hai i permessi per eliminare documenti." };
  const { data: document, error: readError } = await supabase.from("documents").select("storage_path,pilgrim_id").eq("id", parsed.data.id).eq("organization_id", member.organizationId).single();
  if (readError || !document || document.pilgrim_id !== parsed.data.pilgrimId) return { ok: false, message: "Documento non disponibile." };
  const { error: deleteError } = await supabase.from("documents").delete().eq("id", parsed.data.id).eq("organization_id", member.organizationId);
  if (deleteError) return { ok: false, message: "Documento non eliminato." };
  const { error: storageError } = await supabase.storage.from("private-documents").remove([document.storage_path]);
  if (storageError) console.error("orphan document cleanup required", storageError.message);
  revalidatePath(`/pellegrini/${parsed.data.pilgrimId}/documenti`);
  revalidatePath(`/pellegrini/${parsed.data.pilgrimId}`);
  return { ok: true, message: "Documento eliminato." };
}
