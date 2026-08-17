import type { EvidenceInput, ModelAssessment } from "./types";

export async function fixtureAssessment(evidence: EvidenceInput[]): Promise<ModelAssessment> {
  const ids = evidence.map((item) => item.evidenceId);
  const joinedText = evidence.map((item) => item.text ?? "").join(" ").toLowerCase();

  if (joinedText.includes("contradiction") || joinedText.includes("not installed")) {
    return {
      verdict: "REJECTED",
      confidence: 88,
      checks: [
        { id: "installation_present", status: "FAIL", reason: "Fixture evidence contains a contradictory installation statement.", evidenceRefs: ids },
        { id: "inspection_reference", status: "FAIL", reason: "The inspection evidence conflicts with the completion claim.", evidenceRefs: ids },
      ],
      contradictions: ["The supplied evidence says the installation was not completed."],
      missingEvidence: [],
      limitations: ["This is deterministic fixture mode, not an independent field inspection."],
      modelVersion: "fixture-solar-v1",
    };
  }

  if (evidence.length < 2 || !evidence.some((item) => item.kind === "PHOTO") || !evidence.some((item) => item.kind === "PDF")) {
    return {
      verdict: "NEEDS_REVIEW",
      confidence: 54,
      checks: [
        { id: "installation_present", status: "REVIEW", reason: "A site photo and inspection document are both required.", evidenceRefs: ids },
        { id: "inspection_reference", status: "REVIEW", reason: "The evidence set is incomplete for this policy.", evidenceRefs: ids },
      ],
      contradictions: [],
      missingEvidence: ["PHOTO", "PDF"].filter((kind) => !evidence.some((item) => item.kind === kind)),
      limitations: ["The available evidence is insufficient to establish completion."],
      modelVersion: "fixture-solar-v1",
    };
  }

  return {
    verdict: "VERIFIED",
    confidence: 91,
    checks: [
      { id: "installation_present", status: "PASS", reason: "The site photo fixture depicts installed solar equipment.", evidenceRefs: ids.filter((id) => id.includes("photo")) },
      { id: "inspection_reference", status: "PASS", reason: "The inspection fixture references the same completed installation.", evidenceRefs: ids.filter((id) => id.includes("inspection")) },
    ],
    contradictions: [],
    missingEvidence: [],
    limitations: ["Image analysis cannot prove ownership, future maintenance, or conditions outside the submitted evidence."],
    modelVersion: "fixture-solar-v1",
  };
}

