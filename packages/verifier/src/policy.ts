import { canonicalize, sha256Hex } from "./canonicalize";
import type { EvidenceDigest, ModelAssessment, VerificationPolicy, VerificationResult } from "./types";

export const PURCHASE_POLICY: VerificationPolicy = {
  id: "purchase_completed_v1",
  version: "1.0.0",
  label: "Purchase completed",
  description: "A receipt or invoice should identify the purchased item, seller, transaction date or reference, and amount well enough to support that the purchase occurred.",
};

export const PAYMENT_POLICY: VerificationPolicy = {
  id: "payment_completed_v1",
  version: "1.0.0",
  label: "Payment or invoice settled",
  description: "Evidence should identify the payer, payee or merchant, transaction reference or date, amount, and a completed payment state.",
};

export const DELIVERY_POLICY: VerificationPolicy = {
  id: "delivery_completed_v1",
  version: "1.0.0",
  label: "Delivery received",
  description: "Evidence should support that the named item was delivered, using delivery confirmation, signed receipt, tracking details, or other clear delivery evidence.",
};

export const SERVICE_POLICY: VerificationPolicy = {
  id: "service_completed_v1",
  version: "1.0.0",
  label: "Service completed",
  description: "Evidence should identify the customer, provider, service, and completion date or reference well enough to support that the service was completed.",
};

export const INSPECTION_POLICY: VerificationPolicy = {
  id: "inspection_completed_v1",
  version: "1.0.0",
  label: "Inspection completed",
  description: "Evidence should identify the inspected subject and show that an inspection, assessment, or service visit was completed.",
};

export const WORK_POLICY: VerificationPolicy = {
  id: "work_completed_v1",
  version: "1.0.0",
  label: "Work or installation completed",
  description: "Evidence should identify the work, subject, responsible party, and completion details well enough to support that the described work was completed.",
};

export const SOLAR_POLICY: VerificationPolicy = {
  id: "solar_installation_completed_v1",
  version: "1.0.0",
  label: "Solar installation completed",
  description: "A site photo plus an inspection, invoice, or completion document should support that a solar installation was completed.",
};

export const EXPENSE_POLICY: VerificationPolicy = {
  id: "expense_incurred_v1",
  version: "1.0.0",
  label: "Expense incurred",
  description: "A receipt or invoice should identify the expense, merchant or provider, date or reference, amount, and enough detail to support that the expense was incurred.",
};

export const CUSTOM_POLICY: VerificationPolicy = {
  id: "custom_proof_v1",
  version: "1.0.0",
  label: "Custom proof",
  description: "Evaluate the user's stated claim using only the submitted evidence. Identify what the evidence supports, what it cannot establish, and use NEEDS_REVIEW when the claim or evidence is ambiguous.",
};

export const POLICIES = [
  PURCHASE_POLICY,
  PAYMENT_POLICY,
  DELIVERY_POLICY,
  SERVICE_POLICY,
  INSPECTION_POLICY,
  WORK_POLICY,
  SOLAR_POLICY,
  EXPENSE_POLICY,
  CUSTOM_POLICY,
] as const;

export function getPolicy(id?: string): VerificationPolicy {
  return POLICIES.find((policy) => policy.id === id) ?? SOLAR_POLICY;
}

export async function buildVerificationResult(input: {
  claimId: string;
  evidence: EvidenceDigest[];
  assessment: ModelAssessment;
  policy?: VerificationPolicy;
  mode: "fixture" | "provider";
  createdAt?: string;
}): Promise<VerificationResult> {
  const policy = input.policy ?? SOLAR_POLICY;
  const evidenceHash = await sha256Hex(canonicalize(input.evidence));
  const unsigned = {
    claimId: input.claimId,
    policyId: policy.id,
    policyVersion: policy.version,
    evidence: input.evidence,
    evidenceHash,
    ...input.assessment,
    mode: input.mode,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const resultHash = await sha256Hex(canonicalize(unsigned));
  return { ...unsigned, resultHash };
}
