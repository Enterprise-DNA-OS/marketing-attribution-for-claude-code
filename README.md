# Marketing Attribution for Claude Code

Explain which recorded marketing touches receive credit for won deals. Keep the evidence, the rules and the follow-up work in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and run the demo. | Your fields, attribution rules, export mapping and connections. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=hockeystack) · [Instead of HockeyStack](https://enterprisedna.co/omni/instead-of/hockeystack?utm_source=github&utm_medium=readme&utm_campaign=hockeystack)

## Start with the Monday review

Node 20 or later:

```bash
npm install
npm run demo
npm run attribution -- weekly-review
npm run view
npm run docs
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md and CLAUDE.md point every runtime at the same commands. PGlite works locally; DATABASE_URL selects PostgreSQL. The demo is fictional and includes an unverified event, an overdue retention review, overdue work and a won deal without eligible evidence. Dates are relative to today. Seeding twice leaves existing records intact. Never seed a working database.

## Weekly rituals

/channel-credit, /model-comparison, /spend-review, /unattributed and /weekly-review are the marketing desk. /journey shows buyer evidence. /attention and /owner-load give work to the right person. /compliance checks privacy review fields against cited rules. /draft-review and /draft-privacy create private paperwork and never send it.

26 CLI commands and 30 slash-command recipes. Every CLI command accepts --json. Changes require --actor and support --dry-run. Codes, partial ids and case-insensitive name matching work; ambiguous names list candidates and exit 1.

## What the numbers mean

Only won deals receive credit. Eligible events are verified, within the deal's inclusive lookback window, on or before its close date, within their retention-review period, and attached to an account with a current purpose review. A deal-specific event must match the deal code. Blank deal codes allow account-level association.

First and last touch allocate the whole deal to one event. Linear divides integer cents equally and distributes remainder cents in date/id order. All three reconcile exactly to each attributable deal. Multiple currencies never merge. Unattributed revenue stays visible. Spend review compares period spend with period won-deal credit, not causal return on investment. [Limits and operating policy](docs/operations.md).

## Ten questions you can answer today

These are demonstrated questions, not unverified claims that the incumbent cannot answer them.

1. Which won deals have no eligible touchpoints? Run `unattributed`.
2. How does channel credit change between first, last and linear models? Run `model-comparison`.
3. Which channels have spend but no credited wins? Run `spend-review`.
4. Which overdue review is keeping an account out of attribution? Run `compliance`.
5. Which buyer events happened after the recorded close date? Run `journey AC-01`.
6. Which owner has overdue follow-up work? Run `owner-load`.
7. Which imported events still need an accuracy check? Run `attention`.
8. What revenue credit belongs to each currency? Run `channel-credit`.
9. How many records arrived in each import batch? Run `import-health`.
10. Who recorded an evidence review and what did they check? Run `activity`.

## Bring your history

```bash
npm run attribution -- import hockeystack --kind=stage --file=fixtures/hockeystack-stage.csv --mapping=fixtures/touchpoints.json --source=demo-export --retention-due=2027-01-31 --actor="Your name" --dry-run
```

Replace the fixture with a Stage Data export delivered to your warehouse and saved as CSV. Map your dynamic touchpoint columns explicitly. Spend Data has a separate one-command import. Stage exports do not provide a complete deal value ledger: reconcile and add outcomes separately. Imported evidence stays unverified until reviewed. [Exact mapping and switch guide](docs/replace-hockeystack.md).

## Documents and views

Edit brand.json once. npm run docs produces account evidence reviews and deal credit reconciliations. npm run view creates weekly, model and follow-up snapshots. /new-view adds a read-only report. /customise adds a tested migration and your own rules. [Privacy rules and their sources](docs/compliance.md).

## Your first hour: ten things to ask for

1. Put our name and colours on the review.
2. Show the demo deal without evidence.
3. Compare the three models.
4. Explain the remainder cent.
5. Show spend separately for each currency.
6. Preview our Stage Data export.
7. Map our actual touchpoint columns.
8. Record our purpose and retention-review policy.
9. Draft this week's review with the overdue owner.
10. Add a tested business-unit field and a view grouped by it.

## Verification and scope

npm test uses an isolated database and checks arithmetic, lookback boundaries, missing evidence, currency separation, import rollback and idempotency, ambiguity, audit, exports and escaped documents. CI runs on Windows and Linux, plus PostgreSQL. A configured workflow is not evidence it has completed.

No browser tracker, identity stitching, live CRM connection, ad activation, predictive model or causal lift measurement ships in this base. [Why there is no front end](docs/why-no-front-end.md). Enterprise DNA builds the connections and shared screens your business needs and runs your version through Omni by Enterprise DNA, for one setup fee then a retainer.

HockeyStack Self-Serve lists $1,250 per month on its [vendor page](https://www.hockeystack.com/smb), checked 9 November 2026. Twelve payments total $15,000, a list-price calculation rather than a customer invoice. [Selection evidence](docs/research.md).

MIT. Not affiliated with HockeyStack or Anthropic. Hosting and agent usage have their own costs.
