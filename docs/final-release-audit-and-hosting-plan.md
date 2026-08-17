# ProofLayer Final Release Audit and Hosting Plan

Audit date: 2026-08-17
Target submission deadline: 2026-08-21 at 23:59 UTC
Project workspace: /home/terry/Terrylinux_Workspce/prooflayer

## Release decision

ProofLayer is ready for team testing on X Layer Testnet.

We should launch the contract on X Layer Mainnet before submission. The official AI Season requirements say the project must be deployed on X Layer Testnet during the hackathon and subsequently launched on X Layer Mainnet. The safest interpretation is to complete the Mainnet launch before submitting the form, while keeping the application on Testnet until the team has completed the final smoke tests.

Official references:

- Hackathon requirements: https://web3.okx.com/xlayer/build-x-series
- X Layer network information: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information
- X Layer contract deployment documentation: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/deploy-a-smart-contract/deploying-contract

## Audit summary

### Passing

- Next.js web application builds successfully.
- Web TypeScript type-check passes.
- Verifier test suite passes.
- Solidity contract suite passed all five tests in the latest full contract run.
- Groq live mode is configured and health reports mode: groq.
- Neon database is configured.
- Supabase private evidence storage is configured.
- X Layer Testnet attestation configuration is live.
- Testnet deployment manifest exists for chain ID 1952.
- Proof IDs, share links, proof-card export, and public proof pages are implemented.
- Purchase, payment, delivery, service, inspection, work, solar, expense, and Custom proof policies are available.
- Custom proof claims are sent to Groq as the exact verification target.
- Public audit responses no longer expose private storage keys.
- Evidence uploads are limited to five files, with a 10 MB limit per file.
- The production server has a health endpoint at /api/health.

### Important limitations for the hackathon

- There is no account system. A proof ID and share link act as the access capability for a proof.
- Challenge, revoke, and add-evidence API routes are not account-protected. Do not advertise these operator endpoints as public product features until authentication is added.
- The AI verdict is an evidence assessment, not an independent guarantee of authenticity, ownership, or truth.
- Evidence remains off-chain and private. Only hashes and decision metadata are anchored.
- The app currently uses the selected policy plus the user's claim. It does not independently verify merchants, delivery networks, identity documents, or external registries.

## Critical security gate

The current WSL project contains live credentials in local .env files. They are ignored by .gitignore, but they must not be copied to a hosting provider or committed to source control.

Before hosting or Mainnet deployment:

1. Rotate the Groq API key.
2. Rotate the Neon database password or create a fresh restricted connection credential.
3. Rotate the Supabase service-role key.
4. Create a fresh Mainnet deployer/relayer wallet.
5. Do not reuse the current Testnet relayer private key for Mainnet.
6. Fund the new Mainnet wallet with only the OKB required for deployment and smoke tests.
7. Store fresh values only in the hosting provider's encrypted environment settings.
8. Keep .env files local and untracked.

If any private key has ever been pasted into a public issue, public repository, public chat, or screen recording, treat it as compromised and rotate it immediately.

## Hosting plan

### Recommended hosting shape

Use one managed Node.js web service running the Next.js application. Do not deploy this as a static site or a static Cloudflare Pages export because the app needs server-side access to Groq, Neon, Supabase, and the X Layer relayer wallet.

The host must support:

- Node.js 20 or newer.
- A long-running Next.js Node process.
- At least a 90-second request timeout for the verification endpoint.
- Environment secrets.
- HTTPS.
- Health checks.
- Logs.
- A configurable PORT value.

The verification request may take multiple seconds because it uploads evidence, extracts document text, calls Groq, writes the result to Neon, and anchors the result on X Layer.

### Build and start commands

From the repository root:

    npm ci
    npm run build
    npm run start

The project now includes:

- Root start command: npm run start
- Web start command: npm --workspace @prooflayer/web run start
- Mainnet contract command: npm --workspace @prooflayer/contracts run deploy:mainnet

### Production environment

Set these values in the host secret manager, never in committed files:

    NODE_ENV=production
    NEXT_PUBLIC_APP_URL=https://YOUR_HOSTED_DOMAIN
    MODEL_PROVIDER=groq
    MODEL_API_KEY=ROTATED_GROQ_KEY
    GROQ_MODEL=qwen/qwen3.6-27b
    GROQ_TIMEOUT_MS=30000

    DATABASE_URL=ROTATED_NEON_CONNECTION_STRING

    SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    SUPABASE_SECRET_KEY=ROTATED_SUPABASE_SERVICE_KEY
    SUPABASE_BUCKET=prooflayer-evidence

    XLAYER_NETWORK=testnet
    XLAYER_TESTNET_RPC=https://testrpc.xlayer.tech/terigon
    XLAYER_TESTNET_CHAIN_ID=1952
    XLAYER_TESTNET_EXPLORER=https://www.okx.com/web3/explorer/xlayer-test
    ATTESTATIONS_TESTNET_ADDRESS=TESTNET_CONTRACT_ADDRESS

    VERIFIER_ID=verifier-groq-qwen3.6-27b
    VERIFIER_OPERATOR_ADDRESS=TESTNET_OPERATOR_ADDRESS
    ATTESTATION_SUBJECT_ADDRESS=SUBJECT_WALLET_ADDRESS
    RELAYER_PRIVATE_KEY=ROTATED_TESTNET_RELAYER_KEY

Do not set XLAYER_NETWORK=mainnet until the Mainnet contracts have been deployed and verified.

## Mainnet launch plan

