import { NextResponse } from "next/server";
import { challengeClaim } from "../../../../../lib/store";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.challenger !== "string" || typeof body.reason !== "string") return NextResponse.json({ error: "challenger and reason are required" }, { status: 400 });
  try {
    return NextResponse.json(await challengeClaim((await params).claimId, body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to challenge claim" }, { status: 404 });
  }
}
