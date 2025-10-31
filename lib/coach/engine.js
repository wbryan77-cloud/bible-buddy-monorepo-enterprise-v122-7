
import fs from 'fs'; import path from 'path'; import { PHASE_SCRIPTS } from './scripts.js';
function loadMapping(){ try{ return JSON.parse(fs.readFileSync(path.join(process.cwd(),'data','verse_mapping.json'),'utf-8')); }catch{ return {misapplied:{},themes:[]}; } }
export function nextCoachStep(ctx){
  const scripted = PHASE_SCRIPTS[ctx.phase] || []; const q=[...scripted];
  if(ctx.metrics.scriptureAccuracy<0.9){ q.push({ topic:'Scripture Alignment', question:'Flag any misapplied verses and propose replacements.', followup:'Which theme should they move to?' }); }
  if(ctx.metrics.engagement<0.8){ q.push({ topic:'Engagement', question:'Would shorter prompts or a tone preference increase replies?', followup:'Pick a tone to try next week.' }); }
  if(!q.length){ q.push({ topic:'Readiness', question:`Phase ${ctx.phase} looks solid. Advance to ${Math.min(4,ctx.phase+1)}?`, followup:'Choose a date and audience size.' }); }
  return q;
}
export function suggestionsFromQA(qa){
  const map=loadMapping(); const suggestions=[]; const themes=map.themes||[]; const counts={};
  for(const item of qa.slice(-100)){ const txt=(item.answer||'')+' '+(item.question||''); const refs=txt.match(/[1-3]?[A-Za-z]+\s+\d+:\d+/g)||[]; refs.forEach(r=>counts[r]=(counts[r]||0)+1);
    if(/tone|gentle|direct|playful/i.test(txt)){ const tone=(txt.match(/(gentle|direct|playful)/i)||['gentle'])[0].toLowerCase(); suggestions.push({type:'set_tone', tone}); }
    for(const badRef of Object.keys(map.misapplied||{})){ if(txt.includes(badRef)) suggestions.push({type:'move_verse', ref:badRef, toTheme:map.misapplied[badRef]}); }
  }
  const themeHits=Object.fromEntries(themes.map(t=>[t,0])); for(const item of qa.slice(-100)){ const txt=(item.answer||'')+' '+(item.question||''); for(const t of themes){ if(new RegExp('\\b'+t+'\\b','i').test(txt)) themeHits[t]=(themeHits[t]||0)+1; } }
  for(const [ref,c] of Object.entries(counts)){ if(c>=2 && !map.misapplied[ref]){ const best = Object.entries(themeHits).sort((a,b)=>b[1]-a[1])[0]?.[0]||'peace'; suggestions.push({type:'move_verse', ref, toTheme:best}); } }
  const seen=new Set(); return suggestions.filter(s=>{ const k=JSON.stringify(s); if(seen.has(k)) return false; seen.add(k); return true; });
}
export function summarizeForAdmin(qa, journal, actions, eng){
  const latest=qa.slice(-10); const act=actions.slice(-10);
  const hints=act.map(a=>a.type==='move_verse'?`Moved ${a.ref} → ${a.toTheme}`:a.type==='set_tone'?`Tone → ${a.tone}`:a.type==='advance_phase'?`Advanced → ${a.to}`:a.type);
  return { highlights: latest.map(x=>({topic:x.topic, answer:x.answer||'(no answer)'})), actionsPerformed:hints, engagement:eng, suggestAdvance: act.some(a=>a.type==='advance_phase') };
}
