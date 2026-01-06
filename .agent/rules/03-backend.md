---
trigger: model_decision
description: When working on features requiring backend support
---

## Backend Architecture

### Data Layer

- **ORM:** Prisma (MySQL).
- **Schema:** Split into multiple files within `prisma/schema/`.
- **Validation:** Zod is mandatory for all schema inputs and API boundaries.

### Application Logic

- **Architecture:** Use Server Actions for all mutations (located in
  `src/actions`).
- **Security:**
  - Validate all inputs via Zod.
  - Mandatory Authentication & Authorization checks on every Server Action.

### Infrastructure

- **Deployment:** Docker-based.
- **Hosting:** Supports self-hosting; Terraform used for GCP provisioning.
