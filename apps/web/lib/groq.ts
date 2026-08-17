import type {
  AssessmentInput,
  CheckStatus,
  ExtractedEvidence,
  EvidenceInput,
  ModelAssessment,
  VerificationProvider,
} from "@prooflayer/verifier";

const DEFAULT_MODEL = "qwen/qwen3.6-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const textValue = (value: unknown) => typeof value === "string" ? value : "";

async function extractPdf(bytes: Uint8Array) {
  const loadPdfParse = new Function("return require")() as (moduleName: string) => {
    PDFParse: new (options: { data: Uint8Array }) => {
      getText: () => Promise<{ text: string }>;
      destroy: () => Promise<void>;
    };
  };
  const { PDFParse } = loadPdfParse("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

async function extractEvidence(item: EvidenceInput): Promise<ExtractedEvidence> {
  let text = item.text || item.url || "";
  if (item.bytes && item.kind === "PDF") text = await extractPdf(item.bytes);
  if (item.bytes && item.kind === "JSON") text = new TextDecoder().decode(item.bytes);
  return {
    evidenceId: item.evidenceId,
    text: text.slice(0, 30000),
    metadata: { kind: item.kind, mimeType: item.mimeType },
  };
}

function imageDataUrl(item: EvidenceInput) {
  if (!item.bytes || item.kind !== "PHOTO") return undefined;
  let binary = "";
  for (let i = 0; i < item.bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...item.bytes.subarray(i, i + 0x8000));
  }
  return "data:" + (item.mimeType || "image/jpeg") + ";base64," + Buffer.from(binary, "binary").toString("base64");
}

function normalizeAssessment(raw: unknown, model: string): ModelAssessment {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const normalizedVerdict = textValue(value.verdict).trim().toUpperCase().replace(/[-\s]+/g, "_");
  const verdict = normalizedVerdict === "VERIFIED"
    ? "VERIFIED"
    : normalizedVerdict === "REJECTED"
      ? "REJECTED"
      : normalizedVerdict === "NEEDS_REVIEW" || normalizedVerdict === "REVIEW" || normalizedVerdict === "INCONCLUSIVE"
        ? "NEEDS_REVIEW"
        : null;
  if (!verdict) throw new Error("Groq returned an invalid verdict");

  const confidenceText = textValue(value.confidence).trim().toLowerCase();
  const numericConfidence = Number(confidenceText.replace("%", ""));
  const confidence = Number.isFinite(numericConfidence)
    ? numericConfidence
    : confidenceText.includes("high")
      ? 85
      : confidenceText.includes("medium")
        ? 65
        : confidenceText.includes("low")
          ? 35
          : 0;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new Error("Groq returned an invalid confidence");
  }

  const checks = Array.isArray(value.checks)
    ? value.checks.map((check, index) => {
        const row = (check && typeof check === "object" ? check : {}) as Record<string, unknown>;
        const status: CheckStatus = row.status === "PASS" || row.status === "FAIL" || row.status === "REVIEW"
          ? row.status
          : "REVIEW";
        return {
          id: textValue(row.id) || "check_" + (index + 1),
          status,
          reason: textValue(row.reason) || "The model did not provide a reason.",
          evidenceRefs: Array.isArray(row.evidenceRefs)
            ? row.evidenceRefs.filter((item): item is string => typeof item === "string")
            : [],
        };
      })
    : [];

  return {
    verdict,
    confidence: Math.round(confidence),
    checks,
    contradictions: Array.isArray(value.contradictions)
      ? value.contradictions.filter((item): item is string => typeof item === "string")
      : [],
    missingEvidence: Array.isArray(value.missingEvidence)
      ? value.missingEvidence.filter((item): item is string => typeof item === "string")
      : [],
    limitations: [
      ...(Array.isArray(value.limitations)
        ? value.limitations.filter((item): item is string => typeof item === "string")
        : []),
      "This decision is based only on the submitted evidence and does not independently prove ownership, authenticity, or conditions outside the evidence.",
    ],
    modelVersion: "groq:" + model,
  };
}

