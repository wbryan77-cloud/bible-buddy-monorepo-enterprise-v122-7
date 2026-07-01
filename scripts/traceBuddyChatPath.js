#!/usr/bin/env node
/**
 * Emergency regression trace — runs fixed messages through runBuddy() and prints routing metadata.
 *
 * Usage:
 *   node scripts/traceBuddyChatPath.js
 *   BUDDY_RUNTIME=legacy node scripts/traceBuddyChatPath.js
 *   TRACE_USER_PREFIX=regression-trace node scripts/traceBuddyChatPath.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { classifyHealthCompanion } = require('../services/healthCompanionResponse');
const { classifyEmotionalSupport } = require('../services/griefCompanionResponse');
const { classifyRelationshipRecallQuery } = require('../services/relationshipRecallEngine');
const { detectHealthConcern } = require('../services/relationshipMemoryBridge');
const { buildReasoningSnapshot } = require('../services/reasoningSnapshot');
const { resolveRouteKey } = require('../services/routeOwnershipTable');
let openai = null;
try {
  openai = require('../services/openaiClient');
} catch (_) {}

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'regression-trace', 'trace-results.json');

const MESSAGES = [
  {
    id: 'relationship_loss',
    text: 'Today has been a tough day. I let go of someone that I truly love, but she hasn’t been right for years…',
  },
  {
    id: 'correction_flaring',
    text: 'What’s flaring up again and you didn’t address what I just mentioned at all. Why?',
  },
  {
    id: 'listen_first',
    text: 'I just want to talk for a minute. Please listen first.',
  },
  {
    id: 'same_script',
    text: 'Why are you just giving me the same script over and over again?',
  },
  {
    id: 'sabbath_definition',
    text: 'What is a Sabbath day?',
  },
  {
    id: 'alzheimers',
    text: 'Mom has Alzheimer’s. What do I do?',
  },
  {
    id: 'grief_explicit',
    text: 'I’m going through some grief what do I do?',
  },
  {
    id: 'logos_doctrine',
    text: 'Is the Logos spoken of in the Old Testament Jesus in the New Testament as well?',
  },
];

function detectTemplateMarkers(reply = '') {
  const text = String(reply);
  const markers = [
    { name: 'health_flaring', re: /flaring up again/i },
    { name: 'health_not_doctor', re: /I'm not a doctor|I’m not a doctor/i },
    { name: 'health_sharing_about', re: /I hear you sharing about/i },
    { name: 'scripture_establishes', re: /establishes the matter/i },
    { name: 'scripture_confirms', re: /confirms it alongside Scripture/i },
    { name: 'scripture_carries', re: /carries the theme forward/i },
    { name: 'grief_sorry_loss', re: /I'm really sorry for your loss|I’m really sorry for your loss/i },
    { name: 'prayer_together', re: /bring this before the Lord together/i },
  ];
  return markers.filter((m) => m.re.test(text)).map((m) => m.name);
}

function inferResponder(structured = {}) {
  const rt = structured.runtime || {};
  const route = rt.masterRoute || rt.intent || structured.mode || 'unknown';
  const owners = {
    health_support: 'healthCompanionResponse.buildHealthSupportResponse',
    grief_support: 'griefCompanionResponse.buildEmotionalSupportResponse',
    rest_support: 'griefCompanionResponse (rest)',
    prayer: 'prayerCompanionResponse.buildPrayerCompanionResponse',
    job_discernment: 'companionDiscernmentResponder.buildDiscernmentResponse',
    meta_about_previous_answer: 'metaAnswerResponder.buildMetaAnswerResponse',
    sabbath_history: 'sabbathHistoryCompanion / sabbathHistoryDeepResponder',
    sabbath_definition: 'doctrineRuntimePipeline + companionDoctrinePresenter',
    doctrine_general: 'doctrineRuntimePipeline + companionDoctrinePresenter',
    memory_recall: 'relationshipRecallEngine.searchRelationshipRecall',
    open_general: 'masterBuddyRuntime.generateOpenAnswer (OpenAI JSON)',
    crisis: 'buddyBrain.fallbackReply',
  };
  if (rt.intent === 'memory_recall') return owners.memory_recall;
  return owners[route] || `route:${route}`;
}

function classifyFailure(trace) {
  const markers = trace.templateMarkers || [];
  const route = trace.masterRoute;
  const openAi = trace.openAiLikely;

  if (markers.includes('health_not_doctor') || markers.includes('health_flaring') || route === 'health_support') {
    if (trace.preClassifyHealth && !['correction_flaring', 'listen_first', 'same_script'].includes(trace.id)) {
      return 'A Wrong route (health classifier)';
    }
    if (trace.activeConversationTopic === 'health' && !trace.preClassifyHealth) {
      return 'C Stale active conversation / topic lock';
    }
    if (route === 'health_support') {
      return 'D Template bypass (healthCompanionResponse)';
    }
  }
  if (markers.includes('scripture_establishes') && !openAi) return 'D Template bypass (scriptureWitnessEngine)';
  if (markers.includes('grief_sorry_loss') && trace.id !== 'grief_explicit' && trace.id !== 'relationship_loss') {
    return 'C Stale grief topic contamination';
  }
  if (trace.id === 'grief_explicit' && route !== 'grief_support') return 'A Wrong route';
  if (trace.id === 'logos_doctrine' && trace.activeConversationTopic === 'grief') return 'C Stale memory/topic contamination';
  if (!openAi && route === 'open_general') return 'E OpenAI unavailable';
  if (openAi && markers.length > 2) return 'F OpenAI called but template-like output';
  if (markers.length >= 2 && trace.id === 'same_script') return 'H Fallback / template loop';
  return 'J Multiple systems (see trace)';
}

async function traceMessage({ id, text }, index) {
  const userId = `${process.env.TRACE_USER_PREFIX || 'trace-regression'}-${id}`;
  clearActiveConversation(userId);

  const preHealth = classifyHealthCompanion(text);
  const preGrief = classifyEmotionalSupport(text, userId);
  const preRecall = classifyRelationshipRecallQuery(text);
  const preDetect = detectHealthConcern(text);

  const started = Date.now();
  let structured;
  let error = null;
  try {
    structured = await runBuddy({
      userId,
      testerId: userId,
      sessionId: `trace-${id}-${Date.now()}`,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
      message: text,
    });
  } catch (e) {
    error = e.message;
    structured = { reply: '', runtime: {} };
  }

  const rt = structured.runtime || {};
  const reasoning = rt.reasoningSnapshot || {};
  const active = rt.activeConversation || {};
  const markers = detectTemplateMarkers(structured.reply);
  const masterRoute = rt.masterRoute || rt.intent || structured.mode;
  const openAiLikely =
    masterRoute === 'open_general' ||
    (!['health_support', 'grief_support', 'prayer', 'job_discernment', 'memory_recall', 'sabbath_history', 'sabbath_definition'].includes(
      masterRoute
    ) &&
      !markers.includes('health_not_doctor') &&
      !markers.includes('grief_sorry_loss') &&
      !markers.includes('scripture_establishes'));

  const trace = {
    id,
    messagePreview: text.slice(0, 100),
    runtimeSelected: process.env.BUDDY_RUNTIME || 'legacy',
    masterRoute,
    intent: rt.intent || null,
    questionType: reasoning.questionType || rt.questionIntent?.questionType || null,
    companionTopic: rt.activeTopic || active.topic || reasoning.activeTopic || null,
    practicalNextStepCategory: rt.companionNextSteps?.category || null,
    memoryHits: rt.memoryRecall?.hitCount ?? (structured.memory_used ? 1 : 0),
    scriptureRefs: (structured.scripture || []).map((s) => s.reference || s).slice(0, 6),
    historyRefs: rt.scriptureChain?.references || rt.sabbathIntent?.references || [],
    responderInferred: inferResponder(structured),
    openAiLikely,
    openAiConfigured: !!process.env.OPENAI_API_KEY,
    activeConversationTopic: active.topic || rt.activeTopic || null,
    activeConversationLock: !!rt.activeConversationLock,
    preClassifyHealth: preHealth.isHealthSupport,
    preClassifyGrief: preGrief.isEmotionalSupport,
    preClassifyRecall: preRecall.isRecallQuery,
    preDetectHealthIssue: preDetect?.issue || null,
    recommendedRoute: reasoning.recommendedRoute || null,
    templateMarkers: markers,
    replyPreview: String(structured.reply || '').slice(0, 320),
    latencyMs: Date.now() - started,
    error,
    adminFlags: structured.admin_flags || [],
  };

  trace.failureClass = classifyFailure(trace);
  return trace;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  console.log('Bible Buddy — traceBuddyChatPath');
  console.log('BUDDY_RUNTIME:', process.env.BUDDY_RUNTIME || 'legacy');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'MISSING');
  console.log('openai module loaded:', !!openai);
  console.log('---\n');

  const results = [];
  for (let i = 0; i < MESSAGES.length; i++) {
    const trace = await traceMessage(MESSAGES[i], i);
    results.push(trace);
    console.log(`[${i + 1}/${MESSAGES.length}] ${trace.id}`);
    console.log('  route:', trace.masterRoute, '| intent:', trace.intent);
    console.log('  questionType:', trace.questionType, '| activeTopic:', trace.activeConversationTopic);
    console.log('  pre health/grief:', trace.preClassifyHealth, '/', trace.preClassifyGrief);
    console.log('  responder:', trace.responderInferred);
    console.log('  OpenAI likely:', trace.openAiLikely, '| markers:', trace.templateMarkers.join(', ') || 'none');
    console.log('  failure class:', trace.failureClass);
    console.log('  preview:', trace.replyPreview.replace(/\n/g, ' ').slice(0, 200));
    console.log('');
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log('Wrote', OUT_JSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
