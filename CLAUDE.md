# Marketing Attribution for Claude Code

This is an owned evidence desk for a marketing operator. Fill in your business and owner in brand.json. Claude Code, Codex, OpenCode and Cursor use the same scripts and command recipes.

Every answer starts with a CLI read. Never claim a model proves causality, silently combine currencies, infer consent from a visit, or invent vendor limitations.

## One route per recurring job

- Account review: `/accounts`.
- Recorded deals: `/deals`.
- Buyer journey: `/journey`.
- Weekly channel credit: `/channel-credit`.
- Compare first, last and linear credit: `/model-comparison`.
- Reconcile spend against credit: `/spend-review`.
- Find won deals without evidence: `/unattributed`.
- Find overdue work and unverified events: `/attention`.
- Review privacy evidence: `/compliance`.
- Follow-up list: `/actions`.
- Review owner workload: `/owner-load`.
- Check import batches: `/import-health`.
- Read the change record: `/activity`.
- Monday attribution review: `/weekly-review`.
- Record an account: `/add-account`.
- Record an outcome: `/add-deal`.
- Record a touchpoint: `/log-touch`.
- Assign follow-up work: `/add-action`.
- Close a follow-up: `/close-action`.
- Review purpose and owner: `/review-account`.
- Verify event evidence: `/verify-touch`.
- Bring HockeyStack evidence across: `/import`.
- Export portable records: `/export`.
- Draft the weekly review: `/draft-review`.
- Draft a privacy evidence review: `/draft-privacy`.
- List available commands: `/help`.
- Brand paperwork: `/docs` and `/view`.
- Change the model: `/customise`.
- Add a read-only report: `/new-view`.

## House rules

Run `npm run attribution -- help` for the CLI. Every command accepts --json. Mutations require --actor and support --dry-run. Imported events are unverified and imported accounts have no approved purpose. Run review-account and verify-touch with real evidence before using them in attribution. A recorded name is not authenticated identity.

Never send, publish, delete or call an ad platform from here. Drafts remain in drafts/. Do not seed a working database. Keep real imports in imports/, exports in exports/, and credentials out of git. DATABASE_URL selects PostgreSQL; otherwise PGlite uses .data/db. All database roles are for a trusted operator, not exposed to browsers.

Read docs/compliance.md for sourced review prompts, docs/replace-hockeystack.md for the import contract and docs/operations.md for backups. Read .claude/commands/<job>.md for a recurring job. Add migrations for customisation, never edit applied history.

Built and run for you through Omni by Enterprise DNA: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=hockeystack
