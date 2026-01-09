---
trigger: model_decision
description: When working on tests
---

## Testing Standards

### Unit Testing

- **Framework:** Jest.
- **Scope:** Critical business logic and utilities.
- **Mocks:** Mock external API calls (e.g., Open Banking, Exchange Rates).
- Use `npm run test` to run unit tests.

### End-to-End (E2E) Testing

- **Framework:** Playwright.
- **Location:** `e2e` directory at project root.
- **Structure:** One `.spec.ts` file per feature.
- **Selectors:**
  - **Do NOT** use test IDs unless absolutely necessary.
  - **Prefer** semantic locators (e.g., `getByRole`, `getByText`, `getByLabel`).
- **Test data:** prefer realistic values in tests. For example, "HSBC" instead
  of "Test Bank". Use a few different values across the tests, do not use the
  same value in every single test.
- Use `npx playwright test` to run end-to-end tests.
- When debugging e2e tests, use `localhost:3003` to access the app.
