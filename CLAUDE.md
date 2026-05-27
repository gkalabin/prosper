# Code generation guidance

Rules distilled from review feedback. Apply to any language or module.

## Naming

- Names describe **what the data is**, not how it's stored. `RateCache`,
  `warmCache`, `row`, `data`, `A`/`B` are bad.
- Avoid ambiguous verbs.

## Don't write code that isn't used

- No speculative helpers, caches, abstractions, or "future hooks" with no
  caller.
- If something _should not_ happen, let it fail loudly.
- Fix invariants at their source. If every reader needs display settings, create
  them at user creation — don't add `case ErrNoRows: return nil` in every
  reader.

## Layout

- Keep files focused; split when one accumulates unrelated responsibilities
  (~300 lines is a hint, not a rule).
- Domain types belong in the model package, not inline in service files.
  Transport conversions (proto ↔ model) belong in their own file.
- No anonymous inline structs scattered through function bodies — lift to named
  types in the right layer.
- `NewX` fully constructs the object, including wiring its dependencies. Callers
  shouldn't know the internal sequence.

## Constants

- URLs, timeouts, intervals, well-known keys, provider names — named constants
  in the package they belong to. If a sibling package already defines one,
  import it.

## Config

- Required values must fail loudly at load (`mustEnv`), not silently default at
  runtime. Defaults as named constants, not literals buried in the load
  function.

## Errors & logging

- On unexpected/malformed data (unknown enum, missing FK, bad row): **log with
  identifying details and skip the item.** Don't silently substitute
  `UNSPECIFIED`/zero. Don't crash the batch.
- Log lifecycle events: startup, shutdown, migrations applied (and "none to
  apply"), scheduler ticks, provider registration.

## Database

- No positional `Scan` against long `SELECT` lists — use named struct tags.
  Reordering a column must not silently corrupt data.
- Don't set DB-managed columns (`createdAt`, `updatedAt`) from app code.
- No `ON DUPLICATE KEY UPDATE` / `ON CONFLICT DO UPDATE` unless upsert is
  explicitly required.
- **Authorization is structural, not remembered.** If every query must filter by
  `userId`, design data access so omitting it fails at compile/test time. Don't
  load whole tables and filter in app code.

## Simplicity

- Hard-to-read code is wrong code. Refactor spaghetti into named helpers.
- Reach for the standard library before hand-rolling (string split, decimal
  parse, etc.).
- If complexity is unavoidable, comment **why** — never _what_. Names carry the
  _what_.
- Comments cover the function behaviour, why it exists.
- Comments must not mention internal implementation details.
- Comments must not mention chain of thought.
- Comments must not enumerate consumers or downstream usages, e.g. "Used by
  nginx as server_name and by certbot as the CN". Such lists read as exhaustive,
  leak details the definition shouldn't own, and rot the moment a new consumer
  is added. Describe what the value **is**, not who reads it.
- Restructure to eliminate edge-case branches (e.g. do the empty-safe work first
  instead of `if len == 0 { return }`).

## Scope

- Do exactly what's asked. Don't broaden queries, add idempotency/retry, or
  refactor surrounding code while implementing a feature. Note cleanups as TODOs
  and stop.

## Codestyle

- Follow google style guide for golang and typescript.
- Comments should not mention the previous code version or any chain of
  reasoning. DO NOT add comments like "It mirrors the previous TS logic"

## Git

- You must not change git state: do not stash or unstash changes, do not make or
  revert commits.
- Do not check git history unless you must. If you need to fix a bug, it doesn't
  matter if it's a new problem or existing one.
