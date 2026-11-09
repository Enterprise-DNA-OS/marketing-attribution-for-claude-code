#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { page, table, writeOut } from './lib/render.mjs';

export const COMMANDS = ['help','accounts','deals','journey','channel-credit','model-comparison','spend-review','unattributed','attention','compliance','actions','owner-load','import-health','activity','weekly-review','add-account','add-deal','log-touch','add-action','close-action','review-account','verify-touch','import','export','draft-review','draft-privacy'];
const READS = {
 accounts:'SELECT code,name,owner,purpose,review_due FROM accounts ORDER BY code',
 deals:'SELECT d.code,d.name,a.code AS account,d.status,d.currency,d.amount_cents,d.closed_on,d.lookback_days FROM deals d JOIN accounts a ON a.id=d.account_id ORDER BY d.code',
 unattributed:'SELECT * FROM unattributed ORDER BY code',
 attention:'SELECT * FROM attention ORDER BY reason,record',
 compliance:'SELECT * FROM compliance_findings ORDER BY rule,record',
 actions:'SELECT x.code,a.code AS account,x.name,x.owner,x.due_on,x.status FROM actions x JOIN accounts a ON a.id=x.account_id ORDER BY x.code',
 'owner-load':"SELECT owner,count(*)::int AS open_actions,count(*) FILTER(WHERE due_on<current_date)::int AS overdue FROM actions WHERE status='open' GROUP BY owner ORDER BY owner",
 'import-health':'SELECT source,kind,row_count,actor,created_at FROM import_runs ORDER BY created_at DESC,id',
 activity:'SELECT actor,command,detail,created_at FROM activity ORDER BY created_at DESC,id'
};
const MUTATIONS = new Set(['add-account','add-deal','log-touch','add-action','close-action','review-account','verify-touch','import']);
export function options(args) {
 const flags={},pos=[];
 for(const arg of args) {
  if(!arg.startsWith('--')) { pos.push(arg);continue; }
  const i=arg.indexOf('=');const key=arg.slice(2,i<0?undefined:i);
  if(Object.hasOwn(flags,key))throw Error(`Repeated flag --${key}`);
  flags[key]=i<0?true:arg.slice(i+1);
 }
 return {flags,pos};
}
function need(f,key) {if(typeof f[key]!=='string'||!f[key].trim())throw Error(`--${key}=value required`);return f[key].trim();}
function date(s) { if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error(`Invalid calendar date: ${s}`);return s; }
function eventDate(s) {if(/^\d{4}-\d{2}-\d{2}$/.test(s))return date(s);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error(`Use an ISO date or timestamp with timezone: ${s}`);date(s.slice(0,10));return new Date(s).toISOString().slice(0,10);}
function integer(s,min=0,max=1000000000000) {if(!/^\d+$/.test(String(s)))throw Error(`Invalid integer: ${s}`);const n=Number(s);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Integer outside allowed range: ${s}`);return n;}
function money(s) { if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error(`Invalid amount (maximum two decimal places): ${s}`);const [a,b='']=s.split('.');return integer(String(BigInt(a)*100n+BigInt(b.padEnd(2,'0')))); }
function currency(s) {if(!/^[A-Z]{3}$/.test(s))throw Error('Currency must be a three-letter uppercase code');return s;}
async function resolve(db,entity,ref) {
 if(!ref)throw Error(`Provide a ${entity} code, name or partial id`);
 const rows=await db.query(`SELECT * FROM ${entity} ORDER BY code`);
 const exact=rows.filter(r=>r.code.toLowerCase()===ref.toLowerCase()||r.id===ref);
 const found=exact.length?exact:rows.filter(r=>r.id.startsWith(ref)||r.name.toLowerCase().includes(ref.toLowerCase()));
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'Unknown'} ${entity}: ${ref}. Candidates: ${(found.length?found:rows).map(r=>r.code+' '+r.name).join('; ')}`);
 return found[0];
}
function period(f) { const from=date(f.from||'1900-01-01'),to=date(f.to||'9999-12-31');if(from>to)throw Error('--from must not follow --to');return [from,to]; }
async function credit(db,f) {
 const model=f.model||'linear';if(!['first','last','linear'].includes(model))throw Error('Model must be first, last or linear');
 return db.query(`SELECT channel,currency,sum(${model}_cents)::bigint AS credited_cents,count(DISTINCT deal_id)::int AS deals FROM attribution_credit WHERE closed_on BETWEEN $1 AND $2 GROUP BY channel,currency ORDER BY currency,channel`,period(f));
}
async function spendReview(db,f) {
 return db.query(`WITH c AS (SELECT channel,currency,sum(linear_cents) AS credited FROM attribution_credit WHERE closed_on BETWEEN $1 AND $2 GROUP BY channel,currency),
 s AS (SELECT channel,currency,sum(cost_cents) AS cost FROM spend WHERE spent_on BETWEEN $1 AND $2 GROUP BY channel,currency)
 SELECT coalesce(c.channel,s.channel) AS channel,coalesce(c.currency,s.currency) AS currency,coalesce(c.credited,0)::bigint AS credited_cents,
 coalesce(s.cost,0)::bigint AS spend_cents,CASE WHEN s.cost>0 THEN round(coalesce(c.credited,0)/s.cost,3) ELSE NULL END AS credit_to_spend
 FROM c FULL JOIN s USING(channel,currency) ORDER BY currency,channel`,period(f));
}
async function importRows(db,pos,f) {
 if(pos[0]!=='hockeystack')throw Error('Use import hockeystack --kind=stage|spend --file=... --source=...');
 const kind=need(f,'kind');if(!['stage','spend'].includes(kind))throw Error('Import kind must be stage or spend');
 const source=need(f,'source'),rows=parseCsv(fs.readFileSync(need(f,'file'),'utf8'));
 if(!rows.length)throw Error('The CSV contains no rows');
 const mapping=kind==='stage'?JSON.parse(fs.readFileSync(need(f,'mapping'),'utf8')):null;
 if(mapping&&(!mapping.touchpoints||!Object.keys(mapping.touchpoints).length||Object.values(mapping.touchpoints).some(v=>typeof v!=='string'||!v.trim())))throw Error('Mapping requires nonempty touchpoints with channel names');
 const due=kind==='stage'?date(need(f,'retention-due')):null;
 let inserted=0,unchanged=0;
 const seen=new Set();
 for(const row of rows) {
  const id=pick(row,'unique_id').trim();if(!id||seen.has(id))throw Error(`Missing or duplicate unique_id: ${id}`);seen.add(id);
  const when=eventDate(pick(row,'date'));
  if(kind==='stage') {
   for(const col of Object.keys(mapping.touchpoints))if(!Object.keys(row).some(k=>k.toLowerCase()===col.toLowerCase()))throw Error(`Missing mapped column: ${col}`);
   const channels=[];
   for(const [col,channel] of Object.entries(mapping.touchpoints)) {
    const v=pick(row,col).trim().toLowerCase();if(!['','true','false','1','0','yes','no'].includes(v))throw Error(`Invalid touchpoint flag in ${col}`);
    if(['true','1','yes'].includes(v))channels.push(channel);
   }
   if(channels.length!==1)throw Error(`Row ${id}: requires exactly one mapped touchpoint; found ${channels.length}. Split or map this export explicitly before import.`);
   const company=pick(row,'company_id')||pick(row,'company_domain');if(!company)throw Error(`Row ${id}: company_id or company_domain required`);
   const code='HS:'+company;
   let [account]=await db.query('SELECT * FROM accounts WHERE code=$1',[code]);
   if(!account)[account]=await db.query('INSERT INTO accounts(code,name) VALUES($1,$2) RETURNING *',[code,pick(row,'company_domain')||company]);
   const deal=pick(row,'deal_id')||null;
   const params=[source,id,account.id,deal,when,channels[0],JSON.stringify(row),due];
   const previous=await db.query('SELECT * FROM touches WHERE source=$1 AND external_id=$2',[source,id]);
   if(previous.length){const p=previous[0];if(p.account_id!==account.id||p.deal_code!==deal||p.occurred_on!==when||p.channel!==channels[0]||JSON.stringify(sort(p.raw))!==JSON.stringify(sort(row)))throw Error(`Changed existing event ${id}; reconcile explicitly, history was not overwritten`);unchanged++;}
   else {await db.query('INSERT INTO touches(source,external_id,account_id,deal_code,occurred_on,channel,raw,retention_due) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)',params);inserted++;}
  } else {
   const channel=pick(row,'network'),campaign=pick(row,'campaign_name')||pick(row,'campaign_id');if(!channel||!campaign)throw Error(`Row ${id}: network and campaign required`);
   const cents=money(pick(row,'cost')),cur=currency(pick(row,'currency'));
   const previous=await db.query('SELECT * FROM spend WHERE source=$1 AND external_id=$2',[source,id]);
   if(previous.length){const p=previous[0];if(p.spent_on!==when||p.channel!==channel||p.campaign!==campaign||Number(p.cost_cents)!==cents||p.currency!==cur||JSON.stringify(sort(p.raw))!==JSON.stringify(sort(row)))throw Error(`Changed spend ${id}; reconcile explicitly`);unchanged++;}
   else {await db.query('INSERT INTO spend(source,external_id,spent_on,channel,campaign,cost_cents,currency,raw) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[source,id,when,channel,campaign,cents,cur,JSON.stringify(row)]);inserted++;}
  }
 }
 await db.query('INSERT INTO import_runs(source,kind,row_count,actor) VALUES($1,$2,$3,$4)',[source,kind,rows.length,need(f,'actor')]);
 return {kind,source,rows:rows.length,inserted,unchanged};
}
function sort(o){return Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));}
export async function run(db,args) {
 const {flags:f,pos}=options(args);const cmd=pos.shift()||'help';
 if(!COMMANDS.includes(cmd))throw Error(`Unknown command ${cmd}. Use help.`);
 if(cmd==='help')return {commands:COMMANDS,usage:'npm run attribution -- <command> [--json] [--actor=Name] [--dry-run]',models:'first | last | linear',period:'--from=YYYY-MM-DD --to=YYYY-MM-DD on credit, model comparison and spend review',privacy:'Imported events need verify-touch and review-account before receiving credit. No tracking or messages are sent.'};
 const allowed = {
  'channel-credit':['model','from','to'], 'model-comparison':['from','to'], 'spend-review':['from','to'], 'weekly-review':['model','from','to'],
  'add-account':['code','name','owner','purpose','review-due'], 'add-deal':['code','account','name','amount-cents','currency','closed-on','status','lookback-days'],
  'log-touch':['code','source','account','deal','date','channel','retention-due'], 'add-action':['code','account','name','owner','due-on'],
  'review-account':['owner','purpose','review-due'], 'verify-touch':['source','code','evidence'],
  'import':['kind','file','source','mapping','retention-due'], 'export':['file'], 'draft-review':['model','from','to']
 };
 const mutation=MUTATIONS.has(cmd);
 const keys=new Set(['json',...(allowed[cmd]||[]),...(mutation?['actor','dry-run']:[])]);
 for(const [key,value] of Object.entries(f)) {
  if(!keys.has(key))throw Error(`Unknown flag --${key} for ${cmd}`);
  if(['json','dry-run'].includes(key)&&value!==true)throw Error(`--${key} takes no value`);
 }
 if(mutation)need(f,'actor');
 await db.exec(mutation?'BEGIN':'BEGIN READ ONLY');
 try {
  let result;
  if(READS[cmd])result=await db.query(READS[cmd]);
  else if(cmd==='journey') {const a=await resolve(db,'accounts',pos[0]);result=await db.query('SELECT t.external_id,t.occurred_on,t.channel,t.deal_code,t.verified,t.retention_due FROM touches t WHERE account_id=$1 ORDER BY occurred_on,external_id',[a.id]);}
  else if(cmd==='channel-credit')result=await credit(db,f);
  else if(cmd==='model-comparison')result=await db.query('SELECT channel,currency,sum(first_cents)::bigint AS first_cents,sum(last_cents)::bigint AS last_cents,sum(linear_cents)::bigint AS linear_cents FROM attribution_credit WHERE closed_on BETWEEN $1 AND $2 GROUP BY channel,currency ORDER BY currency,channel',period(f));
  else if(cmd==='spend-review')result=await spendReview(db,f);
  else if(cmd==='weekly-review')result={credit:await credit(db,f),unattributed:await db.query(READS.unattributed),attention:await db.query(READS.attention),spend:await spendReview(db,f)};
  else if(cmd==='add-account')result=await db.query('INSERT INTO accounts(code,name,owner,purpose,review_due) VALUES($1,$2,$3,$4,$5) RETURNING code,name',[need(f,'code'),need(f,'name'),need(f,'owner'),need(f,'purpose'),date(need(f,'review-due'))]);
  else if(cmd==='add-deal') {const a=await resolve(db,'accounts',need(f,'account'));result=await db.query('INSERT INTO deals(code,account_id,name,amount_cents,currency,closed_on,status,lookback_days) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING code,name',[need(f,'code'),a.id,need(f,'name'),integer(need(f,'amount-cents')),currency(need(f,'currency')),date(need(f,'closed-on')),need(f,'status'),integer(f['lookback-days']||180,1,730)]);}
  else if(cmd==='log-touch') {const a=await resolve(db,'accounts',need(f,'account'));const deal=f.deal?await resolve(db,'deals',f.deal):null;if(deal&&deal.account_id!==a.id)throw Error('Deal belongs to a different account');result=await db.query('INSERT INTO touches(source,external_id,account_id,deal_code,occurred_on,channel,retention_due) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING external_id,verified',[need(f,'source'),need(f,'code'),a.id,deal?.code||null,date(need(f,'date')),need(f,'channel'),date(need(f,'retention-due'))]);}
  else if(cmd==='review-account') {const a=await resolve(db,'accounts',pos[0]);result=await db.query('UPDATE accounts SET owner=$1,purpose=$2,review_due=$3 WHERE id=$4 RETURNING code,owner,review_due',[need(f,'owner'),need(f,'purpose'),date(need(f,'review-due')),a.id]);}
  else if(cmd==='verify-touch') {const evidence=need(f,'evidence');result=await db.query('UPDATE touches SET verified=true WHERE source=$1 AND external_id=$2 RETURNING external_id,verified',[need(f,'source'),need(f,'code')]);if(!result.length)throw Error('Event not found');result={records:result,evidence};}
  else if(cmd==='add-action') {const a=await resolve(db,'accounts',need(f,'account'));result=await db.query('INSERT INTO actions(code,account_id,name,owner,due_on) VALUES($1,$2,$3,$4,$5) RETURNING code,name',[need(f,'code'),a.id,need(f,'name'),need(f,'owner'),date(need(f,'due-on'))]);}
  else if(cmd==='close-action') {const a=await resolve(db,'actions',pos[0]);result=await db.query("UPDATE actions SET status='closed' WHERE id=$1 RETURNING code,status",[a.id]);}
  else if(cmd==='import')result=await importRows(db,pos,f);
  else if(cmd==='export') {
   const file=path.resolve(need(f,'file'));const data={version:1,exported_at:new Date().toISOString(),records:{}};
   for(const entity of ['accounts','deals','touches','spend','actions','activity','import_runs'])data.records[entity]=await db.query(`SELECT * FROM ${entity} ORDER BY id`);
   fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});result={file,counts:Object.fromEntries(Object.entries(data.records).map(([k,v])=>[k,v.length]))};
  } else if(cmd.startsWith('draft-')) {
   const privacy=cmd==='draft-privacy';const sections=privacy?[{title:'Privacy review findings',html:table(await db.query(READS.compliance))}]:[{title:'Linear credit by channel',note:'Allocated credit is not causal lift. Currencies remain separate.',html:table(await credit(db,f))},{title:'Won deals without eligible evidence',html:table(await db.query(READS.unattributed))},{title:'Follow-up work',html:table(await db.query(READS.attention))}];
   const file=writeOut('drafts',`${cmd}-${Date.now()}`,page({title:privacy?'Privacy evidence review':'Weekly attribution review',subtitle:'Private draft for human review',sections}));result={file};
  }
  if(mutation)await db.query('INSERT INTO activity(actor,command,detail) VALUES($1,$2,$3::jsonb)',[need(f,'actor'),cmd,JSON.stringify({result,evidence:f.evidence||null})]);
  await db.exec(mutation&&!f['dry-run']?'COMMIT':'ROLLBACK');return f['dry-run']?{dry_run:true,result}:result;
 } catch(error) {await db.exec('ROLLBACK');throw error;}
}
export function human(v) {
 if(Array.isArray(v)) {if(!v.length)return 'Nothing here.';const cols=Object.keys(v[0]);const cell=x=>x===null?'unknown':typeof x==='object'?JSON.stringify(x):String(x);return [cols.join(' | '),...v.map(r=>cols.map(c=>cell(r[c])).join(' | '))].join('\n');}
 return Object.entries(v).map(([k,x])=>`${k}:\n${Array.isArray(x)?human(x):typeof x==='object'?JSON.stringify(x,null,2):x}`).join('\n\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 let db;
 try {db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):human(result));}
 catch(e){console.error(e.message);process.exitCode=1;}
 finally{if(db)await db.close();}
}
