# Replace HockeyStack attribution reviews

The free base imports Stage Data and Spend Data exports delivered by HockeyStack Data Syncs, saved from your warehouse as UTF-8 CSV with headers. It does not claim there is a one-click CSV download in the self-serve plan. Confirm your export entitlement and access before scheduling a switch.

Vendor sources checked 9 November 2026:
- [Configure a Data Syncs Export](https://docs.hockeystack.com/integrations/datasyncs/configure-a-datasync-export)
- [Stage Data Export Schema](https://docs.hockeystack.com/integrations/datasyncs/configure-a-datasync-export/stage-data-export-schema)
- [Spend Data Export Schema](https://docs.hockeystack.com/integrations/datasyncs/configure-a-datasync-export/spend-data-export-schema)

## One command per export

```bash
npm run attribution -- import hockeystack --kind=stage --file=imports/stage.csv --mapping=imports/touchpoints.json --source=your-company --retention-due=2027-01-31 --actor="Your name" --dry-run
npm run attribution -- import hockeystack --kind=spend --file=imports/spend.csv --source=your-company --actor="Your name" --dry-run
```

Inspect the preview, then repeat without --dry-run. The date above is an example; select the review date under your own policy. Fixtures use invented records and the documented columns, not an actual customer export.

## Mapping

Stage exports have dynamic touchpoint and stage columns. Use a mapping such as `{"touchpoints":{"Web visit":"Organic","Demo booked":"Direct"}}`, with exactly your export's column names. Each input row must match exactly one mapped touchpoint. Zero matches, multiple matches and unrecognised flag values reject the whole batch. Stage-only rows need a separately agreed mapping; the importer never guesses their channel.

unique_id and source identify the event. date is an ISO calendar date or timestamp with timezone, converted to a UTC day. company_id, or company_domain when no id exists, becomes the account code prefixed HS:. Imported account names use the domain or company identifier, not an invented company name. deal_id restricts credit to that exact deal code. A blank deal_id permits account-level association within each deal's lookback window. Every original column, including identifiers, is preserved in raw evidence.

Stage data does not provide a complete deal value ledger. Add your reconciled won deals separately with add-deal, matching the exported deal_id and account. Do not infer deal value from a stage flag. All imported events start unverified and new accounts need an explicit purpose review before credit is allocated.

Spend mapping: date, unique_id, network, campaign_name (or campaign_id), cost and currency. Cost is in major units with at most two decimals. No foreign exchange conversion. Other fields remain in raw evidence. Channel matching between spend and touches is exact: use the network name in the touchpoint mapping where appropriate. Vendor spend exports contain no attributed revenue. Historic corrections may require a full vendor re-sync; changed duplicates are refused for deliberate reconciliation.

## Check before switching

1. Compare source and imported event/spend row counts using import-health and export.
2. Reconcile won deal counts and value separately by currency.
3. Check actual dates, touchpoint mapping, purpose, retention policy and event accuracy.
4. Compare first, last and linear credit. Each attributable deal allocates its full value once per model. Unattributed deals remain visible.
5. Keep the original tracking and platform until required collection, integrations, shared screens and historical continuity have been built and tested.

No browser tracker, identity resolution, live CRM sync, predictive model, ad activation or causal lift analysis is included. Enterprise DNA builds the required connections and screens into your version. The switch-in-a-day promise is for supported, prepared exports with reconciled outcome data, not for replacing an entire tracking estate.