async function callGroq(body: unknown, apiKey: string) {
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 30000);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (attempt === 2) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Groq request timed out after " + timeoutMs + "ms");
        }
        throw new Error("Groq request failed before a response was received");
      }
      await new Promise((resolve) => setTimeout(resolve, 5000 * 2 ** attempt));
      continue;
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok || (response.status !== 429 && response.status !== 503) || attempt === 2) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000 * 2 ** attempt));
  }
  throw new Error("Groq request retry limit reached");
}

async function complete(input: AssessmentInput) {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("Groq API key is not configured");
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text: [
      "Claim: " + (input.claim || "The submitted claim"),
      "Selected policy: " + input.policy.label + " (" + input.policy.id + ")",
      "Policy requirements: " + input.policy.description,
      "",
      "Extracted evidence:",
      ...input.extracted.map((item) => "[" + item.evidenceId + "] " + (item.text || "(visual evidence supplied)")),
      "",
      "Return JSON only.",
    ].join("\n"),
  }];

  for (const item of input.evidence.filter((row) => row.kind === "PHOTO").slice(0, 5)) {
    const url = imageDataUrl(item);
    if (url) content.push({ type: "image_url", image_url: { url } });
  }

  const body = {
    model,
    temperature: 0.1,
    max_completion_tokens: 900,
    response_format: { type: "json_object" },
    reasoning_format: "hidden",
    reasoning_effort: "none",
    messages: [
      {
        role: "system",
        content: [
          "You are ProofLayer's evidence verification engine.",
          "Assess whether the submitted evidence supports the claim under the selected policy.",
          "Selected policy: " + input.policy.label + " (" + input.policy.id + ")",
          "Policy requirements: " + input.policy.description,
          "For Custom proof, treat the user claim as the exact target and do not import requirements from another policy.",
          "Evaluate the evidence against that policy only. Do not substitute a different policy or invent a domain such as solar installation.",
          "A receipt or invoice may support a purchase when it visibly identifies the item, seller, date or reference, and amount, but it does not by itself prove delivery, installation, ownership, or product performance.",
          "Do not claim certainty about identity, ownership, authenticity, timestamps, or facts not visible in the evidence.",
          "Use NEEDS_REVIEW when evidence is incomplete, ambiguous, contradictory, or too weak.",
          "Checks must reference evidence IDs and reasons must be concise and auditable.",
          "Return exactly JSON with verdict, confidence, checks, contradictions, missingEvidence, limitations.",
        ].join("\n"),
      },
      { role: "user", content },
    ],
  };

  let response = await callGroq(body, apiKey);
  if (!response.ok && response.status === 400) {
    response = await callGroq({ ...body, response_format: undefined }, apiKey);
  }
  if (!response.ok) {
    const error = await response.text();
    throw new Error("Groq request failed (" + response.status + "): " + error.slice(0, 240));
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const output = payload.choices?.[0]?.message?.content;
  if (!output) throw new Error("Groq returned an empty assessment");

  let cleanedOutput = output.trim();
  const thinkStart = cleanedOutput.indexOf("<think>");
  const thinkEnd = cleanedOutput.indexOf("</think>");
  if (thinkStart >= 0 && thinkEnd > thinkStart) {
    cleanedOutput = (cleanedOutput.slice(0, thinkStart) + cleanedOutput.slice(thinkEnd + 8)).trim();
  }
  const jsonStart = cleanedOutput.indexOf("{");
  const jsonEnd = cleanedOutput.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error("Groq returned no JSON assessment");
  return normalizeAssessment(JSON.parse(cleanedOutput.slice(jsonStart, jsonEnd + 1)), model);
}

export const groqProvider: VerificationProvider = {
  async extract(input) {
    return Promise.all(input.map(extractEvidence));
  },
  async assess(input) {
    return complete(input);
  },
};
