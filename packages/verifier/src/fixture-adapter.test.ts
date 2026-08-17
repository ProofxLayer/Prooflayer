import { strict as assert } from "node:assert";
import test from "node:test";
import { fixtureAssessment } from "./fixture-adapter";

test("fixture adapter verifies seeded solar evidence", async () => {
  const result = await fixtureAssessment([
    { evidenceId: "solar-photo-01", kind: "PHOTO", text: "installed panels" },
    { evidenceId: "solar-inspection-01", kind: "PDF", text: "installation completed" },
  ]);
  assert.equal(result.verdict, "VERIFIED");
});
