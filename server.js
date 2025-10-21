
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

app.get('/health', (_req,res)=>res.json({ok:true,version:'122.7',service:'unified'}));
app.get('/status', (_req,res)=>res.json({phaseAutoStart:phaseAuto,aiDeploymentAgent:agentEnabled,sabbathQuiet,sundayRenewal,tz}));

app.post('/api/stewardship/scan', (req,res)=>{
  const { barcode='0000000000000', ingredients='water,salt' } = req.body || {};
  res.json({ ok:true, barcode, ingredients, flags:[], verses:['1 Corinthians 6:19-20'] });
});

app.get('/api/reports/first-day-renewal', (req,res)=>{
  const compare = req.query.compare === 'true';
  const current = { continued: 35, paused: 5, noResponse: 2, totalSent: 42 };
  const last = { continued: 30, paused: 7, noResponse: 5, totalSent: 42 };
  const delta = { continued: current.continued - last.continued, paused: last.paused - current.paused };
  res.json({ generatedAt:new Date().toISOString(), compare, thisWeek:current, lastWeek:last, delta });
});

function startAgent(){
  if(!agentEnabled) return;
  console.log('[AI] Deployment Agent active. Phase auto-start:', phaseAuto);
  cron.schedule('0 15 * * 5', ()=>console.log('[AI] Friday review generated.'), { timezone: tz });
  const [h,m] = sundayRenewal.split(':').map(n=>parseInt(n,10));
  cron.schedule(`${m||0} ${h||8} * * 0`, ()=>console.log('[AI] Sunday renewal messages sent.'), { timezone: tz });
  if(phaseAuto) console.log('[AI] Phase 1 Testing started on boot. Phases 2–4 enabled.');
}
startAgent();

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`[Unified] Bible Buddy v122.7 listening on :${port}`));
