import { PrismaClient, Prisma, Verdict as DbVerdict, EvidenceKind as DbEvidenceKind } from "@prisma/client";
import { getPolicy, runVerificationPipeline, sha256Hex, type EvidenceInput, type EvidenceKind, type VerificationResult } from "@prooflayer/verifier";
import { getPrivateEvidence } from "./storage";
import { groqProvider } from "./groq";
import { anchorAttestation } from "./xlayer";

type Audit = { id: string; type: string; createdAt: string; payload: Record<string, unknown> };
export type StoredEvidence = EvidenceInput & { storageKey?: string; sourceHash?: string };
type Claim = { claimId: string; claim: string; policyId: string; policyVersion: string; evidence: StoredEvidence[]; result?: VerificationResult; audit: Audit[] };

const globalStore = globalThis as typeof globalThis & {
  __proofLayerClaims?: Map<string, Claim>;
  __proofLayerIdempotency?: Map<string, string>;
  __proofLayerPrisma?: PrismaClient;
};
const claims = globalStore.__proofLayerClaims ?? new Map<string, Claim>();
const idempotency = globalStore.__proofLayerIdempotency ?? new Map<string, string>();
globalStore.__proofLayerClaims = claims;
globalStore.__proofLayerIdempotency = idempotency;

function makeId(prefix: string) {
  return prefix + "-" + crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase();
}
function addAudit(claim: Claim, type: string, payload: Record<string, unknown>) {
  claim.audit.push({ id: makeId("AUD"), type, payload, createdAt: new Date().toISOString() });
}
function dbEnabled() { return Boolean(process.env.DATABASE_URL); }
function db() {
  if (!dbEnabled()) return undefined;
  globalStore.__proofLayerPrisma ??= new PrismaClient();
  return globalStore.__proofLayerPrisma;
}
function dbVerdict(value: VerificationResult["verdict"]) { return value as DbVerdict; }
function dbKind(value: EvidenceKind) { return value as DbEvidenceKind; }
function jsonValue(value: unknown) { return value as Prisma.InputJsonValue; }
function publicAuditPayload(payload: Record<string, unknown>) {
  const safe = { ...payload };
  delete safe.storageKey;
  return safe;
}
async function ensureDbReady(client: PrismaClient) {  for (let attempt = 0; attempt < 3; attempt += 1) {    try { await client.$queryRaw`SELECT 1`; return; } catch (error) {      if (attempt === 2) throw error;      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));    }  }}
async function auditDb(client: PrismaClient, claimId: string, type: string, payload: Record<string, unknown>, verificationRunId?: string) {
  await client.auditEvent.create({ data: { id: makeId("AUD"), claimId, verificationRunId, type, payload: jsonValue(payload) } });
}
function resultFromPayload(payload: Prisma.JsonValue | null | undefined) {
  return payload ? payload as unknown as VerificationResult : undefined;
}
function storedEvidenceFromRow(row: {
  id: string; kind: string; mimeType: string | null; storageKey: string | null;
  sourceHash: string; byteLength: number; text?: string | null; url?: string | null;
}): StoredEvidence {
  return {
    evidenceId: row.id,
    kind: row.kind as EvidenceKind,
    mimeType: row.mimeType ?? undefined,
    storageKey: row.storageKey ?? undefined,
    sourceHash: row.sourceHash,
    text: row.text ?? undefined,
    url: row.url ?? undefined,
  };
}
function evidenceBytes(item: StoredEvidence) {
  if (item.bytes) return Promise.resolve(item.bytes);
  if (item.storageKey) return getPrivateEvidence(item.storageKey);
  return Promise.resolve(new TextEncoder().encode(item.text ?? item.url ?? ""));
}
async function sourceHash(item: StoredEvidence) {
  return item.sourceHash ?? sha256Hex(await evidenceBytes(item));
}
async function findDbClaim(claimId: string) {
  const client = db();
  if (!client) return undefined;
  await ensureDbReady(client);
  return client.claim.findUnique({
    where: { id: claimId },
    include: {
      evidence: true,
      runs: { orderBy: { createdAt: "desc" } },
      auditEvents: { orderBy: { createdAt: "asc" } },
      attestation: true,
    },
  });
}

export async function createClaim(input: { claim: string; policyId?: string; evidence?: StoredEvidence[]; idempotencyKey?: string }) {
  if (input.idempotencyKey && idempotency.has(input.idempotencyKey)) return idempotency.get(input.idempotencyKey)!;
  const claimId = makeId("PL");
  const policy = getPolicy(input.policyId);
  const client = db();
  if (client) {
    await ensureDbReady(client);
    await client.claim.create({ data: { id: claimId, claim: input.claim, policyId: policy.id, policyVersion: policy.version } });
    await auditDb(client, claimId, "CLAIM_CREATED", { policyId: policy.id, policyVersion: policy.version });
  } else {
    const claim: Claim = { claimId, claim: input.claim, policyId: policy.id, policyVersion: policy.version, evidence: input.evidence ?? [], audit: [] };
    claims.set(claimId, claim);
    addAudit(claim, "CLAIM_CREATED", { policyId: policy.id, policyVersion: policy.version });
  }
  if (input.idempotencyKey) idempotency.set(input.idempotencyKey, claimId);
  return claimId;
}

