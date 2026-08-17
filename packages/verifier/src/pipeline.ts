import { buildVerificationResult, getPolicy, SOLAR_POLICY } from "./policy";
import { fixtureAssessment } from "./fixture-adapter";
import { sha256Hex } from "./canonicalize";
import type { AssessmentInput, EvidenceInput, ExtractedEvidence, ModelAssessment, VerificationPolicy, VerificationProvider, VerificationResult } from "./types";

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export class EvidenceValidationError extends Error {
  constructor(message: string) { super(message); this.name = "EvidenceValidationError"; }
}

function sourceBytes(input: EvidenceInput): Uint8Array {
  if (input.bytes) return input.bytes;
  return new TextEncoder().encode(input.text ?? input.url ?? "");
}

export function validateEvidence(input: EvidenceInput[]) {
  if (input.length === 0) throw new EvidenceValidationError("At least one evidence item is required");
  const ids = new Set<string>();
  for (const item of input) {
    if (!item.evidenceId || ids.has(item.evidenceId)) throw new EvidenceValidationError("Evidence IDs must be unique");
    ids.add(item.evidenceId);
    if (!["PHOTO", "PDF", "URL", "JSON"].includes(item.kind)) throw new EvidenceValidationError("Unsupported evidence kind");
    if (sourceBytes(item).byteLength > MAX_EVIDENCE_BYTES) throw new EvidenceValidationError("Evidence exceeds the 10 MB limit");
    if (item.kind === "URL" && !item.url) throw new EvidenceValidationError("URL evidence requires a URL");
  }
}

export function validateAssessment(assessment: ModelAssessment): ModelAssessment {
  if (!["VERIFIED", "REJECTED", "NEEDS_REVIEW"].includes(assessment.verdict)) throw new EvidenceValidationError("Assessment returned an invalid verdict");
  if (!Number.isFinite(assessment.confidence) || assessment.confidence < 0 || assessment.confidence > 100) throw new EvidenceValidationError("Assessment confidence must be between 0 and 100");
  if (!assessment.modelVersion || !Array.isArray(assessment.checks) || !Array.isArray(assessment.limitations)) throw new EvidenceValidationError("Assessment is missing required fields");
  return assessment;
}

export const fixtureProvider: VerificationProvider = {
  async extract(input) { return input.map((item): ExtractedEvidence => ({ evidenceId: item.evidenceId, text: item.text ?? item.url ?? "", metadata: { kind: item.kind, mimeType: item.mimeType } })); },
  async assess(input: AssessmentInput) { return fixtureAssessment(input.evidence); },
};

export async function runVerificationPipeline(input: {
  claimId: string;
  claim?: string;
  policy?: VerificationPolicy;
  evidence: EvidenceInput[];
  provider?: VerificationProvider;
  mode?: "fixture" | "provider";
  createdAt?: string;
}): Promise<VerificationResult> {
  validateEvidence(input.evidence);
  const policy = input.policy ?? SOLAR_POLICY;
  const provider = input.provider ?? fixtureProvider;
  const extracted = await provider.extract(input.evidence);
  const assessment = validateAssessment(await provider.assess({ claim: input.claim, policy, evidence: input.evidence, extracted }));
  const evidence = [];
  for (const item of input.evidence) {
    const bytes = sourceBytes(item);
    evidence.push({ evidenceId: item.evidenceId, kind: item.kind, sha256: await sha256Hex(bytes), mimeType: item.mimeType, byteLength: bytes.byteLength });
  }
  return buildVerificationResult({ claimId: input.claimId, evidence, assessment, policy: getPolicy(policy.id), mode: input.mode ?? "fixture", createdAt: input.createdAt });
}
