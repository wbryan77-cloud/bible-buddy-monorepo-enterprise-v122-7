// server.js — CommonJS compatible setup for Render
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { parse } = require('csv-parse/sync');

const { nextCoachStep, summarizeForAdmin, suggestionsFromQA } = require('./lib/coach/engine.js');
const { createStore } = require('./lib/persist/memory.js');
const { createPrisma } = require('./lib/persist/prisma.js');
const { createQueue } = require('./lib/queue/queue.js');
const { sendSmsTwilio } = require('./lib/providers/sms/twilio.js');
const { checkPrecept, syncAll } = require('./lib/precept/engine.js');

dotenv.config();

const app = express();
app.use(express.json({limit:'5mb'}));
app.use(cookieParser());

const USE_PRISMA = (process.env.PERSISTENCE||'MEMORY').toUpperCase()==='POSTGRES' && process.env.POSTGRES_PRISMA==='enabled';
const store = await (USE_PRISMA? createPrisma(): createMem());

// Queue
const sendQueue = createQueue('sendQueue', async (job)=>{
  const d=job.data||job;
  if(d.type==='email'){
    const r = await sendEmailResend({to:d.to, subject:d.subject, html:d.html});
    await store.logSend({channel:'email', to:d.to, subject:d.subject, status:r.ok?'ok':'fail', detail:r.stub?'stub':'sent'});
  }else if(d.type==='sms'){
    const r = await sendSmsTwilio({to:d.to, body:d.body});
    await store.logSend({channel:'sms', to:d.to, subject:'', status:r.ok?'ok':'fail', detail:r.stub?'stub':'sent'});
  }else if(d.type==='precept'){
    const out = checkPrecept(d.ref);
    await store.logSend({channel:'precept', to:d.ref, subject:'', status:'ok', detail:JSON.stringify(out)});
  }
});

let phase = 1;
let metrics = { engagement: 0.76, scriptureAccuracy: 0.91, feedbackPositivity: 0.86 };

// Static
app.use('/', express.static(path.join(__dirname,'public')));
app.use('/admin', express.static(path.join(__dirname,'admin')));

// Health
app.get('/health', async (_req,res)=>res.json({ ok:true, version:'122.10.11', mode: USE_PRISMA?'POSTGRES':'MEMORY', queue: await sendQueue.status() }));

// Coach
app.get('/api/coach/next', (_req,res)=>{ res.json(nextCoachStep({ phase, metrics, unanswered:0, lastTopic:null })); });
app.post('/api/coach/answer', async (req,res)=>{ const { topic, question, answer } = req.body||{}; await store.saveQA({ topic, question, answer, ts:new Date() }); if(/(gentle|direct|playful)/i.test(answer||'')) metrics.engagement=Math.min(1,metrics.engagement+0.01); if(/misapplied|replace|verse/i.test(answer||'')) metrics.scriptureAccuracy=Math.min(1,metrics.scriptureAccuracy+0.01); res.json({ok:true}); });
app.get('/api/coach/suggestions', async (_req,res)=>{ res.json(suggestionsFromQA(await store.listQA())); });
app.get('/api/coach/summary', async (_req,res)=>{ res.json(summarizeForAdmin(await store.listQA(), await store.listJournal(), await store.listActions(), await store.engagement())); });

// Actions
app.post('/api/actions/apply', async (req,res)=>{
  const act=req.body||{};
  if (act.type==='move_verse'){ await store.saveAction({type:'move_verse', ref:act.ref||'John 3:16', toTheme:act.toTheme||'peace', ts:new Date()}); metrics.scriptureAccuracy=Math.min(1,metrics.scriptureAccuracy+0.01); }
  else if (act.type==='set_tone'){ await store.saveAction({type:'set_tone', tone:act.tone||'gentle', ts:new Date()}); metrics.engagement=Math.min(1, metrics.engagement+0.02); }
  else if (act.type==='advance_phase'){ if(phase<4){ phase+=1; await store.saveAction({type:'advance_phase', to:phase, ts:new Date()}); } }
  else return res.status(400).json({ok:false, error:'Unknown action'});
  res.json({ok:true});
});
app.post('/api/actions/advance-phase', async (_req,res)=>{ if(phase<4){ phase+=1; await store.saveAction({type:'advance_phase', to:phase, ts:new Date()}); } res.json({ok:true, phase}); });

// CSV exports
function toCSV(rows){
  if(!rows.length) return 'no,data\n';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const header=keys.join(',');
  const esc=v=>(''+(v??'')).replace(/"/g,'""');
  const lines = rows.map(r=>keys.map(k=>`"${esc(r[k])}"`).join(','));
  return [header, ...lines].join('\n');
}
app.get('/api/export/qa.csv', async (_req,res)=>{
  const rows = await store.listQA();
  const csv = toCSV(rows);
  res.set('Content-Type','text/csv'); res.set('Content-Disposition','attachment; filename="coach_qa.csv"'); res.send(csv);
});
app.get('/api/export/actions.csv', async (_req,res)=>{
  const rows = await store.listActions();
  const csv = toCSV(rows);
  res.set('Content-Type','text/csv'); res.set('Content-Disposition','attachment; filename="coach_actions.csv"'); res.send(csv);
});

// Mapping
const mapPath = path.join(__dirname,'data','verse_mapping.json');
function readMap(){ try{ return JSON.parse(fs.readFileSync(mapPath,'utf-8')); } catch(e){ return {misapplied:{},themes:[]}; } }
function writeMap(obj){ fs.mkdirSync(path.dirname(mapPath), {recursive:true}); fs.writeFileSync(mapPath, JSON.stringify(obj,null,2)); }
app.get('/api/mapping', (_req,res)=>res.json(readMap()));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2*1024*1024 } });

