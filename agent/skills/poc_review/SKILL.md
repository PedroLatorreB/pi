---
name: poc-review
description: Review the current PoC diff against the agreed goal and project context.
---

Review the current PoC for: $ARGUMENTS

Use `poc-memory`. Load goal/criteria/prior findings; save blockers and user classifications to `findings`.

Use `git diff` for unstaged changes, or the diff/range specified by the user.
Use the reviewer agent when a second opinion is useful.
**Parallel review** (if `--reviewers`): fan out to ["security", "perf", "ux"] specialists.

Evaluate:
1. Goal and success-criteria compliance.
2. Bugs, edge cases, regressions.
3. Project conventions, compatibility, maintainability.
4. Missing tests or validations.

Apply relevant domain skill: vue-rules, sqlserver-rules, ssrs-rules, api-rules.

Return:
- Blockers
- Important issues
- Optional improvements
- Verdict: approve, approve with changes, or rework

End by asking user to classify each finding:
- "I will fix this"
- "Delegate to implementer"
- "Defer"

Do not edit files.
