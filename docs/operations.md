# Operations and recovery

Use Node 20 or later. npm run demo migrates and seeds fictional records. Never seed a working store. PGlite uses DATA_DIR or .data/db. PostgreSQL uses DATABASE_URL and validates TLS for remote hosts. Use a dedicated database and a trusted owner role; public access is revoked and row security is enabled without public policies. This is not a multi-user authorisation system.

Keep production files under ignored imports/ and exports/. Generated documents, views and drafts can contain personal information. OUTPUT_DIR selects another private directory. Use encrypted disks, backups and appropriate access controls. The CLI does not authenticate the --actor string and administrators can alter its audit history.

For PGlite, stop all writers and copy the entire data directory. Test recovery against a separate copy before replacing the live folder. For PostgreSQL, use your provider's backups or pg_dump and restore into a separate database. JSON exports are readable portability snapshots, not an implemented restore tool. Export refuses to overwrite an existing file.

Imports are transactional and idempotent for identical source/id records. Changed duplicates reject the batch. Confirm corrections against the source and add a reviewed migration rather than silently rewriting evidence. Keep the source namespace stable for repeat imports; changing it can duplicate logical events.

Attribution eligibility is evaluated at query time. Review and retention dates can change today's result. Generated packs preserve what was seen; the base does not promise immutable historical model snapshots. UTC dates and a closed-deal date define eligibility. The default lookback is 180 days, inclusive, and can be set per deal from 1 to 730 days. Calendar-day precision cannot distinguish an event after a deal close on the same day.