export async function addEvidence(claimId: string, evidence: StoredEvidence) {
  const client = db();
  if (client) {
    await ensureDbReady(client);
    const existing = await client.evidenceItem.findUnique({ where: { id: evidence.evidenceId } });
    if (existing) return existing;
    const stored = await client.evidenceItem.create({
      data: {
        id: evidence.evidenceId,
        claimId,
        kind: dbKind(evidence.kind),
        mimeType: evidence.mimeType,
        storageKey: evidence.storageKey,
        sourceHash: await sourceHash(evidence),
        byteLength: evidence.bytes?.byteLength ?? (await evidenceBytes(evidence)).byteLength,
        text: evidence.text,
        url: evidence.url,
      },
    });
    await auditDb(client, claimId, "EVIDENCE_ADDED", { evidenceId: evidence.evidenceId, kind: evidence.kind, storageKey: evidence.storageKey });
    return stored;
  }
  const claim = claims.get(claimId);
  if (!claim) throw new Error("Claim not found");
  if (claim.evidence.some((item) => item.evidenceId === evidence.evidenceId)) return claim;
  claim.evidence.push(evidence);
  addAudit(claim, "EVIDENCE_ADDED", { evidenceId: evidence.evidenceId, kind: evidence.kind, storageKey: evidence.storageKey });
  return claim;
}

export async function removeClaim(claimId: string) {
  const client = db();
  if (client) { await client.claim.delete({ where: { id: claimId } }).catch(() => undefined); return; }
  claims.delete(claimId);
}

async function materializeEvidence(item: StoredEvidence): Promise<EvidenceInput> {
  return { ...item, bytes: item.bytes ?? await evidenceBytes(item) };
}

export async function verifyClaim(claimId: string, _idempotencyKey?: string) {
  const client = db();
  if (process.env.MODEL_PROVIDER === "groq" && !client) throw new Error("Live Groq mode requires DATABASE_URL");
  if (client) {
    const claim = await findDbClaim(claimId);
    if (!claim) throw new Error("Claim not found");
    const prior = resultFromPayload(claim.runs[0]?.resultPayload);
    if (prior) return prior;
    const evidence = await Promise.all(claim.evidence.map((item) => materializeEvidence(storedEvidenceFromRow(item))));
    const live = process.env.MODEL_PROVIDER === "groq";
    const result = await runVerificationPipeline({ claimId, claim: claim.claim, policy: getPolicy(claim.policyId), evidence, provider: live ? groqProvider : undefined, mode: live ? "provider" : "fixture" });
    if (live && !process.env.ATTESTATIONS_ADDRESS) throw new Error("Live Groq mode requires ATTESTATIONS_ADDRESS");
    if (live && !process.env.RELAYER_PRIVATE_KEY) throw new Error("Live Groq mode requires RELAYER_PRIVATE_KEY");
    const verifierId = live ? "verifier-groq-qwen3.6-27b" : "verifier-fixture";
    await client.verifierProfile.upsert({
      where: { id: verifierId },
      update: {
        lastHeartbeat: new Date(),
        totalRuns: { increment: 1 },
        ...(result.verdict === "VERIFIED" ? { verifiedRuns: { increment: 1 } } : {}),
        ...(result.verdict === "REJECTED" ? { rejectedRuns: { increment: 1 } } : {}),
        ...(result.verdict === "NEEDS_REVIEW" ? { reviewRuns: { increment: 1 } } : {}),
      },
      create: {
        id: verifierId,
        operatorAddress: process.env.VERIFIER_OPERATOR_ADDRESS || "0x0000000000000000000000000000000000000000",
        manifestHash: result.resultHash,
        pipelineVersion: "prooflayer-live-v1",
        policyVersion: result.policyVersion,
        lastHeartbeat: new Date(),
        totalRuns: 1,
        verifiedRuns: result.verdict === "VERIFIED" ? 1 : 0,
        rejectedRuns: result.verdict === "REJECTED" ? 1 : 0,
        reviewRuns: result.verdict === "NEEDS_REVIEW" ? 1 : 0,
      },
    });
    const chain = live ? await anchorAttestation({ claimId, verifierId, result }) : undefined;
    const runId = makeId("RUN");
    await client.verificationRun.create({
      data: {
        id: runId,
        claimId,
        verifierId,
        verdict: dbVerdict(result.verdict),
        confidence: result.confidence,
        resultHash: result.resultHash,
        modelVersion: result.modelVersion,
        policyVersion: result.policyVersion,
        limitations: jsonValue(result.limitations),
        resultPayload: jsonValue(result),
      },
    });
    await client.claim.update({ where: { id: claimId }, data: { status: dbVerdict(result.verdict) } });
    if (chain) {
      await client.attestation.create({
        data: {
          id: makeId("ATT"),
          claimId,
          verifierId,
          chainId: chain.chainId,
          contractAddress: chain.contractAddress,
          transactionHash: chain.transactionHash,
          evidenceHash: result.evidenceHash,
          resultHash: result.resultHash,
          policyHash: chain.policyHash,
          verdict: dbVerdict(result.verdict),
          confidence: result.confidence,
        },
      });
      await auditDb(client, claimId, "ATTESTATION_ANCHORED", chain as unknown as Record<string, unknown>, runId);
    }
    await auditDb(client, claimId, "VERIFICATION_COMPLETED", { verdict: result.verdict, resultHash: result.resultHash, mode: result.mode }, runId);
    return result;
  }

  const claim = claims.get(claimId);
  if (!claim) throw new Error("Claim not found");
  if (claim.result) return claim.result;
  const evidence = await Promise.all(claim.evidence.map(materializeEvidence));
  const live = process.env.MODEL_PROVIDER === "groq";
  const result = await runVerificationPipeline({ claimId, claim: claim.claim, policy: getPolicy(claim.policyId), evidence, provider: live ? groqProvider : undefined, mode: live ? "provider" : "fixture" });
  claim.result = result;
  addAudit(claim, "VERIFICATION_COMPLETED", { verdict: result.verdict, resultHash: result.resultHash, mode: result.mode });
  return result;
}

