import { NextResponse } from "next/server";
import { POLICIES } from "@prooflayer/verifier";

export function GET() {
  return NextResponse.json({ policies: POLICIES });
}
