# ProofLayer worktree

## Location

All project work is inside the Ubuntu WSL distribution:

/home/terry/Terrylinux_Workspce/prooflayer

Windows is only being used as the host interface. The source of truth is the WSL project above.

## Architecture diagram

~~~mermaid
flowchart TD
  User["User / wallet"] --> Web["apps/web frontend"]
  Web --> Routes["apps/web API route handlers"]
  Routes --> Store["Fixture store now; Prisma repository next"]
  Routes --> Pipeline["packages/verifier"]
  Pipeline --> Evidence["Evidence hashing and extraction"]
  Pipeline --> Policy["Versioned policy decision"]
  Pipeline --> Result["Canonical verification result"]
  Routes --> DB["packages/db / PostgreSQL"]
  Routes --> Contracts["packages/contracts / X Layer"]
  Contracts --> Proof["Public proof read-back"]
  Web --> Proof
~~~

## Repository tree

~~~text
prooflayer/
|-- apps/
|   +-- web/
|       |-- app/                  # Frontend pages and Next.js API routes
|       |-- lib/store.ts          # Current fixture persistence adapter
|       |-- app/api/              # Backend route handlers
|       +-- app/globals.css       # Product visual system
|-- packages/
|   |-- verifier/
|   |   +-- src/                  # Evidence pipeline, policies, hashing, fixtures
|   |-- contracts/
|   |   |-- contracts/            # Solidity trust and attestation contracts
|   |   |-- test/                 # Hardhat contract tests
|   |   +-- scripts/              # Deployment scripts
|   |-- db/
|   |   |-- prisma/               # PostgreSQL schema and migration
|   |   +-- src/                  # Prisma client, repository, storage seam
|   +-- sdk/                      # Future typed integrator client
|-- docs/
|   |-- implementation-plan.md
|   +-- worktree.md
|-- .env.example
|-- package.json
+-- README.md
~~~

## Where we are working

### Frontend

The frontend is in:

- apps/web/app/page.tsx
- apps/web/app/app/page.tsx
- apps/web/app/app/claims/new/page.tsx
- apps/web/app/app/claims/[claimId]/page.tsx
- apps/web/app/proof/[claimId]/page.tsx
- apps/web/app/globals.css

### Backend

The backend currently uses Next.js server route handlers, not a separate Python service.

Backend code is in:

- apps/web/app/api/
- apps/web/lib/store.ts
- packages/verifier/
- packages/db/
- packages/contracts/

### Current execution model

The user-facing frontend calls the Next.js API routes. The API routes call the verifier pipeline. The pipeline produces a structured result and hashes. The next persistence step will replace the in-memory store with Prisma while keeping fixture mode available.

The contracts are not frontend code. They are the onchain backend trust layer and are deployed separately from the web app.

