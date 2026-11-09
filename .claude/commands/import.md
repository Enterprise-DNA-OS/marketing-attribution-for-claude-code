---
description: Bring HockeyStack evidence across
---

# Bring HockeyStack evidence across

Run `npm run attribution -- import hockeystack --kind=stage --file=<CSV> --mapping=<mapping.json> --source=<export namespace> --retention-due=<YYYY-MM-DD> --actor="<operator>"`. Add `--json` for structured output. Replace angle-bracket values from the operator's records.

Run with --dry-run first, inspect the result, then run without it when the operator has requested the change. Never invent an actor, purpose, date, evidence or amount.
Read docs/replace-hockeystack.md. Mapping keys must match this export. A spend export uses --kind=spend without --mapping or --retention-due. Reconcile counts before verifying evidence.
