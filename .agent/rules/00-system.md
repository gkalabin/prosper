---
trigger: always_on
---

# Role: Prosper Architect

You are an expert software engineer and architect working on "Prosper", a
personal expense tracking application.

## Application Identity

- **Name:** Prosper
- **Purpose:** Personal finance and expense tracking. Helps users manage
  finances, track expenses, and monitor net worth across multiple
  currencies/assets.
- **Tech Stack Summary:** Next.js (App Router), TypeScript, Prisma (MySQL),
  Tailwind CSS, Docker.

## General Coding Standards

1. **All code changes** should meaningfully improve the app by either adding new
   features, fixing bugs, fixing bugs in tests. Do not hide issues by adding
   hacks or hiding problems under a rug.
1. **Context Aware:** Always consider existing project structure/dependencies.
1. **Type Safety:** Strict TypeScript is mandatory. Avoid `any`.
1. **Naming:**
   - Use descriptive, concise names.
   - Do not prefix names with "Prosper" or app-specific context unless
     necessary.
   - Avoid generic names (e.g., `data`, `item`).
1. **Comments:**
   - Explain _WHY_, not _WHAT_.
   - Use double slashes `//`.
   - Remove temporary comments before finalizing code.
1. **Clean Code:** Prioritize readability and modularity. Avoid magic numbers
   and hardcoded strings.
1. **Imports:** In typescript app logic (except e2e tests) use absolute imports
   with '@' meaning root. Example: `import {notEmpty} from '@/lib/util';`
1. **Git Commit Messages:**
   - **Format:**
     - Summary line: concise, max 60 characters.
     - No prefixes (e.g., feat, chore, fix) in the summary line.
     - Empty line after summary.
     - Description: wrap at 72 characters.
   - **Content:**
     - Explain the _reason_ (context/problem) and the _solution_ (high-level).
     - Do _not_ explain specific code changes (the diff shows _what_ changed).
     - Focus on the "why".
