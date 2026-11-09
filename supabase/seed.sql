INSERT INTO accounts(id,code,name,owner,purpose,review_due) VALUES
 ('10000000-0000-4000-8000-000000000001','AC-01','Harbour Demo Software','Aroha','Review authorised business enquiries',current_date+90),
 ('10000000-0000-4000-8000-000000000002','AC-02','Harbour Demo Logistics','Tama','Review authorised business enquiries',current_date+90),
 ('10000000-0000-4000-8000-000000000003','AC-03','Alpine Demo Services','','',current_date-8)
 ON CONFLICT DO NOTHING;
INSERT INTO deals(code,account_id,name,amount_cents,currency,closed_on,status) VALUES
 ('DEAL-01','10000000-0000-4000-8000-000000000001','Annual analytics renewal',1200001,'NZD',current_date-2,'won'),
 ('DEAL-02','10000000-0000-4000-8000-000000000002','Reporting programme',800000,'AUD',current_date-1,'won'),
 ('DEAL-03','10000000-0000-4000-8000-000000000003','Operations review',500000,'NZD',current_date-1,'won'),
 ('DEAL-04','10000000-0000-4000-8000-000000000001','Next project',2000000,'NZD',current_date+20,'open')
 ON CONFLICT DO NOTHING;
INSERT INTO touches(source,external_id,account_id,occurred_on,channel,verified,retention_due) VALUES
 ('demo','T-01','10000000-0000-4000-8000-000000000001',current_date-30,'Organic',true,current_date+90),
 ('demo','T-02','10000000-0000-4000-8000-000000000001',current_date-12,'LinkedIn',true,current_date+90),
 ('demo','T-03','10000000-0000-4000-8000-000000000001',current_date-3,'Referral',true,current_date+90),
 ('demo','T-04','10000000-0000-4000-8000-000000000002',current_date-10,'LinkedIn',true,current_date+90),
 ('demo','T-05','10000000-0000-4000-8000-000000000003',current_date-10,'Organic',false,current_date-1),
 ('demo','T-06','10000000-0000-4000-8000-000000000001',current_date,'Paid search',true,current_date+90)
 ON CONFLICT DO NOTHING;
INSERT INTO spend(source,external_id,spent_on,channel,campaign,cost_cents,currency) VALUES
 ('demo','S-01',current_date-15,'LinkedIn','Demo awareness NZ',250000,'NZD'),
 ('demo','S-02',current_date-15,'LinkedIn','Demo awareness AU',180000,'AUD'),
 ('demo','S-03',current_date-15,'Paid search','Demo search',90000,'NZD') ON CONFLICT DO NOTHING;
INSERT INTO actions(code,account_id,name,owner,due_on) VALUES
 ('ACT-01','10000000-0000-4000-8000-000000000003','Check purpose and event evidence','Tama',current_date-3),
 ('ACT-02','10000000-0000-4000-8000-000000000001','Reconcile the campaign export','Aroha',current_date+2) ON CONFLICT DO NOTHING;
