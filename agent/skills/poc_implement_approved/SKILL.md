---
name: poc-implement-approved
description: Implement only explicitly approved PoC corrections.
---

Implement only the approved corrections for: $ARGUMENTS

Use `poc-memory`. Implement only `approved` items. Update implemented fixes and new risks.
**Dry-run** (if `--dry-run`): show combined diff preview before applying.

Rules:
1. Follow the approved plan exactly.
2. Make the smallest reversible change.
3. Respect existing project patterns.
4. Do not expand scope or refactor unrelated code.
5. Show the final diff.
6. Suggest validation commands, but do not run destructive commands.
7. Stop and ask if the plan is ambiguous or contradicts the code.
