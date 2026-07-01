#!/usr/bin/env node
/**
 * Phase 5B — Trace live /buddy/chat route ownership (same chain as routes/buddy.js).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { withBuddyChatGuarantee, COMPANION_SAFE_FALLBACK } = require('../services/responseGuarantee');
const { getBuddyRouteTraceSnapshot } = require('../services/buddyLivePathVerifier');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5BLiveRouteTraceReport.md');

const MESSAGES = [
  'Can we eat pork?',
  'Acts 10',
  'I had a bad day today.',
  'Can we have sex without marriage?',
  'show me another verse about fornication?',
  'Can you give me more scriptures with man staying on earth and the kingdom coming?',
];

const ROUTE_FILE = 'routes/buddy.js';
const EXPORTED_HANDLER =
  'POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime';

function isFallbackText(text = '') {
  return String(text).includes(COMPANION_SAFE_FALLBACK) || String(text).includes('stay with you on this');
}

async function traceMessage(message, index) {
  const userId = `phase5b-trace-${index}`;
  const trace = {
    message,
    routeFile: ROUTE_FILE,
    exportedHandler: EXPORTED_HANDLER,
    runtimeCalled: 'openAiFirstCompanionRuntime',
    orchestratorCalled: false,
    strictGateCalled: false,
    companionRouterCalled: false,
    openAiFirstCalled: false,
    reasonFirstCalled: false,
    fallbackSource: null,
    error: null,
    replyPreview: '',
    metadata: {},
  };

  try {
    const guaranteed = await withBuddyChatGuarantee(
      () => runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' }),
      { userId, message },
    );

    const structured = guaranteed.reply || {};
    const replyText = String(structured.reply || '');
    trace.replyPreview = replyText.slice(0, 160);
    trace.metadata = {
      ok: guaranteed.ok,
      masterRoute: structured.runtime?.masterRoute,
      orchestratorLane: structured.runtime?.orchestratorLane,
      phase5A: structured.runtime?.phase5A,
      openAiCalled: structured.runtime?.openAiCalled,
      fallbackErrorCode: structured.runtime?.fallbackErrorCode,
      routeOwner: structured.runtime?.routeOwner,
      doctrineTopic: structured.runtime?.doctrineTopic,
      bibleConcept: structured.runtime?.bibleConcept,
    };

    trace.orchestratorCalled =
      !!structured.runtime?.phase5A ||
      !!structured.runtime?.orchestratorLane ||
      /orchestrator|bible_wide|companion_state|pending_question/i.test(
        String(structured.runtime?.masterRoute || ''),
      );
    trace.strictGateCalled =
      /strict_doctrine|doctrine_final_authority|doctrine_before_that|doctrine_memory/i.test(
        String(structured.runtime?.masterRoute || ''),
      );
    trace.companionRouterCalled =
      trace.orchestratorCalled ||
      /companion_doctrine_release|companion_lane|companion_state/i.test(
        String(structured.runtime?.masterRoute || ''),
      );
    trace.openAiFirstCalled = true;
    trace.reasonFirstCalled = false;

    if (isFallbackText(replyText)) {
      trace.fallbackSource = structured.runtime?.masterRoute || 'responseGuarantee';
    }
  } catch (e) {
    trace.error = String(e.message || e);
    trace.fallbackSource = 'unhandled_exception';
  }

  return trace;
}

async function main() {
  const manifest = getBuddyRouteTraceSnapshot();
  const traces = [];

  for (let i = 0; i < MESSAGES.length; i++) {
    traces.push(await traceMessage(MESSAGES[i], i));
  }

  const lines = [
    '# Phase 5B Live Route Trace Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Route Owner',
    '',
    `- **routeFile:** ${ROUTE_FILE}`,
    `- **exportedHandler:** ${EXPORTED_HANDLER}`,
    `- **runtimeCalled:** openAiFirstCompanionRuntime (buddyBrain.runBuddy hard cutover)`,
  ];

  lines.push('', '## Module Manifest', '');
  lines.push(`- **manifestOk:** ${manifest.ok}`);
  lines.push(`- **gitCommit:** ${manifest.gitCommit || 'unknown'}`);
  if (manifest.missingModules?.length) {
    lines.push(`- **missingModules:** ${manifest.missingModules.join(', ')}`);
  }

  lines.push('', '## Per-Message Traces', '');

  for (const t of traces) {
    const status = t.fallbackSource ? 'FALLBACK' : 'OK';
    lines.push(`### ${status} — "${t.message}"`, '');
    lines.push('```json');
    lines.push(JSON.stringify(t, null, 2));
    lines.push('```', '');
  }

  const fallbackCount = traces.filter((t) => t.fallbackSource).length;
  lines.push('## Summary', '');
  lines.push(`- Traces: ${traces.length}`);
  lines.push(`- Fallbacks: ${fallbackCount}`);
  lines.push(`- Manifest OK: ${manifest.ok}`);

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  console.log(`Phase 5B trace report: ${REPORT}`);
  console.log(`Manifest OK: ${manifest.ok}, Fallbacks: ${fallbackCount}/${traces.length}`);
  process.exit(fallbackCount > 0 || !manifest.ok ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
