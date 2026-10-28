---
name: poc-decide-next
description: Decide whether the PoC is done, needs fixes, or should be delegated.
---

Decide the next step for: $ARGUMENTS

Use `poc-memory`. Load all PoC keys; update `status` to exactly one valid value.
If open blockers exist, do not recommend stop. Recommend iterate or delegate.
Assess the latest review and current diff.
**Rollback hints**: for each implemented fix, show `git checkout -- <files>` to revert.

Return:
1. Does the PoC meet the agreed success criteria?
2. Mandatory changes before completion.
3. Changes to defer.
4. Recommendation: user implements, delegate to implementer, or stop.
5. Brief closure: implemented scope, key decisions, known risks, and next steps.

Do not edit files.