export async function getClaim(claimId: string) {
  const client = db();
  if (client) {
    const claim = await findDbClaim(claimId);
    if (!claim) return undefined;
    return {
      claimId: claim.id,
      claim: claim.claim,
      policyId: claim.policyId,
      policyVersion: claim.policyVersion,
      evidence: claim.evidence.map(storedEvidenceFromRow),
      result: resultFromPayload(claim.runs[0]?.resultPayload),
      audit: claim.auditEvents.map((event) => ({ id: event.id, type: event.type, createdAt: event.createdAt.toISOString(), payload: publicAuditPayload(event.payload as Record<string, unknown>) })),
      attestation: claim.attestation,
    };
  }
  return claims.get(claimId);
}

export async function listEvents(claimId: string) {
  const client = db();
  if (client) {
    const events = await client.auditEvent.findMany({ where: { claimId }, orderBy: { createdAt: "asc" } });
    return events.map((event) => ({ id: event.id, type: event.type, createdAt: event.createdAt.toISOString(), payload: publicAuditPayload(event.payload as Record<string, unknown>) }));
  }
  return claims.get(claimId)?.audit ?? [];
}

export async function challengeClaim(claimId: string, input: { challenger: string; reason: string }) {
  const client = db();
  const challenge = { challengeId: makeId("CHG"), challenger: input.challenger, reason: input.reason, status: "OPEN", createdAt: new Date().toISOString() };
  if (client) {
    if (!(await client.claim.findUnique({ where: { id: claimId }, select: { id: true } }))) throw new Error("Claim not found");
    await client.challenge.create({ data: { id: challenge.challengeId, claimId, challenger: input.challenger, reason: input.reason } });
    await auditDb(client, claimId, "CHALLENGE_OPENED", challenge);
    return challenge;
  }
  const claim = claims.get(claimId);
  if (!claim) throw new Error("Claim not found");
  addAudit(claim, "CHALLENGE_OPENED", challenge);
  return challenge;
}

export async function revokeClaim(claimId: string, reason: string) {
  const client = db();
  if (client) {
    const claim = await findDbClaim(claimId);
    const prior = resultFromPayload(claim?.runs[0]?.resultPayload);
    if (!claim || !prior) throw new Error("Verification result not found");
    const result = { ...prior, limitations: prior.limitations.concat("Revoked: " + reason) };
    await client.verificationRun.update({ where: { id: claim.runs[0].id }, data: { resultPayload: jsonValue(result), limitations: jsonValue(result.limitations) } });
    await client.attestation.updateMany({ where: { claimId }, data: { revoked: true } });
    await auditDb(client, claimId, "ATTESTATION_REVOCATION_REQUESTED", { reason });
    return result;
  }
  const claim = claims.get(claimId);
  if (!claim?.result) throw new Error("Verification result not found");
  claim.result = { ...claim.result, limitations: claim.result.limitations.concat("Revoked: " + reason) };
  addAudit(claim, "ATTESTATION_REVOCATION_REQUESTED", { reason });
  return claim.result;
}
