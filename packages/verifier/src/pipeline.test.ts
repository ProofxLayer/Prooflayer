import { strict as assert } from "node:assert";
import test from "node:test";
import { EvidenceValidationError, runVerificationPipeline } from "./pipeline";

const photo = { evidenceId: "solar-photo-01", kind: "PHOTO" as const, text: "installed panels" };
const inspection = { evidenceId: "solar-inspection-01", kind: "PDF" as const, text: "installation completed" };

test("pipeline returns VERIFIED for complete solar evidence", async () => {
  const result = await runVerificationPipeline({ claimId: "claim-verified", evidence: [photo, inspection] });
  assert.equal(result.verdict, "VERIFIED");
  assert.equal(result.evidence.length, 2);
});

test("pipeline returns NEEDS_REVIEW for incomplete evidence", async () => {
  const result = await runVerificationPipeline({ claimId: "claim-review", evidence: [photo] });
  assert.equal(result.verdict, "NEEDS_REVIEW");
});

test("pipeline returns REJECTED for contradictory evidence", async () => {
  const result = await runVerificationPipeline({ claimId: "claim-rejected", evidence: [{ ...photo, text: "not installed; contradiction" }, inspection] });
  assert.equal(result.verdict, "REJECTED");
});

test("pipeline rejects duplicate evidence IDs", async () => {
  await assert.rejects(() => runVerificationPipeline({ claimId: "claim-invalid", evidence: [photo, photo] }), EvidenceValidationError);
});
