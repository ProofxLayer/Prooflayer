-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('PHOTO', 'PDF', 'URL', 'JSON');

-- CreateTable
CREATE TABLE "VerifierProfile" (
    "id" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "verifiedRuns" INTEGER NOT NULL DEFAULT 0,
    "rejectedRuns" INTEGER NOT NULL DEFAULT 0,
    "reviewRuns" INTEGER NOT NULL DEFAULT 0,
    "humanAgreementBps" INTEGER,
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "subjectAddress" TEXT,
    "policyId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" "Verdict",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "sourceHash" TEXT NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRun" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "resultHash" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "limitations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT,
    "evidenceHash" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "policyHash" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "verificationRunId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "challenger" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_claimId_key" ON "Attestation"("claimId");

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "VerifierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "VerifierProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_verificationRunId_fkey" FOREIGN KEY ("verificationRunId") REFERENCES "VerificationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

