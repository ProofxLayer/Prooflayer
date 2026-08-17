import { sha256Hex } from "@prooflayer/verifier";
import { getEvidenceBucket, getSupabaseAdmin } from "./supabase";

export async function putPrivateEvidence(input: { claimId: string; evidenceId: string; filename: string; bytes: Uint8Array; contentType?: string }) {
  const sourceHash = await sha256Hex(input.bytes);
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "evidence";
  const key = `${input.claimId}/${input.evidenceId}-${sourceHash.slice(0, 16)}-${safeName}`;
  const { error } = await getSupabaseAdmin().storage.from(getEvidenceBucket()).upload(key, input.bytes, { contentType: input.contentType || "application/octet-stream", cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Evidence upload failed: ${error.message}`);
  return { key, sourceHash, byteLength: input.bytes.byteLength };
}

export async function getPrivateEvidence(key: string) {
  const { data, error } = await getSupabaseAdmin().storage.from(getEvidenceBucket()).download(key);
  if (error || !data) throw new Error(`Evidence download failed: ${error?.message || "object not found"}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function deletePrivateEvidence(key: string) {
  const { error } = await getSupabaseAdmin().storage.from(getEvidenceBucket()).remove([key]);
  if (error) throw new Error(`Evidence cleanup failed: ${error.message}`);
}