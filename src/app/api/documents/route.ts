import { z } from "zod";
import { detectDocumentMime, documentMimeExtensions, MAX_DOCUMENT_BYTES, safeDocumentFilename } from "@/lib/document-security";
import { getCurrentMember } from "@/lib/live-data";
import { canManageTravel } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const metadataSchema = z.object({
  pilgrimId: z.uuid(),
  kind: z.enum(["identity", "passport", "consent", "insurance", "medical", "voucher", "other"]),
  expiresOn: z.union([z.iso.date(), z.literal("")]),
});

function json(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json("Richiesta non autorizzata.", 403);
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase || !canManageTravel(member.roleKey)) return json("Non autorizzato.", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json("Richiesta non valida.", 400);
  }
  const parsed = metadataSchema.safeParse(Object.fromEntries(formData.entries()));
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File) || file.size < 1 || file.size > MAX_DOCUMENT_BYTES) return json("File o metadati non validi. Dimensione massima 4 MB.", 400);

  const { data: pilgrim, error: pilgrimError } = await supabase.from("pilgrims").select("id").eq("id", parsed.data.pilgrimId).eq("organization_id", member.organizationId).single();
  if (pilgrimError || !pilgrim) return json("Pellegrino non disponibile.", 404);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectDocumentMime(bytes);
  if (!mime || (file.type && file.type !== mime)) return json("Formato non consentito o contenuto del file non coerente.", 400);

  const originalFilename = safeDocumentFilename(file.name);
  const storagePath = `${member.organizationId}/${parsed.data.pilgrimId}/${crypto.randomUUID()}.${documentMimeExtensions[mime]}`;
  const { error: uploadError } = await supabase.storage.from("private-documents").upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (uploadError) {
    console.error("document upload failed", uploadError.message);
    return json("Caricamento non riuscito.", 500);
  }

  const { error: metadataError } = await supabase.from("documents").insert({
    organization_id: member.organizationId,
    pilgrim_id: parsed.data.pilgrimId,
    kind: parsed.data.kind,
    storage_path: storagePath,
    original_filename: originalFilename,
    mime_type: mime,
    byte_size: file.size,
    is_sensitive: parsed.data.kind !== "voucher" || formData.get("sensitive") === "on",
    expires_on: parsed.data.expiresOn || null,
  });
  if (metadataError) {
    const { error: cleanupError } = await supabase.storage.from("private-documents").remove([storagePath]);
    if (cleanupError) console.error("orphan document cleanup required", cleanupError.message);
    console.error("document metadata failed", metadataError.code);
    return json("Documento non registrato; il file è stato rimosso.", 500);
  }
  return json("Documento caricato.", 201);
}
