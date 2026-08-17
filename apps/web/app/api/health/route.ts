import { NextResponse } from "next/server";
import { xlayerConfigured, xlayerNetwork } from "../../../lib/xlayer";

export const runtime = "nodejs";

export function GET() {
  const network = xlayerNetwork();
  return NextResponse.json({
    ok: true,
    mode: process.env.MODEL_PROVIDER || "not_configured",
    model: process.env.GROQ_MODEL || "not_configured",
    storage: process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? "configured" : "not_configured",
    database: process.env.DATABASE_URL ? "configured" : "not_configured",
    attestation: xlayerConfigured() ? "configured" : "not_configured",
    network: "xlayer-" + network,
    chainId: network === "mainnet" ? 196 : 1952,
  });
}
