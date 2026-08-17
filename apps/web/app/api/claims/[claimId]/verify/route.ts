import { NextResponse } from "next/server";
import { verifyClaim } from "../../../../../lib/store";
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  try { return NextResponse.json(await verifyClaim((await params).claimId, request.headers.get("x-idempotency-key") ?? undefined)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 404 }); }
}
