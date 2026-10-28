# PoC Workflow

A structured Proof-of-Concept / Pair Programming workflow for Pi, built from 7 composable skills and a **25-line extension** (no orchestrator skill).

## Overview

```
start → review → triage → decide → apply → iterate → (review | done)
                        ↑_______________________________________|
```

Each phase is a separate skill with a single responsibility. The `/poc` extension maps commands to sub-skills with baked-in flags.

## Skills

| Skill | Purpose | Key Features |
|-------|---------|--------------|
| `poc_kickoff` | Map context, validate plan | `--preflight` checks open PoCs, dirty tree, conflicts |
| `poc_review` | Diff review against goals | `--reviewers security,perf,ux` parallel fanout |
| `poc_analyze_feedback` | Prioritize findings | `--auto-classify` tags blocker/important/optional |
| `poc_decide_next` | Gate next step | Shows rollback hints per implemented fix |
| `poc_implement_approved` | Apply approved fixes | `--dry-run` shows combined diff first |
| `poc_iterate` | Re-review after apply | Re-validates original criteria, flags scope drift |
| `poc_memory` | Engram persistence | Versioned keys: `review/<n>/`, `iterate/<n>/`, `meta` |

All skills stay under 36 lines. No skill implements business logic — they orchestrate tools, memory, and agents.

## Quick Start

```bash
# One-time: enable the extension (already in settings.json)
# Restart Pi or `/reload`, then:

/poc start "add dark mode toggle"    # kickoff + preflight
/poc review                          # review with parallel reviewers
/poc triage                          # analyze findings, auto-classify
/poc decide                          # criteria check + rollback hints
/poc apply                           # dry-run → apply approved fixes
/poc iterate                         # re-validate criteria, find new issues
/poc status                          # show cycle, blockers, next step
/poc handoff                         # package context for transfer
```

## Engram Integration

All persistence flows through `poc-memory` using versioned topic keys:

```
poc/<slug>/goal              # original goal
poc/<slug>/criteria          # success criteria
poc/<slug>/meta              # cycle_count, created_at, last_review_at
poc/<slug>/review/<n>/findings|approved
poc/<slug>/iterate/<n>/findings|blockers
poc/<slug>/implemented/<n>/fixes|risks
poc/<slug>/status            # new|reviewing|awaiting-user|implementing|iterating|done|blocked
```

The extension passes `POC_SLUG` (defaults to directory name) so all skills share the same namespace. Session summaries capture phase transitions automatically.

## Phase Details

### `start` — Kickoff
- Preflight: checks for existing PoC, uncommitted changes, conflicting branches
- Explorer agent maps relevant modules, patterns, dependencies
- Validates plan against project conventions
- Saves goal, criteria, risks to Engram

### `review` — Diff Review
- Loads goal/criteria from Engram
- Runs `git diff` (or user-specified range)
- Optional parallel reviewers: security, performance, UX
- Applies domain skills (vue-rules, sqlserver-rules, api-rules, etc.)
- Saves findings to `review/<n>/findings`

### `triage` — Analyze Feedback
- Loads findings, auto-tags by severity (blocker/important/optional)
- For each finding: explains impact, proposes minimal fix, identifies affected files
- User classifies: "I will fix", "Delegate", "Defer"
- Saves approved corrections to `review/<n>/approved`

### `decide` — Gate Next Step
- Loads all PoC state, checks success criteria
- If blockers exist: recommends iterate/delegate (never stop)
- Shows rollback commands: `git checkout -- <files>` per implemented fix
- Updates status, saves closure summary

### `apply` — Implement Approved
- Reads `approved` items only
- `--dry-run` shows combined diff before applying
- Makes smallest reversible changes, respects project patterns
- Tracks implemented files for rollback hints
- Saves to `implemented/<n>/fixes`

### `iterate` — Re-Review
- Verifies previous blockers resolved without regressions
- **Re-validates against original success criteria** — flags scope drift
- Searches new angles: correctness, data, UX, performance, tests
- Ignores resolved findings and out-of-scope refactors
- Saves to `iterate/<n>/findings`

### `status` / `handoff`
- `status`: reads `meta.cycle_count`, current status, open blockers, next step
- `handoff`: packages full context (goal, criteria, decisions, diff, risks) for agent/human transfer

## Configuration

Add to `settings.json`:
```json
{
  "extensions": ["./extensions/poc.ts"]
}
```
Restart Pi or `/reload` to load.

## Design Principles

1. **No orchestrator skill** — 25-line extension maps `/poc <cmd>` → `/skill:subskill`
2. **Engram-transparent** — extension passes slug; all persistence in 7 sub-skills
3. **Phase guards** — `apply` blocked until `decide`, `iterate` requires `apply`
4. **Default flags on** — preflight, parallel reviewers, auto-classify, dry-run always enabled
5. **Single mental model** — one command, predictable flow

## Files

```
~/.pi/agent/
├── skills/
│   ├── poc_kickoff/SKILL.md
│   ├── poc_review/SKILL.md
│   ├── poc_analyze_feedback/SKILL.md
│   ├── poc_decide_next/SKILL.md
│   ├── poc_implement_approved/SKILL.md
│   ├── poc_iterate/SKILL.md
│   └── poc_memory/SKILL.md
├── extensions/
│   └── poc.ts              # 25-line Pi extension registering /poc
└── settings.json           # loads extension
```

## Extending

- Add domain skills (e.g., `rust-rules`) — `review` auto-applies them
- Adjust reviewer list in `poc.ts` `PHASES` map
- Modify `poc-memory` topic key schema for custom metadata
- Add `poc-rescope` skill if mid-PoC scope changes are common