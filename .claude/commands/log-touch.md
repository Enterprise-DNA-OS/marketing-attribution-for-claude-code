---
description: Record a touchpoint
---

# Record a touchpoint

Run `npm run attribution -- log-touch --code=<id> --source=<source> --account=<account> --date=<YYYY-MM-DD> --channel="<channel>" --retention-due=<YYYY-MM-DD> --actor="<operator>"`. Add `--json` for structured output. Replace angle-bracket values from the operator's records.

Run with --dry-run first, inspect the result, then run without it when the operator has requested the change. Never invent an actor, purpose, date, evidence or amount.
