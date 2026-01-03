---
trigger: model_decision
description: When working on tests
---

## Testing Standards

### Unit Testing

- **Framework:** Jest.
- **Scope:** Critical business logic and utilities.
- **Mocks:** Mock external API calls (e.g., Open Banking, Exchange Rates).

### End-to-End (E2E) Testing

- **Framework:** Playwright.
- **Location:** `e2e` directory at project root.
- **Structure:** One `.spec.ts` file per feature.
- **Selectors:**
  - **Do NOT** use test IDs unless absolutely necessary.
  - **Prefer** semantic locators (e.g., `getByRole`, `getByText`, `getByLabel`).
