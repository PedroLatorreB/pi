---
name: kickoff
description: Start a PoC by mapping project context and validating the initial plan.
---

Start a PoC for: $ARGUMENTS

Use `poc-memory`. If new, save goal, criteria, risks.

Steps:
1. Use the explorer agent to map relevant modules, patterns, and dependencies.
2. Validate the user's plan against existing project conventions.
3. Identify incorrect assumptions, risks, and missing requirements.

Return:
- Relevant files and patterns.
- Plan risks or gaps.
- Measurable success criteria: outcome, scope limits, edge cases, and validation method.
- Questions before implementation.

Do not implement anything.
