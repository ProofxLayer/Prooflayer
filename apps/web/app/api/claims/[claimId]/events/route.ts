import { NextResponse } from "next/server";
import { listEvents } from "../../../../../lib/store";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  return NextResponse.json({ events: await listEvents((await params).claimId) });
}
