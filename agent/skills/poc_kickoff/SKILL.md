---
name: kickoff
description: Start a PoC by mapping project context and validating the initial plan.
---

Start a PoC for: $ARGUMENTS

Use `poc-memory`. If new, save goal, criteria, risks.

Steps:
1. **Preflight** (if `--preflight`): check for open PoCs, dirty tree, conflicting branches.
2. Use the explorer agent to map relevant modules, patterns, and dependencies.
3. Validate the user's plan against existing project conventions.
4. Identify incorrect assumptions, risks, and missing requirements.

Return:
- Relevant files and patterns.
- Plan risks or gaps.
- Measurable success criteria: outcome, scope limits, edge cases, validation method.
- Questions before implementation.

Do not implement anything.
