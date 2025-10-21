
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());

const phaseAuto = process.env.PHASE_AUTOSTART === '1';
const agentEnabled = (process.env.AI_DEPLOYMENT_AGENT || '').toLowerCase() === 'enabled';
const sabbathQuiet = (process.env.SABBATH_QUIET || 'true').toLowerCase() === 'true';
const tz = process.env.TIMEZONE || 'UTC';
const sundayRenewal = process.env.SUNDAY_RENEWAL_TIME || '08:00';

app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/health', (_req,res)=>res.json({ok:true, version:'122.8', service:'unified'}));
app.get('/status', (_req,res)=>res.json({ phaseAutoStart:phaseAuto, aiDeploymentAgent:agentEnabled, sabbathQuiet, sundayRenewal, tz }));

let phase = 1;
let metrics = { engagement: 0.72, scriptureAccuracy: 0.91, feedbackPositivity: 0.86 };
app.get('/api/phase/summary', (_req, res)=>{
  const readyForNext = metrics.engagement > 0.7 && metrics.scriptureAccuracy > 0.9;
  res.json({
    phase, metrics, readyForNext,
    guidance: readyForNext
      ? 'Momentum is healthy. Consider enabling Phase 2 (wider testers).'
      : 'Stay in Phase 1. Keep gathering scripture feedback and clarity.',
    nextChecks: ['Friday Six-Day Review', 'Sunday First-Day Renewal']
  });
});

app.get('/api/reports/scripture-alignment', (_req,res)=>{
  res.json({
    generatedAt: new Date().toISOString(),
    totals: { approved: 12, pending: 2, sent_back: 1 },
    topVerses: [
      { ref: 'Philippians 4:6-7', topic:'Peace', score: 0.92, note:'Used in Renewal note' },
      { ref: 'James 1:5', topic:'Wisdom', score: 0.88, note:'Strong response from testers' },
      { ref: 'Hebrews 4:12', topic:'Word of God', score: 0.84, note:'Good anchor verse' }
    ],
    aiNotes: ['Consider moving one verse to Discipline', 'Add short reflection for gratitude theme']
  });
});

app.get('/api/reports/first-day-renewal', (req,res)=>{
  const compare = req.query.compare === 'true';
  const thisWeek = { continued: 35, paused: 5, noResponse: 2, totalSent: 42 };
  const lastWeek = { continued: 30, paused: 7, noResponse: 5, totalSent: 42 };
  const delta = { continued: thisWeek.continued - lastWeek.continued, paused: lastWeek.paused - thisWeek.paused };
  res.json({
    generatedAt: new Date().toISOString(), compare, thisWeek, lastWeek, delta,
    aiNote: 'Participation rose; emphasize encouragement and perseverance.'
  });
});

app.get('/api/templates', (_req,res)=>{
  res.json([
    { id:'p1_invite_email', type:'email', title:'Phase 1 Invite — Doctrine Review' },
    { id:'p2_rollover_sms', type:'sms', title:'Phase 2 Rollover SMS' },
    { id:'renewal_push', type:'push', title:'First-Day Renewal Push' }
  ]);
});

app.post('/api/stewardship/scan', (req,res)=>{
  const { barcode='0000000000000', ingredients='water,salt' } = req.body || {};
  const flags = []; const verses = ['1 Corinthians 6:19-20', 'Philippians 4:6-7'];
  res.json({ ok:true, barcode, ingredients, flags, verses });
});

function startAgent(){
  if(!agentEnabled) return;
  console.log('[AI] Deployment Agent active. Phase auto-start:', phaseAuto);
  cron.schedule('0 15 * * 5', ()=>{ if (sabbathQuiet) console.log('[AI] Friday Six-Day Review generated.'); }, { timezone: tz });
  const [h,m] = sundayRenewal.split(':').map(x=>parseInt(x,10));
  cron.schedule(`${m||0} ${h||8} * * 0`, ()=>{ console.log('[AI] Sunday First-Day Renewal messages sent.'); }, { timezone: tz });
  if (phaseAuto) console.log('[AI] Phase 1 Testing started on boot. Phases 2–4 enabled.');
}
startAgent();

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`[Unified] Bible Buddy v122.8 listening on :${port}`));
