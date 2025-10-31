
import { Queue, Worker, QueueScheduler } from 'bullmq';
export function createQueue(name, handler, opts={}){
  const url = process.env.REDIS_URL;
  if(!url){
    const items = []; let running=false;
    async function run(){ if(running) return; running=true; while(items.length){ const job = items.shift(); try{ await handler({ data: job }); }catch(e){} } running=false; }
    return { async add(_n, data){ items.push(data); run(); }, async status(){ return { mode:'memory', size: items.length }; } };
  }
  const connection = { url };
  const scheduler = new QueueScheduler(name, { connection });
  const q = new Queue(name, { connection });
  const w = new Worker(name, async job => handler(job), { connection });
  return { async add(_n, data){ await q.add(name, data, { attempts: parseInt(process.env.QUEUE_MAX_RETRIES||'5',10) }); }, async status(){ const counts = await q.getJobCounts(); return { mode:'redis', counts }; } };
}
