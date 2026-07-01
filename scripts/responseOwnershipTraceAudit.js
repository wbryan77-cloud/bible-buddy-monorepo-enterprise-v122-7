#!/usr/bin/env node
/**
 * EMERGENCY AUDIT — Response ownership trace (no fixes).
 * Output: ResponseOwnershipTraceReport.md + docs/regression-trace/response-ownership-trace.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { detectDangerousFallbackSpeaker } = require('../services/coreResponseGuards');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'regression-trace', 'response-ownership-trace.json');
const OUT_MD = path.join(ROOT, 'ResponseOwnershipTraceReport.md');

const STUDY_RE = /You've been studying|We can continue that study|continue your study journey|Would you like to continue studying/i;
const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday|Sunday observance developed/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;

const LIVE_FAILURES = [
  { id: 'live_pork_yesno', message: 'Can I eat pork? Yes or no?', failureSymptom: 'not_answered_yes_no_directly' },
  { id: 'live_logos_meaning', message: 'What does Logos mean?', failureSymptom: 'wrong_topic_sabbath_response' },
  { id: 'live_sabbath_how', message: 'How do we keep the Sabbath holy?', failureSymptom: 'sunday_history_instead_of_how' },
  { id: 'live_rough_day', message: 'Today has been a rough day. I had to let go of someone I love.', failureSymptom: 'study_continuation_instead_of_listen' },
  { id: 'live_holy_meaning', message: 'What does holy mean?', failureSymptom: 'study_continuation' },
];

const CORRECTION_SEQUENCE = [
  { id: 'corr_setup_sabbath', message: 'What is the Sabbath?' },
  { id: 'corr_setup_history', message: 'Who changed the Sabbath to Sunday?' },
  { id: 'corr_not_my_question', message: "That's not my question", failureSymptom: 'correction_not_repaired' },
];

const MODES = [
  {
    id: 'live_server_default',
    label: 'Live server default (no ownership env flags)',
    env: { BUDDY_RUNTIME: 'legacy', BUDDY_DEBUG: '1' },
    unset: ['BUDDY_TEMPLATE_PROSE', 'BUDDY_DISABLE_STUDY_FALLBACK', 'BUDDY_OPENAI_FIRST'],
  },
  {
    id: 'ownership_protected',
    label: 'Ownership-protected env (TEMPLATE_PROSE=0, DISABLE_STUDY_FALLBACK=1)',
    env: {
      BUDDY_RUNTIME: 'legacy',
      BUDDY_DEBUG: '1',
      BUDDY_TEMPLATE_PROSE: '0',
      BUDDY_DISABLE_STUDY_FALLBACK: '1',
    },
    unset: ['BUDDY_OPENAI_FIRST'],
  },
  {
    id: 'master_rollback',
    label: 'Master runtime rollback (BUDDY_OPENAI_FIRST=0)',
    env: { BUDDY_RUNTIME: 'legacy', BUDDY_DEBUG: '1', BUDDY_OPENAI_FIRST: '0' },
    unset: ['BUDDY_TEMPLATE_PROSE', 'BUDDY_DISABLE_STUDY_FALLBACK'],
  },
];

function applyMode(mode) {
  for (const k of mode.unset || []) delete process.env[k];
  for (const [k, v] of Object.entries(mode.env)) process.env[k] = v;
}

function detectSymptoms(reply = '', message = '') {
  const r = String(reply || '');
  return {
    studyContinuation: STUDY_RE.test(r),
    sundayHistory: HISTORY_RE.test(r) && !/who changed|constantine|history/i.test(String(message)),
    witnessTriplet: WITNESS_RE.test(r),
    psalm46Only: /^God is our refuge and strength/i.test(r.trim()),
    missingYesNo: /\b(yes or no|can i eat pork)\b/i.test(message) && !/\b(yes|no)\b/i.test(r.slice(0, 150)),
    logosAskedSabbathAnswer: /\blogos\b/i.test(message) && /\bsabbath\b/i.test(r) && !/\blogos\b/i.test(r.slice(0, 200)),
    emotionalIgnored: /rough day|let go of someone/i.test(message) && STUDY_RE.test(r),
  };
}

function extractTrace(structured, message, modeId) {
  const dbg = structured.coreDebug || structured.runtime?.coreDebug || {};
  const rt = structured.runtime || {};
  const danger = detectDangerousFallbackSpeaker(structured.reply || '');
  const pack = buildRetrievalEvidencePack({
    userId: 'trace-audit',
    message,
    mode: 'COMPANION',
    recentSessions: [],
    runtimeContext: {},
    profile: {},
    safety: { level: 'standard' },
    routingHintsOnly: true,
  });

  const openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
  const fallbackUsed = !!(dbg.fallbackUsed ?? (rt.coreDebug?.fallbackUsed));
  const studyFallbackUsed =
    danger.studyLoopUsed ||
    STUDY_RE.test(structured.reply || '') ||
    !!(rt.personalizedFallback || rt.minimalOwnershipFallback) && STUDY_RE.test(structured.reply || '');

  return {
    modeId,
    routeUsed: dbg.routeUsed || rt.masterRoute || null,
    runtimeUsed: dbg.runtimeUsed || rt.buddyRuntime || process.env.BUDDY_RUNTIME || 'legacy',
    finalAnswerAuthor: dbg.finalAnswerAuthor || (openaiCalled ? 'openai' : fallbackUsed ? 'fallback_or_connection' : 'unknown'),
    templateUsed: !!(dbg.templateUsed || danger.detected || WITNESS_RE.test(structured.reply || '')),
    fallbackUsed: !!(dbg.fallbackUsed || fallbackUsed || structured.admin_flags?.includes('personalized_fallback')),
    responderUsed: dbg.responderUsed || rt.masterRoute || 'unknown',
    studyFallbackUsed,
    topicContinuationUsed: !!(pack.studyState && !pack.studyState.suppressed && pack.studyState.lastStudiedReference),
    relationshipEnrichmentUsed: !!rt.relationshipIntelligence,
    evidenceCardsUsed: !!(dbg.evidenceCardsUsed ?? (pack.evidenceCards?.cards?.length > 0)),
    openaiCalled,
    openaiResponseReceived: openaiCalled && String(structured.reply || '').length > 10,
    regenerationTriggered: !!(rt.antiOverrideRegen || dbg.validationIssues?.length),
    loopGuardTriggered: !!(structured.admin_flags || []).includes('ownership_no_fallback_swap') || !!rt.fallbackLoopSuppressed,
    evidenceTopic: dbg.evidenceTopic || pack.topic || null,
    evidenceCardTopics: (pack.evidenceCards?.cards || []).map((c) => c.topic),
    adminFlags: structured.admin_flags || [],
    symptoms: detectSymptoms(structured.reply, message),
    replyPreview: String(structured.reply || '').slice(0, 400),
    apiError: dbg.errorMessage || rt.connectionError || null,
  };
}

async function traceTurn({ id, message, mode, userId, priorMessages = [] }) {
  clearActiveConversation(userId);
  for (const pm of priorMessages) {
    await runBuddy({ userId, message: pm, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  }
  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    id,
    message,
    userId,
    ...extractTrace(structured, message, mode.id),
  };
}

function analyzeSessionLog() {
  const logPath = path.join(ROOT, 'data', 'buddy-sessions.jsonl');
  if (!fs.existsSync(logPath)) return { entries: 0, components: [] };

  const stat = fs.statSync(logPath);
  const tailBytes = Math.min(stat.size, 8 * 1024 * 1024);
  const buf = Buffer.alloc(tailBytes);
  const fd = fs.openSync(logPath, 'r');
  fs.readSync(fd, buf, 0, tailBytes, stat.size - tailBytes);
  fs.closeSync(fd);
  const lines = buf
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .slice(-5000);
  const components = {};

  function bump(component, kind) {
    components[component] = components[component] || { responseCount: 0, ownershipCount: 0, interferenceCount: 0 };
    components[component].responseCount += 1;
    if (kind === 'ownership') components[component].ownershipCount += 1;
    if (kind === 'interference') components[component].interferenceCount += 1;
  }

  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const reply = row.reply || row.structured?.reply || '';
    const rt = row.structured?.runtime || {};
    const flags = row.structured?.admin_flags || [];

    const openAi = rt.openAiCalled || rt.coreDebug?.openaiCalled;
    if (openAi) bump('openai.reasonFirstComposer', 'ownership');

    if (flags.includes('personalized_fallback') || rt.personalizedFallback) {
      bump('personalizedFallback', STUDY_RE.test(reply) ? 'interference' : 'ownership');
    }
    if (STUDY_RE.test(reply)) {
      bump('companionLearningLayer.studyContinuation', 'interference');
      bump('studyJourneyEngine', 'interference');
    }
    if (WITNESS_RE.test(reply)) {
      bump('scriptureWitnessEngine', 'interference');
      bump('companionDoctrinePresenter', 'interference');
    }
    if (rt.relationshipIntelligence) bump('enrichResponseWithRelationshipIntelligence', 'interference');
    if (rt.intent === 'sabbath_history' || /sabbath_history/i.test(rt.masterRoute || '')) {
      bump('sabbathHistoryDeepResponder', HISTORY_RE.test(reply) ? 'interference' : 'ownership');
    }
    if (/doctrine_general|sabbath_definition/i.test(rt.masterRoute || '')) {
      bump('sourceGroundedResponder', 'interference');
    }
    if (/continue_study|study_connection/i.test(rt.intent || '')) {
      bump('continueStudyEngine', 'interference');
    }
    if (rt.coreDebug?.finalAnswerAuthor === 'connection_error' || rt.connectionError) {
      bump('buildConnectionErrorReply', 'interference');
    }
    if (!openAi && !flags.includes('personalized_fallback') && reply.length > 20) {
      bump('non_openai_unknown', 'interference');
    }
  }

  const ranked = Object.entries(components)
    .map(([component, c]) => {
      const damageScore =
        Math.round(((c.interferenceCount * 2 + c.responseCount) / Math.max(lines.length, 1)) * 1000) / 10;
      return { component, ...c, damageScore };
    })
    .sort((a, b) => b.damageScore - a.damageScore);

  return { entries: lines.length, components: ranked };
}

function rankFromTraces(traces) {
  const components = {};
  function bump(component, kind) {
    components[component] = components[component] || { responseCount: 0, ownershipCount: 0, interferenceCount: 0 };
    components[component].responseCount += 1;
    if (kind === 'ownership') components[component].ownershipCount += 1;
    if (kind === 'interference') components[component].interferenceCount += 1;
  }

  for (const t of traces) {
    if (t.openaiCalled && t.finalAnswerAuthor === 'openai' && !t.studyFallbackUsed && !t.templateUsed) {
      bump('openai.reasonFirstComposer', 'ownership');
    }
    if (t.fallbackUsed || t.finalAnswerAuthor === 'connection_error') {
      bump(t.openaiCalled ? 'openai_api_failure' : 'buildConnectionErrorReply', 'interference');
    }
    if (t.studyFallbackUsed) bump('personalizedFallback_or_studySpeaker', 'interference');
    if (t.templateUsed || t.symptoms?.witnessTriplet) bump('scriptureWitnessEngine_or_template', 'interference');
    if (t.symptoms?.sundayHistory) bump('sabbathHistoryDeepResponder_or_history_bleed', 'interference');
    if (t.relationshipEnrichmentUsed) bump('enrichResponseWithRelationshipIntelligence', 'interference');
    if (t.responderUsed?.includes('master') || t.modeId === 'master_rollback') {
      bump('masterBuddyRuntime.templateDispatch', 'interference');
    }
    if (t.symptoms?.logosAskedSabbathAnswer) bump('topic_mismatch_evidence_or_openai', 'interference');
    if (t.evidenceCardsUsed && !t.openaiCalled) bump('evidenceCards_without_openai', 'interference');
    if (t.topicContinuationUsed && t.studyFallbackUsed) bump('companionLearningLayer.profileBleed', 'interference');
  }

  return Object.entries(components)
    .map(([component, c]) => ({
      component,
      responseCount: c.responseCount,
      ownershipCount: c.ownershipCount,
      interferenceCount: c.interferenceCount,
      damageScore: Math.round((c.interferenceCount / Math.max(c.responseCount, 1)) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.damageScore - a.damageScore || b.interferenceCount - a.interferenceCount);
}

async function main() {
  const allTraces = [];

  for (const mode of MODES) {
    applyMode(mode);
    console.log(`\n=== MODE: ${mode.label} ===`);

    for (const item of LIVE_FAILURES) {
      const userId = `trace-${mode.id}-${item.id}-${Date.now()}`;
      const trace = await traceTurn({ ...item, mode, userId });
      allTraces.push(trace);
      console.log(`[${item.id}] author=${trace.finalAnswerAuthor} openai=${trace.openaiCalled} study=${trace.studyFallbackUsed}`);
    }

    const corrUser = `trace-${mode.id}-correction-${Date.now()}`;
    const prior = CORRECTION_SEQUENCE.slice(0, -1).map((x) => x.message);
    const corr = CORRECTION_SEQUENCE[CORRECTION_SEQUENCE.length - 1];
    const corrTrace = await traceTurn({
      ...corr,
      mode,
      userId: corrUser,
      priorMessages: prior,
    });
    allTraces.push(corrTrace);
  }

  const sessionRank = analyzeSessionLog();
  const traceRank = rankFromTraces(allTraces);
  const combined = {};
  for (const list of [sessionRank.components, traceRank]) {
    for (const row of list) {
      const c = combined[row.component] || {
        component: row.component,
        responseCount: 0,
        ownershipCount: 0,
        interferenceCount: 0,
      };
      c.responseCount += row.responseCount;
      c.ownershipCount += row.ownershipCount;
      c.interferenceCount += row.interferenceCount;
      combined[row.component] = c;
    }
  }
  const componentRanking = Object.values(combined)
    .map((c) => ({
      ...c,
      damageScore:
        Math.round(
          ((c.interferenceCount * 2 + c.responseCount) / Math.max(sessionRank.entries || allTraces.length, 1)) * 1000
        ) / 10,
    }))
    .sort((a, b) => b.damageScore - a.damageScore);

  const payload = {
    ranAt: new Date().toISOString(),
    auditType: 'emergency_response_ownership_trace',
    modes: MODES.map((m) => m.id),
    liveFailureCases: LIVE_FAILURES.map((x) => x.id),
    sessionLogEntries: sessionRank.entries,
    traces: allTraces,
    componentRanking,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));

  const md = buildReport(payload);
  fs.writeFileSync(OUT_MD, md);
  console.log(`\nWrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
}

function buildReport(payload) {
  const lines = [];
  lines.push('# Response Ownership Trace Report');
  lines.push('');
  lines.push('**Mode:** Emergency audit only — no fixes, no deploy, no push.');
  lines.push(`**Ran:** ${payload.ranAt}`);
  lines.push('');
  lines.push('## Executive finding');
  lines.push('');
  lines.push('Live listening failures map to **three interference classes**:');
  lines.push('');
  lines.push('1. **OpenAI not reached** (`connection_error` / API quota / missing key) → user sees connection or minimal fallback, not a direct answer.');
  lines.push('2. **Template/study speakers** (`personalizedFallback`, `companionLearningLayer`, study journey) → "You\'ve been studying…" when OpenAI fails or master runtime is active.');
  lines.push('3. **OpenAI reached but evidence/topic bleed** → wrong card topic (Sabbath on Logos), history on HOW questions, or pasted witness blocks.');
  lines.push('');
  lines.push('## Per-case traces (all runtime modes)');
  lines.push('');

  for (const t of payload.traces) {
    lines.push(`### ${t.id} — \`${t.modeId}\``);
    lines.push('');
    lines.push(`**User:** ${t.message}`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    const fields = [
      'routeUsed', 'runtimeUsed', 'finalAnswerAuthor', 'templateUsed', 'fallbackUsed', 'responderUsed',
      'studyFallbackUsed', 'topicContinuationUsed', 'relationshipEnrichmentUsed', 'evidenceCardsUsed',
      'openaiCalled', 'openaiResponseReceived', 'regenerationTriggered', 'loopGuardTriggered',
    ];
    for (const f of fields) {
      lines.push(`| ${f} | ${JSON.stringify(t[f])} |`);
    }
    lines.push('');
    lines.push(`**Evidence topics:** ${(t.evidenceCardTopics || []).join(', ') || 'none'} (pack topic: ${t.evidenceTopic})`);
    lines.push(`**Symptoms:** ${JSON.stringify(t.symptoms)}`);
    if (t.apiError) lines.push(`**API error:** ${t.apiError}`);
    lines.push('');
    lines.push('**Reply preview:**');
    lines.push('');
    lines.push('```');
    lines.push(t.replyPreview || '(empty)');
    lines.push('```');
    lines.push('');
  }

  lines.push('## Component damage ranking (highest → lowest)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(payload.componentRanking, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Session log corroboration');
  lines.push('');
  lines.push(`Analyzed **${payload.sessionLogEntries}** rows in \`data/buddy-sessions.jsonl\` for historical interference patterns.`);
  lines.push('');
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
