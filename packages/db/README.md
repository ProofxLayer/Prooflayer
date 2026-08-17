# ProofLayer database

This Prisma package models claims, private evidence references, verification runs, attestations, audit events, verifiers, and challenges.

The web app keeps an in-memory fixture adapter for credential-free demos. Production and testnet deployments should set DATABASE_URL, run prisma generate, apply migrations, and seed the verifier profile.