X Layer Mainnet uses chain ID 196, OKB as the gas token, and the official RPC https://rpc.xlayer.tech. The official explorer is https://www.okx.com/web3/explorer/xlayer.

### Step 1: Freeze the Testnet build

- Do not add new product features after team testing begins.
- Record the current commit or source snapshot.
- Run the full test, type-check, and production build commands.
- Keep the Testnet deployment available for the team demo.

### Step 2: Rotate credentials

Complete the critical security gate above before sending any key to a host or using it for Mainnet.

### Step 3: Deploy fresh Mainnet contracts

From the contracts package, with a dedicated Mainnet deployer key:

    npm --workspace @prooflayer/contracts run compile
    npm --workspace @prooflayer/contracts run deploy:mainnet

The deployment creates:

- A fresh VerifierRegistry.
- A fresh ProofLayerAttestations contract.
- A registered verifier identity.
- A Mainnet deployment manifest at packages/contracts/deployments/196.json.

Record the two contract addresses and deployment transaction hashes. Verify both contracts on the X Layer explorer if the verification workflow is available.

### Step 4: Configure Mainnet separately

After the Mainnet deployment succeeds, set the hosted environment to:

    XLAYER_NETWORK=mainnet
    XLAYER_MAINNET_RPC=https://rpc.xlayer.tech
    XLAYER_MAINNET_CHAIN_ID=196
    XLAYER_MAINNET_EXPLORER=https://www.okx.com/web3/explorer/xlayer
    ATTESTATIONS_MAINNET_ADDRESS=MAINNET_ATTESTATIONS_ADDRESS
    RELAYER_PRIVATE_KEY=FRESH_MAINNET_RELAYER_KEY

The code now refuses to use the Testnet contract address when XLAYER_NETWORK=mainnet.

### Step 5: Mainnet smoke test

Submit one low-risk proof using non-sensitive evidence or a redacted receipt. Confirm:

- Groq returns a structured verdict.
- Neon stores the claim and verification run.
- Supabase stores the evidence privately.
- The result shows xlayer-mainnet.
- The attestation transaction confirms.
- The explorer link opens the Mainnet transaction.
- The public proof page shows hashes and metadata but no raw evidence.
- The relayer wallet balance remains sufficient for the demo.

Keep Testnet available as the fallback demo environment until the submission is complete.

## Team test matrix

Use the hosted URL for every test and record the proof ID and transaction hash.

### Test A: Purchase

- Select Purchase completed.
- Upload a receipt image or receipt PDF.
- Confirm the result references the item, seller, date/reference, and amount.
- Confirm it does not say solar installation.
- Confirm an X Layer attestation exists.

### Test B: Custom proof

- Select Custom proof.
- Enter a specific claim, such as: This laptop was handed over to the buyer on the stated date.
- Upload evidence that supports the handover.
- Confirm the result references the custom claim and does not import purchase or solar requirements.

### Test C: Ambiguous evidence

- Submit a blurry, incomplete, or unrelated document.
- Confirm the result is NEEDS_REVIEW or REJECTED.
- Confirm the limitations explain what is missing.

### Test D: Proof identity

- Copy the proof ID.
- Open the proof ID from a new browser tab.
- Open the shareable proof link.
- Confirm the proof can be reopened without an account only when the proof ID or link is known.

### Test E: Export

- Export the proof card as an image.
- Open the downloaded image on a phone or another computer.
- Confirm the proof ID, verdict, confidence, hashes, policy, and transaction hash are readable.

### Test F: Privacy

- Open the public proof page.
- Confirm no receipt image, PDF, storage URL, Supabase key, or private storage key is exposed.
- Confirm only hashes and decision metadata are public.

### Test G: Failure handling

- Upload an unsupported file type.
- Upload a file larger than 10 MB.
- Stop or temporarily invalidate a provider connection only in a controlled test environment.
- Confirm the user receives a readable error and the claim does not appear as a false success.

### Test H: Mainnet

- Run one Mainnet proof after the Mainnet configuration is enabled.
- Confirm the health endpoint reports xlayer-mainnet and chain ID 196.
- Confirm the transaction is visible on the Mainnet explorer.
- Confirm the proof page links to the Mainnet explorer, not the Testnet explorer.

## Submission checklist

- Hosted HTTPS URL works.
- Testnet proof transaction is recorded.
- Mainnet contract addresses are recorded.
- Mainnet smoke-test proof transaction is recorded.
- The final demo uses the correct policy for the evidence.
- Demo shows a real receipt or redacted real evidence.
- Demo explains that raw evidence remains private.
- Demo shows the proof ID, share link, export, result hash, and X Layer transaction.
- Dedicated X account is active.
- Official X post mentions @XLayerOfficial.
- Google Form is completed before August 21, 2026 at 23:59 UTC.
- Team keeps copies of the hosted URL, contract addresses, transaction links, proof IDs, and screenshots.

## Recommended demo story

1. A user has evidence that is difficult to trust or share.
2. They select a proof policy or write a Custom proof claim.
3. ProofLayer stores the evidence privately.
4. Groq evaluates only whether the evidence supports the selected claim.
5. ProofLayer returns an explainable verdict with checks, confidence, and limitations.
6. Hashes and decision metadata are anchored on X Layer.
7. The user receives a permanent proof ID, shareable link, and downloadable proof card.

## Final go/no-go rule

Go to Mainnet only after:

- credential rotation is complete;
- Testnet team tests pass;
- the production build passes;
- the Mainnet contracts are deployed from a fresh wallet;
- one Mainnet smoke test confirms the full path.

Do not submit a demo that accidentally points at Testnet while claiming Mainnet launch. Keep the network label visible and truthful.
