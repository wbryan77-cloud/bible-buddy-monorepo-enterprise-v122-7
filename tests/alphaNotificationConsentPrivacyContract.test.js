/**
 * Notification Rev2 focused synthetic privacy contract.
 * No provider credentials, live sends, youth/private data, network or deployment.
 * Run: node --test tests/alphaNotificationConsentPrivacyContract.test.js
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TESTERS = path.join(ROOT, 'data', 'alpha-testers.json');
const PREFS = path.join(ROOT, 'data', 'alpha-notification-preferences.json');
const HISTORY = path.join(ROOT, 'data', 'alpha-notification-history.jsonl');
const backup = new Map();
function preserve(file) { backup.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null); }
function restore(file) { const v=backup.get(file); if(v==null){if(fs.existsSync(file))fs.unlinkSync(file);}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,v);} }
function seed() {
  fs.mkdirSync(path.dirname(TESTERS), { recursive: true });
  fs.writeFileSync(TESTERS, JSON.stringify({ testers: [
    { testerId:'alpha-a',active:true,consentAccepted:true,ndaAccepted:true,emailOrPhone:'a@example.test',notificationPreference:'once_daily',notificationChannels:['in_app'],notificationConsentAt:'2026-11-04T00:00:00.000Z',notificationsPaused:false,categoryPreferences:{bible_reminders:true} },
    { testerId:'alpha-b',active:true,consentAccepted:true,ndaAccepted:true,emailOrPhone:'b@example.test',notificationPreference:'off',notificationChannels:[],notificationConsentAt:null,notificationsPaused:true }
  ], invites: [] }, null, 2));
  fs.writeFileSync(PREFS, JSON.stringify({ globalPaused:false }));
  fs.writeFileSync(HISTORY, JSON.stringify({testerId:'alpha-a',attempted:true,queued:true,sent:false,delivered:false,category:'bible_reminders'})+'\n'+JSON.stringify({testerId:'alpha-b',attempted:true,queued:true,sent:false,delivered:false,category:'security_alerts'})+'\n');
  delete require.cache[require.resolve('../services/alphaTesterManager')];
  delete require.cache[require.resolve('../services/alphaNotificationScheduler')];
}
describe('Notification Rev2 T01-T17', () => {
  beforeEach(()=>{[TESTERS,PREFS,HISTORY].forEach(preserve);seed();delete process.env.RESEND_API_KEY;delete process.env.TWILIO_ACCOUNT_SID;delete process.env.TWILIO_AUTH_TOKEN;});
  afterEach(()=>{[TESTERS,PREFS,HISTORY].forEach(restore);backup.clear();delete require.cache[require.resolve('../services/alphaTesterManager')];delete require.cache[require.resolve('../services/alphaNotificationScheduler')];});
  it('T01 missing cadence rejects',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.subscribe('alpha-a',undefined,['in_app']).ok,false);});
  it('T02 invalid cadence rejects',()=>{const m=require('../services/alphaTesterManager');assert.equal(m.updateNotificationPreference('alpha-a','invalid',false,['in_app']).ok,false);});
  it('T03 off suppresses queue',()=>{const n=require('../services/alphaNotificationScheduler');n.unsubscribe('alpha-a');assert.equal(n.buildNotificationQueue({slot:'morning'}).length,0);});
  it('T04 channel required',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.subscribe('alpha-a','once_daily',[]).ok,false);});
  it('T05 explicit in_app queues once',()=>{const n=require('../services/alphaNotificationScheduler');n.subscribe('alpha-a','once_daily',['in_app']);assert.equal(n.buildNotificationQueue({slot:'morning'})[0].channel,'in_app');});
  it('T06 pause suppresses queue',()=>{const m=require('../services/alphaTesterManager');m.updateNotificationPreference('alpha-a','once_daily',true,['in_app']);assert.equal(require('../services/alphaNotificationScheduler').buildNotificationQueue({slot:'morning'}).length,0);});
  it('T07 support target required',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.buildCategoryNotificationQueue({category:'support_replies',supportThreadId:'t'}).ok,false);});
  it('T08 support thread required',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.buildCategoryNotificationQueue({category:'support_replies',onlyTesterId:'alpha-a'}).ok,false);});
  it('T09 support isolates tester',()=>{const n=require('../services/alphaNotificationScheduler');const r=n.buildCategoryNotificationQueue({category:'support_replies',onlyTesterId:'alpha-a',supportThreadId:'t'});assert.equal(r.queue[0].testerId,'alpha-a');});
  it('T10 invalid security purpose rejects',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.buildCategoryNotificationQueue({category:'security_alerts',onlyTesterId:'alpha-a',securityEventId:'s',purposeCode:'promotion'}).ok,false);});
  it('T11 security isolates tester',()=>{const n=require('../services/alphaNotificationScheduler');const r=n.buildCategoryNotificationQueue({category:'security_alerts',onlyTesterId:'alpha-a',securityEventId:'s',purposeCode:'privacy_incident_notice'});assert.equal(r.queue.length,1);assert.equal(r.queue[0].channel,'in_app');});
  it('T12 in_app truth',async()=>{const r=await require('../services/alphaNotificationScheduler').dispatchNotification({testerId:'alpha-a',channel:'in_app',body:'x'});assert.deepEqual([r.queued,r.sent,r.delivered],[true,false,false]);});
  it('T13 missing provider truth',async()=>{const r=await require('../services/alphaNotificationScheduler').dispatchNotification({testerId:'alpha-a',channel:'email',email:'a@example.test',body:'x'});assert.deepEqual([r.queued,r.sent,r.delivered],[false,false,false]);});
  it('T14 unknown channel fails',async()=>{const r=await require('../services/alphaNotificationScheduler').dispatchNotification({testerId:'alpha-a',channel:'queue_only',body:'x'});assert.deepEqual([r.queued,r.sent,r.delivered],[false,false,false]);});
  it('T15 report separates states',()=>{const r=require('../services/alphaNotificationScheduler').getCategoryDeliveryReport();assert.deepEqual(r.byCategory.bible_reminders,{attempted:1,queued:1,sent:0,delivered:0});});
  it('T16 preference lifecycle isolates tester',()=>{const m=require('../services/alphaTesterManager');assert.equal(m.exportTesterNotificationPreferences('alpha-b','alpha-a').ok,false);assert.equal(m.deleteTesterNotificationPreferences('alpha-a','alpha-a').ok,true);assert.equal(m.getTester('alpha-b').testerId,'alpha-b');});
  it('T17 history lifecycle isolates tester',()=>{const n=require('../services/alphaNotificationScheduler');assert.equal(n.exportNotificationHistoryForTester('alpha-b','alpha-a').ok,false);assert.equal(n.deleteNotificationHistoryForTester('alpha-a','alpha-a').deleted,1);assert.equal(n.exportNotificationHistoryForTester('alpha-b','alpha-b').history.length,1);});
});
