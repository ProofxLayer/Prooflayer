import { NextResponse } from "next/server";
import { getClaim } from "../../../../lib/store";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const claim = await getClaim((await params).claimId);
  if (!claim?.result) return NextResponse.json({ error: "Verification result not found" }, { status: 404 });
  return NextResponse.json({ claimId: claim.claimId, claim: claim.claim, result: claim.result, attestation: "attestation" in claim ? claim.attestation : null, audit: claim.audit });
}