app.post('/api/mapping/upload', upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).send('No file uploaded.');
  const name = req.file.originalname.toLowerCase();
  let mapping = { misapplied:{}, themes:[] };
  try{
    if(name.endsWith('.json')){
      mapping = JSON.parse(req.file.buffer.toString('utf-8'));
    }else if(name.endsWith('.csv')){
      const rows = parse(req.file.buffer.toString('utf-8'), { columns:true, skip_empty_lines:true });
      for(const r of rows){ const ref=(r.ref||r.reference||'').trim(); const toTheme=(r.toTheme||r.theme||'').trim(); if(ref && toTheme){ mapping.misapplied[ref]=toTheme; } }
      mapping.themes = mapping.themes?.length?mapping.themes:['peace','gratitude','discipline','hope','faith'];
    }else return res.status(400).send('Unsupported file type.');
  }catch(e){ return res.status(400).send('Parse error: '+e.message); }
  writeMap(mapping); res.json({ ok:true, counts:{ misapplied:Object.keys(mapping.misapplied||{}).length, themes:(mapping.themes||[]).length } });
});

app.get('/api/mapping/export.csv', (_req,res)=>{
  const m=readMap(); const rows=Object.entries(m.misapplied||{}).map(([ref,toTheme])=>({ref,toTheme}));
  const csv = (rows.length? 'ref,toTheme\n'+rows.map(r=>`${r.ref},${r.toTheme}`).join('\n') : 'ref,toTheme\n');
  res.set('Content-Type','text/csv'); res.set('Content-Disposition','attachment; filename="verse_mapping.csv"'); res.send(csv);
});

app.post('/api/mapping/write-csv', (_req,res)=>{
  const m=readMap(); const rows=Object.entries(m.misapplied||{}).map(([ref,toTheme])=>({ref,toTheme}));
  const csv = (rows.length? 'ref,toTheme\n'+rows.map(r=>`${r.ref},${r.toTheme}`).join('\n') : 'ref,toTheme\n');
  const csvPath = path.join(__dirname,'data','verse_mapping.csv');
  fs.mkdirSync(path.dirname(csvPath), {recursive:true});
  fs.writeFileSync(csvPath, csv);
  res.json({ ok:true, path:'/data/verse_mapping.csv', count: rows.length });
});

app.post('/api/mapping/preview-diff', (req,res)=>{
  const sugg=req.body||[]; const before=readMap(); const add=[];
  for(const s of sugg){ if(s.type==='move_verse' && s.ref){ const to=s.toTheme||before.misapplied[s.ref]; if(before.misapplied[s.ref]!==to) add.push({ref:s.ref, from: before.misapplied[s.ref]||'(none)', to}); } }
  res.json({ add });
});

app.post('/api/mapping/apply', (req,res)=>{
  const sugg=req.body; if(!Array.isArray(sugg)) return res.status(400).send('Expect array.';
  const before=readMap(); const after=JSON.parse(JSON.stringify(before)); let applied=0;
  for(const s of sugg){ if(s.type==='move_verse' && s.ref && s.toTheme){ after.misapplied[s.ref]=s.toTheme; applied++; } }
  writeMap(after);
  res.json({ ok:true, applied, beforeCount:Object.keys(before.misapplied||{}).length, afterCount:Object.keys(after.misapplied||{}).length });
});

// Providers status + tests
app.get('/api/providers/status', async (_req,res)=>{
  const st = {
    email: { provider: process.env.EMAIL_PROVIDER||'resend', ready: !!process.env.RESEND_API_KEY },
    sms:   { provider: process.env.SMS_PROVIDER||'twilio', ready: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) },
    queue: await sendQueue.status(),
    recentSends: await store.recentSends()
  };
  res.json(st);
});
app.post('/api/providers/test-email', async (_req,res)=>{
  await sendQueue.add('email', { type:'email', to:'you@example.com', subject:'Bible Buddy Test', html:'<h3>It works</h3>' });
  res.json({ ok:true });
});
app.post('/api/providers/test-sms', async (_req,res)=>{
  await sendQueue.add('sms', { type:'sms', to:'+15555555555', body:'Bible Buddy test SMS' });
  res.json({ ok:true });
});

// Precept advisor endpoints
app.get('/api/precept/check', async (req,res)=>{
  const ref = req.query.ref||'John 3:16';
  const out = checkPrecept(ref);
  res.json({ ref, suggestions: out });
});
app.post('/api/precept/sync-all', async (_req,res)=>{
  const mapping = readMap();
  const result = preceptSyncAll(mapping);
  for(const r of result){ await sendQueue.add('precept', { type:'precept', ref:r.ref }); }
  res.json({ ok:true, queued: result.length });
});

// Insights + Persistence
app.get('/api/insights', async (_req,res)=>{
  const qa = await store.listQA(); const actions = await store.listActions();
  const byTopic = {}; for(const q of qa){ byTopic[q.topic]= (byTopic[q.topic]||0)+1; }
  const actionTypes = {}; for(const a of actions){ actionTypes[a.type]= (actionTypes[a.type]||0)+1; }
  res.json({ questionsByTopic: byTopic, actionsByType: actionTypes });
});
app.get('/api/persistence', async (_req,res)=>{
  res.json({ mode: USE_PRISMA?'POSTGRES':'MEMORY', connected: USE_PRISMA });
});
app.get('/api/admin/export-db', async (_req,res)=>{
  const qa = await store.listQA(); const actions=await store.listActions(); const sends=await store.recentSends();
  const payload = { exportedAt: new Date().toISOString(), qa, actions, sends };
  res.set('Content-Type','application/json'); res.set('Content-Disposition','attachment; filename="snapshot.json"'); res.send(JSON.stringify(payload,null,2));
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Bible Buddy v122.10.11 on :' + port));
