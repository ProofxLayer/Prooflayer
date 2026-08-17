import type { PrismaClient, EvidenceKind, Verdict } from "@prisma/client";
export type CreateClaimInput = { id: string; claim: string; policyId: string; policyVersion: string; subjectAddress?: string };
export type AddEvidenceInput = { id: string; claimId: string; kind: EvidenceKind; mimeType?: string; storageKey?: string; sourceHash: string; byteLength: number };
export interface ClaimRepository {
  createClaim(input: CreateClaimInput): Promise<{ id: string }>;
  addEvidence(input: AddEvidenceInput): Promise<{ id: string }>;
  getClaim(id: string): Promise<unknown>;
  recordRun(input: { id: string; claimId: string; verifierId: string; verdict: Verdict; confidence: number; resultHash: string; modelVersion: string; policyVersion: string; limitations: string[] }): Promise<{ id: string }>;
}
export function createPrismaClaimRepository(client: PrismaClient): ClaimRepository {
  return {
    async createClaim(input) { return client.claim.create({ data: input, select: { id: true } }); },
    async addEvidence(input) { return client.evidenceItem.create({ data: input, select: { id: true } }); },
    async getClaim(id) { return client.claim.findUnique({ where: { id }, include: { evidence: true, runs: true, attestation: true, auditEvents: true } }); },
    async recordRun(input) { return client.verificationRun.create({ data: { ...input, limitations: input.limitations } as never, select: { id: true } }); },
  };
}
