CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
 owner text NOT NULL DEFAULT '', purpose text NOT NULL DEFAULT '', review_due date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE deals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, account_id uuid NOT NULL REFERENCES accounts,
 name text NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 1000000000000),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), closed_on date NOT NULL,
 status text NOT NULL CHECK(status IN ('open','won','lost')), lookback_days integer NOT NULL DEFAULT 180 CHECK(lookback_days BETWEEN 1 AND 730),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE touches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, external_id text NOT NULL,
 account_id uuid NOT NULL REFERENCES accounts, deal_code text, occurred_on date NOT NULL, channel text NOT NULL CHECK(length(trim(channel))>0),
 verified boolean NOT NULL DEFAULT false, raw jsonb NOT NULL DEFAULT '{}', retention_due date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,external_id)
);
CREATE TABLE spend (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, external_id text NOT NULL,
 spent_on date NOT NULL, channel text NOT NULL, campaign text NOT NULL, cost_cents bigint NOT NULL CHECK(cost_cents BETWEEN 0 AND 1000000000000),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), raw jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,external_id)
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, account_id uuid NOT NULL REFERENCES accounts,
 name text NOT NULL, owner text NOT NULL, due_on date NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL, command text NOT NULL, detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, kind text NOT NULL, row_count integer NOT NULL,
 actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['accounts','deals','touches','spend','actions','activity','import_runs'] LOOP
 EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',n);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON %I FROM public',n);
 END LOOP;
END $$;
CREATE INDEX touches_account_date ON touches(account_id,occurred_on);
CREATE VIEW eligible_touches AS
 SELECT d.id AS deal_id,d.code AS deal,d.name,d.currency,d.amount_cents,d.closed_on,
 t.id AS touch_id,t.channel,t.occurred_on,
 row_number() OVER(PARTITION BY d.id ORDER BY t.occurred_on,t.external_id,t.id) AS ordinal,
 count(*) OVER(PARTITION BY d.id) AS touch_count
 FROM deals d JOIN accounts a ON a.id=d.account_id JOIN touches t ON t.account_id=d.account_id
 WHERE d.status='won' AND (t.deal_code IS NULL OR t.deal_code=d.code)
 AND t.occurred_on BETWEEN d.closed_on-d.lookback_days AND d.closed_on
 AND t.verified AND t.retention_due>=current_date AND length(trim(a.purpose))>0 AND a.review_due>=current_date;
CREATE VIEW attribution_credit AS
 SELECT deal_id,deal,name,currency,closed_on,touch_id,channel,occurred_on,ordinal,touch_count,
 CASE WHEN ordinal=1 THEN amount_cents ELSE 0 END AS first_cents,
 CASE WHEN ordinal=touch_count THEN amount_cents ELSE 0 END AS last_cents,
 (amount_cents/touch_count + CASE WHEN ordinal<=amount_cents%touch_count THEN 1 ELSE 0 END)::bigint AS linear_cents
 FROM eligible_touches;
CREATE VIEW unattributed AS
 SELECT d.code,d.name,a.name AS account,d.currency,d.amount_cents,d.closed_on
 FROM deals d JOIN accounts a ON a.id=d.account_id
 WHERE d.status='won' AND NOT EXISTS(SELECT 1 FROM eligible_touches e WHERE e.deal_id=d.id);
CREATE VIEW attention AS
 SELECT 'overdue-action' AS reason,x.code AS record,x.name,x.owner,x.due_on AS due_on FROM actions x WHERE x.status='open' AND x.due_on<current_date
 UNION ALL SELECT 'account-review',a.code,a.name,a.owner,a.review_due FROM accounts a WHERE a.review_due IS NULL OR a.review_due<current_date
 UNION ALL SELECT 'retention-review',t.external_id,a.name,a.owner,t.retention_due FROM touches t JOIN accounts a ON a.id=t.account_id WHERE t.retention_due<current_date
 UNION ALL SELECT 'unverified-event',t.external_id,a.name,a.owner,t.occurred_on FROM touches t JOIN accounts a ON a.id=t.account_id WHERE NOT t.verified;
CREATE VIEW compliance_findings AS
 SELECT 'NZ-IPP9/AU-APP11' AS rule,'Review retained event and all copies' AS finding,t.external_id AS record,t.retention_due AS due_on FROM touches t WHERE t.retention_due<current_date
 UNION ALL SELECT 'NZ-IPP1', 'Document collection purpose',a.code,a.review_due FROM accounts a WHERE length(trim(a.purpose))=0
 UNION ALL SELECT 'NZ-IPP8','Verify event accuracy before analysis',t.external_id,t.occurred_on FROM touches t WHERE NOT t.verified
 UNION ALL SELECT 'LOCAL-REVIEW','Review account purpose and owner',a.code,a.review_due FROM accounts a WHERE length(trim(a.owner))=0 OR a.review_due IS NULL OR a.review_due<current_date;
