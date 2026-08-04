import "server-only";

import { createClient } from "./supabase/server";

export type PilgrimDocument = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  sensitive: boolean;
  expiresOn: string | null;
  createdAt: string;
};

export async function getPilgrimDocuments(pilgrimId: string): Promise<PilgrimDocument[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("documents").select("id,kind,original_filename,mime_type,byte_size,is_sensitive,expires_on,created_at").eq("pilgrim_id", pilgrimId).order("created_at", { ascending: false });
  if (error) {
    console.error("getPilgrimDocuments failed", error.code);
    return [];
  }
  return (data ?? []).map((item) => ({ id: item.id, kind: item.kind, filename: item.original_filename, mimeType: item.mime_type, byteSize: Number(item.byte_size), sensitive: item.is_sensitive, expiresOn: item.expires_on, createdAt: item.created_at }));
}
