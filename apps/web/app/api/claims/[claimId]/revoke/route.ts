import { NextResponse } from "next/server";
import { revokeClaim } from "../../../../../lib/store";
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reason !== "string") return NextResponse.json({ error: "reason is required" }, { status: 400 });
  try { return NextResponse.json(await revokeClaim((await params).claimId, body.reason)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to revoke claim" }, { status: 404 }); }
}
