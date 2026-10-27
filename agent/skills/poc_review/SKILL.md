---
name: poc-review
description: Review the current PoC diff against the agreed goal and project context.
---

Review the current PoC for: $ARGUMENTS

Use `poc-memory`. Load goal/criteria/prior findings; save blockers and user classifications to `findings`.

Use `git diff` for unstaged changes, or the diff/range specified by the user.
Use the reviewer agent when a second opinion is useful.

Evaluate:
1. Goal and success-criteria compliance.
2. Bugs, edge cases, and regressions.
3. Project conventions, compatibility, and maintainability.
4. Missing tests or validations.

Apply the relevant domain skill:
- Vue/TypeScript: vue-rules
- SQL Server: sqlserver-rules
- SSRS: ssrs-rules
- API design: api-rules

Return:
- Blockers
- Important issues
- Optional improvements
- Verdict: approve, approve with changes, or rework

End by asking the user to classify each finding as:
- "I will fix this"
- "Delegate to implementer"
- "Defer"

Do not edit files.
