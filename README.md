# ProofLayer

ProofLayer turns messy real-world evidence into an explainable verification result and a compact, tamper-resistant attestation on X Layer.

## Current build

The hackathon MVP supports:

- Purchase completed
- Payment or invoice settled
- Delivery received
- Service completed
- Inspection completed
- Work or installation completed
- Solar installation completed
- Expense incurred
- Custom proof

A user submits a claim, uploads evidence, receives a VERIFIED, REJECTED, or NEEDS_REVIEW result, and can anchor the result on X Layer. Source evidence remains private in Supabase. Neon stores the claim and verification record. X Layer stores hashes and decision metadata.

## Product flow

1. Select a proof policy or write a Custom proof claim.
2. Upload one or more evidence files.
3. Store the source files privately.
4. Extract document text and send the selected policy plus claim to Groq.
5. Validate the model result.
6. Hash the evidence and result.
7. Store the verification run in Neon.
8. Anchor the evidence hash, result hash, policy hash, verdict, and confidence on X Layer.
9. Provide a proof ID, share link, public proof page, and downloadable proof card.

## Local setup

    npm ci
    npm run dev

Open http://localhost:3000.

The fixture provider is used by verifier tests. Production mode uses the live Groq provider when MODEL_PROVIDER=groq.

## X Layer configuration

- Testnet chain ID: 1952
- Testnet RPC: https://testrpc.xlayer.tech/terigon
- Testnet explorer: https://www.okx.com/web3/explorer/xlayer-test
- Mainnet chain ID: 196
- Mainnet RPC: https://rpc.xlayer.tech
- Mainnet explorer: https://www.okx.com/web3/explorer/xlayer

The app uses XLAYER_NETWORK=testnet by default. Mainnet uses a separate contract address and must be enabled only after the Mainnet contracts are deployed and verified.

## Commands

    npm run typecheck
    npm test
    npm run build
    npm run start

Contracts:

    npm --workspace @prooflayer/contracts run compile
    npm --workspace @prooflayer/contracts run deploy:testnet
    npm --workspace @prooflayer/contracts run deploy:mainnet

## Release plan

Read docs/final-release-audit-and-hosting-plan.md before hosting or deploying Mainnet. It contains the security gate, hosting configuration, Mainnet sequence, team test matrix, and submission checklist.

## Trust model and limitations

ProofLayer does not prove that an AI system is infallible. It makes the verification process inspectable by exposing the verifier identity, model and pipeline version, policy version, evidence references, limitations, hashes, and onchain transaction metadata.

A verdict is an evidence assessment. It is not an independent guarantee of identity, ownership, authenticity, delivery, installation, or product performance.

## Security

Environment files are local-only and ignored by .gitignore. Never commit them. Rotate all provider, database, storage, and wallet credentials before hosting or Mainnet deployment.
