---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
description: Generate a commit message for the current changes
---

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`

## Your task

Write a commit message for the changes above. Do not stage, commit, or otherwise
change git state — only produce the message text.

Write a Linux-kernel-style commit message and obey the 50/72 rule:

- Subject line: imperative mood ("fix", "add", not "fixed"/"adds"), lower-case
  after any `scope:` prefix, no trailing period, **50 characters max**.
- Leave one blank line after the subject, then a body wrapped at **72
  characters** per line. Explain **why** the change is needed and anything
  non-obvious about how it works — not what each line does. Skip the body only
  for truly trivial changes.
- Describe what the change accomplishes, not a file-by-file listing of the diff.
- Order the body by user impact: lead with the most user-facing change right
  after the subject, then supporting changes.
- Stay at the altitude of what the change accomplishes. Omit low-level
  plumbing details a reader doesn't care about — a function gaining a
  parameter, a small util helper, an internal variable or constant. Mention
  an internal detail only when it's genuinely non-obvious and needed to
  understand the change.
- If the staged and unstaged changes look like more than one logical change,
  say so and suggest how to split them rather than forcing one message.

Output only the commit message in a code block, ready to copy.
