---
name: poc-memory
description: Persist and recover PoC state with Engram.
---

Load: `mem_current_project`, `mem_context`; search `mem_search` with `$ARGUMENTS` + topic key.
For a critical prior decision, use `mem_get_observation`.

Topic keys:
`poc/<slug>/goal|criteria|findings|approved|risks|status`

Status: new | reviewing | awaiting-user | implementing | iterating | done | blocked

Save durable facts only with `mem_save`: goal, criteria, decisions, findings, user classifications, implemented fixes, risks, closure.
Format: What / Why / Where / Learned. Reuse topic keys; do not save diffs, raw output, or chat turns.
To change a decision, update its topic key and record the reason.

End phase: update relevant topic keys.
End session: `mem_session_summary` with goal, phase, pending, risks, next step.
If context is missing, recover it; if still missing, ask. Never invent decisions.
