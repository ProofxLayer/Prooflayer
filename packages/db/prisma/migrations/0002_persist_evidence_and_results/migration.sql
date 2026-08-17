-- Persist extracted evidence text and the complete model result payload.
ALTER TABLE "EvidenceItem" ADD COLUMN "text" TEXT;
ALTER TABLE "EvidenceItem" ADD COLUMN "url" TEXT;
ALTER TABLE "VerificationRun" ADD COLUMN "resultPayload" JSONB;
