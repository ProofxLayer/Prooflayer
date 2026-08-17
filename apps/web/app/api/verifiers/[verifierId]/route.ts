import { NextResponse } from "next/server";
export async function GET(_request: Request, { params }: { params: Promise<{ verifierId: string }> }) { const { verifierId } = await params; return NextResponse.json({ verifierId, active: true, pipelineVersion: "fixture-solar-v1", limitations: ["Fixture mode is deterministic demo data."] }); }
