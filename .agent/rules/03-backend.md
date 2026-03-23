---
trigger: model_decision
description: When working on features requiring backend support
---

## Backend Architecture

### Process layout

- The Go backend (`backend/`) owns all business logic and database access. It
  exposes gRPC over a Unix domain socket.
- The Next.js frontend (`src/`) is a thin client: server actions and API routes
  forward to the backend over gRPC.

### Data layer

- **Database:** MySQL accessed via `sqlx` from Go.
- **Schema:** Plain SQL files under `backend/db/migrations/`, applied
  automatically at backend startup.
- **Per-user scoping:** The `userdb` wrapper rejects queries that do not bind
  `:userId`. Queries that legitimately span users must go through `Raw()`.

### Application logic

- **Validation:** Zod is mandatory for all schema inputs and API boundaries on
  the frontend.
- **Security:** Mandatory authentication & authorization checks on every Server
  Action.

### Infrastructure

- **Deployment:** Docker-based.
- **Hosting:** Supports self-hosting; Terraform used for GCP provisioning.
