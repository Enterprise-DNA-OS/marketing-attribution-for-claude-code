---
description: Record an outcome
---

# Record an outcome

Run `npm run attribution -- add-deal --code=<code> --account=<account> --name="<name>" --amount-cents=<integer> --currency=<NZD|AUD|USD> --closed-on=<YYYY-MM-DD> --status=<open|won|lost> --actor="<operator>"`. Add `--json` for structured output. Replace angle-bracket values from the operator's records.

Run with --dry-run first, inspect the result, then run without it when the operator has requested the change. Never invent an actor, purpose, date, evidence or amount.
