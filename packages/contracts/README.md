# ProofLayer contracts

This package contains the first onchain trust layer:

- VerifierRegistry: owner-managed verifier identity, operator, manifest hash, version hash, and active status.
- ProofLayerAttestations: immutable claim attestations containing evidence/result/policy hashes, verdict metadata, expiry, and revocation state.

Only an active registered verifier operator can anchor. Raw evidence never enters contract calldata.

## Commands

`npm run compile`
`npm test`
`npm run deploy:local`

X Layer testnet uses chain ID 1952 and mainnet uses chain ID 196. Keep deployer keys in environment variables only.
