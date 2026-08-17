import { NextResponse } from "next/server";
import { addEvidence } from "../../../../../lib/store";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.evidenceId !== "string" || typeof body.kind !== "string") return NextResponse.json({ error: "evidenceId and kind are required" }, { status: 400 });
  try {
    await addEvidence((await params).claimId, body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add evidence" }, { status: 404 });
  }
}
