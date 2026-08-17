import { NextResponse } from "next/server";
import { addEvidence, createClaim, removeClaim } from "../../../lib/store";
import { deletePrivateEvidence, putPrivateEvidence } from "../../../lib/storage";
import type { EvidenceKind } from "@prooflayer/verifier";

export const runtime = "nodejs";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
function kindForFile(file: File): EvidenceKind | null {
  if (file.type.startsWith("image/")) return "PHOTO";
  if (file.type === "application/pdf") return "PDF";
  if (file.type === "application/json" || file.type === "text/plain") return "JSON";
  return null;
}

export async function POST(request: Request) {
  if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
    const form = await request.formData();
    const claim = form.get("claim");
    const policyId = form.get("policyId");
    const files = form.getAll("evidence").filter((value): value is File => value instanceof File && value.size > 0);
    if (typeof claim !== "string" || !claim.trim() || files.length === 0 || files.length > MAX_FILES) {
      return NextResponse.json({ error: files.length > MAX_FILES ? "A maximum of 5 evidence files is allowed" : "A claim and at least one evidence file are required" }, { status: 400 });
    }
    const claimId = await createClaim({ claim: claim.trim(), policyId: typeof policyId === "string" ? policyId : undefined, idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined });
    const uploadedKeys: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const kind = kindForFile(file);
        if (!kind) throw new Error(`Unsupported evidence type: ${file.type || file.name}`);
        if (file.size > MAX_FILE_BYTES) throw new Error("Each evidence file must be 10 MB or smaller");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const evidenceId = `evidence-${index + 1}-${crypto.randomUUID()}`;
        const stored = await putPrivateEvidence({ claimId, evidenceId, filename: file.name, bytes, contentType: file.type });
        uploadedKeys.push(stored.key);
        await addEvidence(claimId, {
          evidenceId, kind, mimeType: file.type || undefined, bytes, storageKey: stored.key,
          sourceHash: stored.sourceHash,
          text: kind === "PDF" ? String(form.get("notes") || "") : undefined,
        });
      }
      return NextResponse.json({ claimId, evidenceCount: files.length }, { status: 201 });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => deletePrivateEvidence(key).catch(() => undefined)));
      await removeClaim(claimId);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to store evidence" }, { status: 502 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.claim !== "string" || !Array.isArray(body.evidence ?? [])) {
    return NextResponse.json({ error: "claim and evidence are required" }, { status: 400 });
  }
  const claimId = await createClaim({
    claim: body.claim,
    policyId: typeof body.policyId === "string" ? body.policyId : undefined,
    evidence: body.evidence,
    idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
  });
  return NextResponse.json({ claimId, evidenceCount: body.evidence.length }, { status: 201 });
}
