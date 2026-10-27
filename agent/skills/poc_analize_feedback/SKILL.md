---
name: poc-analyze-feedback
description: Prioritize review findings and propose minimal corrections.
---

Analyze the latest PoC review for: $ARGUMENTS

Use `poc-memory`. Load `findings`; save user-approved corrections to `approved`; deferred items stay in `findings`.

For each finding:
1. Explain why it matters in this project.
2. Describe the concrete failure or risk.
3. Propose the smallest safe correction.
4. Identify affected files, APIs, reports, or flows.

Order findings as:
- Must fix before completion
- Should fix soon
- Can defer

Do not implement changes.

End by asking the user to classify each finding as:
- "I will fix this"
- "Delegate to implementer"
- "Defer"
