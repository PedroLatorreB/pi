---
name: poc-iterate
description: Re-review a corrected PoC and decide whether another iteration is needed.
---

Re-review the PoC after corrections for: $ARGUMENTS

Use `poc-memory`. Load findings/approved; mark resolved items, save new blockers/risks.
Before recommending stop, verify: no open blockers, approved fixes implemented, validation suggested.
Steps:
1. Inspect the current diff or specified changes.
2. Verify that previous blockers were resolved without regressions.
3. Search for new issues from a different angle: correctness, data, UX, performance, or tests.
4. Ignore already-resolved findings and out-of-scope refactors.

Return:
- Remaining blockers
- New risks
- Optional improvements
- Clear recommendation: iterate again or stop

Do not edit files.
