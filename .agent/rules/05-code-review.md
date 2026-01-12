---
trigger: model_decision
description: When reviewing code or making changes
---

## Code Review

### General Principles

1. **Correctness First:** Ensure changes solve the stated problem without
   introducing regressions.
2. **Minimal Scope:** Changes should be focused and not include unrelated
   modifications.
3. **Consistency:** Follow existing patterns and conventions in the codebase.
4. **Readability:** Code should be self-documenting with clear intent.

### Review Checklist

#### Type Safety

- No use of `any` type.
- Proper null/undefined handling.
- Generic types used appropriately.

#### Code Quality

- Functions are single-purpose and reasonably sized.
- No code duplication; extract shared logic into utilities.
- Magic numbers and strings are replaced with named constants.
- Dead code and unused imports are removed.

#### Naming

- Names are descriptive and follow casing conventions similar to existing code.
  If there no such precedent, follow Google style guide.
- Avoid abbreviations unless widely understood (e.g., `id`, `url`).
- Boolean variables/functions use `is`, `has`, `should` prefixes.

#### Error Handling

- Errors are handled gracefully, not silently swallowed.
- User-facing errors provide actionable messages.
- Edge cases are considered and tested.

#### Performance

- Avoid unnecessary re-renders in React components.

#### Security

- User input is validated and sanitized.
- Sensitive data is not logged or exposed in error messages.

### Review Process

1. **Understand Context:** Read the change description and related issues.
2. **Check Tests:** Verify that changes include appropriate test coverage.
3. **Verify Locally:** Run the affected code path when possible.
4. **Provide Feedback:** Be specific, actionable, and constructive.

### When Making Changes

- Run `npm run lint` to check for linting errors.
- Run `npm run test:unit` to verify unit test coverage.
- Run `npm run test:e2e` to verify end-to-end test coverage.
- Run relevant tests before considering work complete.
- Self-review changes before marking as done.
