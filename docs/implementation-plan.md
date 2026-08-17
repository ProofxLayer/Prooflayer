# ProofLayer implementation plan

Project root: /home/terry/Terrylinux_Workspce/prooflayer

Target completion date: August 19, 2026
Buffer: August 20-21, 2026

## Current status

Completed:

- Next.js frontend foundation and responsive visual system.
- Fixture solar verification flow from claim submission to result page.
- Claims, evidence, verification, events, challenge, revoke, policy, verifier, and health API routes.
- Canonical JSON and SHA-256 evidence/result hashing.
- Provider-agnostic evidence pipeline with deterministic fixture provider.
- VERIFIED, REJECTED, and NEEDS_REVIEW paths.
- VerifierRegistry and ProofLayerAttestations Solidity contracts.
- Hardhat tests and local deployment script.
- Prisma schema, generated client, database repository interface, storage abstraction, and initial migration artifact.

Pending:

- Apply the PostgreSQL migration and seed the verifier profile with valid DATABASE_URL credentials.
- Connect the web API to the Prisma repository while retaining fixture fallback.
- Add a real AI provider adapter behind the existing VerificationProvider interface.
- Add wallet anchoring and testnet deployment wiring.
- Complete final security, browser, and demo QA.

## Work phases

### Phase 1 - foundation

Status: complete.

- Monorepo structure.
- Next.js App Router shell.
- Fixture-mode solar demo.
- Environment configuration.
- Initial documentation.

### Phase 2 - onchain trust layer

Status: complete.

- VerifierRegistry.
- ProofLayerAttestations.
- Access control.
- Unique claims.
- Confidence and verdict validation.
- Revocation, expiry, and pause behavior.
- Local deployment and test coverage.

### Phase 3 - persistence

Status: in progress.

- Configure valid PostgreSQL credentials.
- Run prisma migrate deploy.
- Run prisma db seed.
- Add repository-backed claim/evidence/run persistence.
- Keep fixture mode available for offline demos.
- Add database health status to /api/health.

### Phase 4 - real verification providers

Status: next.

- Add extraction adapter interface for PDF, image, URL, and JSON evidence.
- Add provider-backed assessment adapter.
- Validate all provider output against the strict ModelAssessment shape.
- Keep deterministic policy checks between provider output and final verdict.
- Add provider and failure-mode tests.

### Phase 5 - product completion

- Add processing timeline.
- Add verifier trust profile.
- Add public proof read-back from the chain.
- Add connected wallet anchor flow.
- Add transaction confirmation and explorer links.
- Add challenge and revocation UI.

### Phase 6 - hardening and release

- File size and MIME enforcement.
- Server-side authorization.
- Redacted logs.
- No private evidence in calldata or client bundles.
- Network mismatch protection.
- Contract/API/browser test pass.
- X Layer testnet deployment and verified addresses.
- Demo rehearsal and final submission package.

## August 10-19 schedule

| Date | Finish line |
|---|---|
| Aug 10 | PostgreSQL migration, seed, and persistence adapter |
| Aug 11 | Real provider interface and extraction seams |
| Aug 12 | Provider assessment, policy validation, and failure tests |
| Aug 13 | Processing timeline and verifier trust UI |
| Aug 14 | Wallet connection and anchor transaction path |
| Aug 15 | X Layer testnet deployment and explorer read-back |
| Aug 16 | Challenge, revoke, and public proof completion |
| Aug 17 | Security pass and full integration testing |
| Aug 18 | UI polish, demo fixtures, README, and demo recording |
| Aug 19 | Feature freeze, final verification, and submission readiness |

Aug 20-21 are contingency only. No new product surfaces should be added after Aug 19.

## Definition of done

- The fixture demo works without external credentials.
- Real provider mode has a safe, explicit configuration switch.
- Evidence receives stable hashes and remains private.
- The result exposes policy, verifier, evidence references, limitations, and hashes.
- Contracts compile, pass tests, and deploy to X Layer testnet.
- An attestation can be read back by claim ID.
- The public proof page works after refresh.
- Verified, rejected, needs-review, challenge, and revoke paths are understandable.
- Root typecheck, verifier tests, contract tests, database checks, browser happy path, and production build pass.

