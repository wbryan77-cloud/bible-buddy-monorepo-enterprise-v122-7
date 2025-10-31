
import { PrismaClient } from '@prisma/client';
export class PrismaDB{
  constructor(){ this.prisma = new PrismaClient(); }
  async init(){ await this.prisma.$connect(); }
  async saveQA({topic,question,answer,ts}){ await this.prisma.coachQA.create({data:{topic,question,answer,ts}}); }
  async listQA(){ return this.prisma.coachQA.findMany({ orderBy:{ ts:'desc' }, take:2000 }); }
  async saveAction({type,ref,tone,toTheme,to,ts}){ await this.prisma.coachAction.create({data:{type,ref,tone,toTheme,toPhase:to,ts}}); }
  async listActions(){ return this.prisma.coachAction.findMany({ orderBy:{ ts:'desc' }, take:2000 }); }
  async saveJournal({note,ts}){ await this.prisma.coachJournal.create({data:{note,ts}}); }
  async listJournal(){ return this.prisma.coachJournal.findMany({ orderBy:{ ts:'desc' }, take:2000 }); }
  async engagement(){ const [qa,ac]= await Promise.all([this.prisma.coachQA.count(), this.prisma.coachAction.count()]); return { clicks:0, answers:qa, actions:ac }; }
  async logSend({channel,to,subject,status,detail}){ await this.prisma.sendLog.create({data:{channel,toAddr:to,subject,status,detail}}); }
  async recentSends(){ return this.prisma.sendLog.findMany({ orderBy:{ ts:'desc' }, take:200 }); }
  async kvGet(key){ const row = await this.prisma.verseMapping.findUnique({ where:{ key } }); return row? JSON.parse(row.valueJson): null; }
  async kvSet(key, val){ const valueJson = JSON.stringify(val); await this.prisma.verseMapping.upsert({ where:{ key }, update:{ valueJson }, create:{ key, valueJson } }); }
}
export async function createStore(){ const db=new PrismaDB(); await db.init(); return db; }
