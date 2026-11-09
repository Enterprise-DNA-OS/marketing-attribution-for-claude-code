import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, COMMANDS } from './attribution.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/render.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'attribution-test-'));
// Never inherit a production database URL into a smoke test.
delete process.env.DATABASE_URL;process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
let admin,db,schema;let checks=0;const covered=new Set();
const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
const ok=(a)=>{assert.ok(a);checks++;};
const execute=async(args)=>{covered.add(args[0]);return run(db,args);};
const reject=async(args,regex)=>{await assert.rejects(()=>execute(args),regex);checks++;};
const cli=(args,status=0)=>{const p=spawnSync(process.execPath,args,{cwd:REPO_ROOT,encoding:'utf8',env:process.env});assert.equal(p.status,status,p.stderr||p.stdout);checks++;return p;};
try {
 if(process.env.TEST_DATABASE_URL){
  const {default:pg}=await import('pg');admin=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await admin.connect();
  schema='smoke_'+Date.now();await admin.query(`CREATE SCHEMA ${schema}`);
  const u=new URL(process.env.TEST_DATABASE_URL);u.searchParams.set('options',`-csearch_path=${schema}`);process.env.DATABASE_URL=u.toString();
 }
 db=await getDb();await migrate(db);equal((await migrate(db)).ran,[]);await seed(db);await seed(db);
 equal((await execute(['accounts'])).length,3);equal((await execute(['deals'])).length,4);
 const models=await execute(['model-comparison']);equal(models.map(r=>[r.currency,r.channel,Number(r.linear_cents)]),[['AUD','LinkedIn',800000],['NZD','LinkedIn',400000],['NZD','Organic',400001],['NZD','Referral',400000]]);
 for(const m of ['first','last','linear']) {
  const rows=await execute(['channel-credit',`--model=${m}`]);equal(rows.filter(r=>r.currency==='NZD').reduce((s,r)=>s+Number(r.credited_cents),0),1200001);
 }
 equal((await execute(['unattributed'])).map(r=>r.code),['DEAL-03']);
 const spend=await execute(['spend-review']);equal(spend.find(r=>r.channel==='Paid search').credited_cents,0);equal(spend.find(r=>r.channel==='Organic').credit_to_spend,null);
 equal((await execute(['channel-credit','--from=1900-01-01','--to=1900-12-31'])).length,0);
 await reject(['channel-credit','--model=made-up'],/Model/);await reject(['channel-credit','--from=2026-02-30'],/Invalid calendar/);await reject(['spend-review','--from=2026-02-01','--to=2026-01-01'],/must not follow/);
 equal((await execute(['journey','ac-01'])).length,4);await reject(['journey','Harbour'],/Ambiguous.*AC-01.*AC-02/);
 const [a]=await db.query("SELECT id FROM accounts WHERE code='AC-01'");equal((await execute(['journey',a.id])).length,4);
 ok((await execute(['attention'])).some(r=>r.reason==='overdue-action'));
 ok((await execute(['compliance'])).some(r=>r.rule==='NZ-IPP8'));
 equal((await execute(['actions'])).length,2);equal((await execute(['owner-load'])).find(r=>r.owner==='Tama').overdue,1);
 equal((await execute(['weekly-review'])).unattributed.length,1);equal((await execute(['help'])).commands.length,26);
 await reject(['add-account','--code=BAD'],/actor/);
 const accountArgs=['add-account','--code=NEW','--name=New Demo','--owner=Owner','--purpose=Review enquiries','--review-due=2099-01-01','--actor=Test'];
 await reject([...accountArgs,'--dryrun'],/Unknown flag/);await reject([...accountArgs,'--dry-run=false'],/takes no value/);await execute([...accountArgs,'--dry-run']);equal((await execute(['accounts'])).length,3);await execute(accountArgs); const [fresh]=await db.query("SELECT id FROM accounts WHERE code='NEW'"); equal((await execute(['journey',fresh.id.slice(0,12)])).length,0);
 await execute(['review-account','NEW','--owner=New Owner','--purpose=Reviewed business enquiries','--review-due=2099-01-01','--actor=Test']);
 await execute(['add-deal','--code=NEW-DEAL','--account=NEW','--name=New outcome','--amount-cents=101','--currency=NZD','--closed-on=2026-10-31','--status=won','--lookback-days=30','--actor=Test']);
 for(const [id,when] of [['early','2026-09-30'],['boundary','2026-10-01'],['close','2026-10-31'],['after','2026-11-01']]) {
  await execute(['log-touch',`--code=${id}`,'--source=test','--account=NEW',`--date=${when}`,'--channel=Direct','--retention-due=2099-01-01','--actor=Test']);
  await execute(['verify-touch',`--code=${id}`,'--source=test','--evidence=Checked source timestamp','--actor=Test']);
 }
 const alloc=await db.query("SELECT * FROM attribution_credit WHERE deal='NEW-DEAL' ORDER BY ordinal");equal(alloc.length,2);equal(alloc.map(r=>Number(r.linear_cents)),[51,50]);
 await execute(['review-account','NEW','--owner=Owner','--purpose=Review enquiries','--review-due=2020-01-01','--actor=Test']);equal((await db.query("SELECT * FROM attribution_credit WHERE deal='NEW-DEAL'")).length,0);
 await execute(['add-action','--code=NEW-ACT','--account=NEW','--name=Check export','--owner=Owner','--due-on=2026-10-01','--actor=Test']);await execute(['close-action','NEW-ACT','--actor=Test']);equal((await execute(['actions'])).find(r=>r.code==='NEW-ACT').status,'closed');
 const stage=['import','hockeystack','--kind=stage','--file=fixtures/hockeystack-stage.csv','--mapping=fixtures/touchpoints.json','--source=fixture','--retention-due=2099-01-01','--actor=Test'];
 equal((await execute([...stage,'--dry-run'])).result.inserted,2);equal((await execute(['import-health'])).length,0);
 equal((await execute(stage)).inserted,2);equal((await execute(stage)).unchanged,2);
 equal((await db.query("SELECT verified FROM touches WHERE source='fixture'")).map(r=>r.verified),[false,false]);
 const spendArgs=['import','hockeystack','--kind=spend','--file=fixtures/hockeystack-spend.csv','--source=fixture','--actor=Test'];equal((await execute(spendArgs)).inserted,1);equal((await execute(spendArgs)).unchanged,1);
 equal(Number((await db.query("SELECT cost_cents FROM spend WHERE source='fixture'"))[0].cost_cents),25025);
 const badfile=path.join(temp,'bad.csv');let content=fs.readFileSync('fixtures/hockeystack-stage.csv','utf8');
 const malformed=(s)=>{fs.writeFileSync(badfile,s);return stage.map(a=>a.startsWith('--file=')?`--file=${badfile}`:a);};
 await reject(malformed(content.replace('hs-event-1','new-event').replace('2026-10-08,hs-event-2','bad-date,broken-event')),/ISO date/);
 equal((await db.query("SELECT * FROM touches WHERE external_id='new-event'")).length,0);
 await reject(malformed(content.replace('2026-10-01,hs-event-1','2026-10-02,hs-event-1')),/Changed existing/);
 await reject(malformed(content.replace('hs-event-2','hs-event-1')),/duplicate/);
 await reject(malformed(content.replace('true,false','true,true')),/exactly one/);
 await reject(malformed(content.replace('true,false','maybe,false')),/Invalid touchpoint/);
 await reject(malformed(content.replace('Web visit','Unknown visit')),/Missing mapped/);
 await reject(malformed(content.replace('2026-10-01,','2026-02-30,')),/calendar/);
 fs.writeFileSync(badfile,fs.readFileSync('fixtures/hockeystack-spend.csv','utf8').replace('250.25','250.251'));
 await reject(spendArgs.map(a=>a.startsWith('--file=')?`--file=${badfile}`:a),/Invalid amount/);
 await reject(['add-deal','--code=NEG','--account=NEW','--name=Bad','--amount-cents=-1','--currency=NZD','--closed-on=2026-10-31','--status=won','--actor=Test'],/Invalid integer/);
 await reject(['verify-touch','--source=none','--code=none','--evidence=Check','--actor=Test'],/not found/);
 equal(parseCsv('\ufeffa,b\r\n"one\ntwo","say ""yes"""\r\n'),[{a:'one\ntwo',b:'say "yes"'}]);
 for(const csv of ['a,a\n1,2','a,b\n1','a,b\n"unclosed,2','a,b\n"x"oops,2']){assert.throws(()=>parseCsv(csv));checks++;}
 ok((await execute(['activity'])).length>10);
 const exported=await execute(['export',`--file=${path.join(temp,'export.json')}`]);equal(exported.counts.accounts,5);ok(JSON.parse(fs.readFileSync(exported.file)).records.touches.some(r=>r.raw.email==='demo@example.invalid'));
 await reject(['export',`--file=${exported.file}`],/EEXIST/);
 for(const command of ['draft-review','draft-privacy']) {const result=await execute([command]);ok(fs.readFileSync(result.file,'utf8').includes('<!doctype html>'));}
 ok(table([{name:'<script>alert(1)</script>'}]).includes('&lt;script&gt;'));
 equal([...covered].sort(),[...COMMANDS].sort());
 // Close embedded store before invoking real CLI subprocesses on the same directory.
 await db.close();db=null;
 equal(JSON.parse(cli(['scripts/attribution.mjs','accounts','--json']).stdout).length,5);
 ok(cli(['scripts/attribution.mjs','journey','Harbour','--json'],1).stderr.includes('Ambiguous'));
 ok(cli(['scripts/attribution.mjs','bad-command'],1).stderr.includes('Unknown command'));
 cli(['scripts/view.mjs']);cli(['scripts/docs.mjs']);
 ok(fs.readFileSync(path.join(temp,'views','week.html'),'utf8').includes('Weekly attribution'));
 ok(fs.readdirSync(path.join(temp,'docs-out','deal-credit')).length>=3);
 console.log(`PASS: ${checks} assertions; ${covered.size} CLI commands; isolated ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'} database; import, arithmetic, privacy, documents and CLI checks.`);
} finally {
 if(db)await db.close();if(admin){await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
 fs.rmSync(temp,{recursive:true,force:true});
}
