---
trigger: always_on
---

## Frontend Architecture

### Core Framework

- **Next.js:** Use App Router conventions (`src/app`).
- **State:** Use standard React hooks for local state.
- **Components:** Located in `src/components`. Keep them small and focused.

### Styling Guidelines

- **Framework:** Tailwind CSS.
- **Class Management:** Use `clsx` and `tailwind-merge` for conditional
  rendering.
- **Libraries:** Radix UI and Headless UI for accessible, unstyled primitives.
- **Design Language:** Follow existing Tailwind patterns; ensure UX consistency.

### Best Practices

- **Server vs Client:** Prefer Server Components where possible. Use Client
  Components only for interactivity.
- **Accessibility:** Ensure all interactive elements remain accessible via
  keyboard and screen readers (leveraging Radix/Headless).
