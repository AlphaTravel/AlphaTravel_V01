import { safeDocumentFilename } from "@/lib/document-security";
import { getCurrentMember } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, supabase] = await Promise.all([getCurrentMember(), createClient()]);
  if (!member || !supabase) return new Response("Non autorizzato", { status: 403 });
  const { data: document, error } = await supabase.from("documents").select("storage_path,original_filename").eq("id", id).single();
  if (error || !document) return new Response("Documento non disponibile", { status: 404 });
  const { data, error: signError } = await supabase.storage.from("private-documents").createSignedUrl(document.storage_path, 60, { download: safeDocumentFilename(document.original_filename) });
  if (signError || !data?.signedUrl) return new Response("Download non disponibile", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
