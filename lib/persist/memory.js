
export class MemoryDB{
  constructor(){ this.qa=[]; this.actions=[]; this.journal=[]; this.eng={clicks:0,answers:0,actions:0}; this.sends=[]; this.kv=new Map(); }
  async init(){}
  async saveQA(q){ this.qa.push(q); this.eng.answers++; }
  async listQA(){ return this.qa.slice(-2000); }
  async saveAction(a){ this.actions.push(a); this.eng.actions++; }
  async listActions(){ return this.actions.slice(-2000); }
  async saveJournal(j){ this.journal.push(j); }
  async listJournal(){ return this.journal.slice(-2000); }
  async engagement(){ return this.eng; }
  async logSend(x){ this.sends.push(x); }
  async recentSends(){ return this.sends.slice(-200); }
  async kvGet(key){ return this.kv.get(key); }
  async kvSet(key, val){ this.kv.set(key, val); }
}
export async function createStore(){ const db=new MemoryDB(); await db.init(); return db; }
