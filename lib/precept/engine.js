
import fs from 'fs'; import path from 'path';
const logPath = path.join(process.cwd(), 'data', 'precept_log.json');
export function checkPrecept(ref){
  const suggestions = [];
  if(/Philippians\s+4:13/i.test(ref)){ suggestions.push({ type:'context', note:'Context is contentment in Christ, not generic achievement.' }); }
  if(/Jeremiah\s+29:11/i.test(ref)){ suggestions.push({ type:'audience', note:'Addressed to exiles; apply with care to individuals today.' }); }
  if(!suggestions.length) suggestions.push({ type:'ok', note:'No concerns detected (stub).' });
  appendLog({ ref, suggestions, ts: new Date().toISOString() });
  return suggestions;
}
export function syncAll(mapping){ const out=[]; for(const ref of Object.keys(mapping?.misapplied||{})){ out.push({ref, suggestions: checkPrecept(ref)}); } return out; }
function appendLog(entry){ try{ const arr = fs.existsSync(logPath)? JSON.parse(fs.readFileSync(logPath,'utf-8')): []; arr.push(entry); fs.mkdirSync(path.dirname(logPath), {recursive:true}); fs.writeFileSync(logPath, JSON.stringify(arr,null,2)); }catch{} }
