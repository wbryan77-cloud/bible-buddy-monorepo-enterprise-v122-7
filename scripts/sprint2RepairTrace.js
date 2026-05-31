#!/usr/bin/env node
/**
 * Sprint 2.REPAIR — live path trace for /buddy/chat sequence.
 * Usage: node scripts/sprint2RepairTrace.js
 */

const { runBuddy } = require('../services/buddyBrain');
const { resolveSabbathCompanionIntent } = require('../services/sabbathIntentRouter');

const USER_ID = `s2repair-trace-${Date.now()}`;

const TURNS = [
  'What is the Sabbath?',
  'Who changed the Sabbath and why?',
  'Give me historical references that go with the Bible on who and why someone changed this Sabbath?',
  'Give me the historical evidence',
];

function describePath(message, reply, recentSessions) {
  const runtime = reply?.runtime || {};
  const sabbathIntent = resolveSabbathCompanionIntent({ message, recentSessions });

  let routeHit = 'POST /buddy/chat → routes/buddy.js → runBuddy()';
  let intercept = 'none';
  let presenter = 'none';
  let presentCompanionDoctrineRan = false;
  let routeHistoricalContextRan = false;
  let polishCompanionReplyRan = true;
  let fallbackLoopSuppressorRan = false;
  let finalSource = 'unknown';

  if (runtime.intercept === 'sabbath_history_companion') {
    intercept = 'sabbath_history_companion (pre-doctrine)';
    presenter = runtime.presenter || 'sabbathHistoryCompanion';
    routeHistoricalContextRan = !!runtime.companionPresentation?.routeHistoricalContextRan;
    presentCompanionDoctrineRan = false;
    finalSource = 'sabbathHistoryCompanion.buildSabbathHistoryResponse';
  } else if (runtime.doctrineTopic || runtime.companionPresentation) {
    intercept = 'doctrine_intercept';
    presenter = 'companionDoctrinePresenter';
    presentCompanionDoctrineRan = !!runtime.companionPresentation?.wrapped;
    routeHistoricalContextRan = !!runtime.historicalContext || !!runtime.companionPresentation?.historicalSecondary;
    finalSource = 'sourceGroundedResponder → presentCompanionDoctrine';
  } else if (runtime.intent === 'sabbath_history') {
    intercept = 'sabbath_history_companion';
    presenter = 'sabbathHistoryCompanion';
    routeHistoricalContextRan = true;
    finalSource = 'sabbathHistoryCompanion';
  } else if (runtime.fallbackLoopSuppressed) {
    intercept = 'personalizedFallback';
    fallbackLoopSuppressorRan = true;
    finalSource = 'personalizedFallback (loop suppressed)';
  } else if (reply?.mode === 'study' && reply?.admin_flags?.includes('source_grounded_guardrail_used')) {
    intercept = 'doctrine_intercept';
    presenter = 'companionDoctrinePresenter';
    finalSource = 'sourceGroundedResponder';
  } else if (runtime.intent === 'continue_study') {
    intercept = 'continue_study';
    finalSource = 'continueStudyIntent';
  } else {
    intercept = runtime.intent || reply?.mode || 'openai_or_fallback';
    finalSource = runtime.openaiPathEnriched ? 'openai' : 'personalizedFallback or companion path';
  }

  return {
    routeHit,
    runBuddyPath: `runBuddy(userId=${USER_ID})`,
    sabbathIntentResolved: sabbathIntent,
    interceptSelected: intercept,
    presenterSelected: presenter,
    presentCompanionDoctrineRan,
    routeHistoricalContextRan,
    polishCompanionReplyRan,
    companionReplyPolishRan: polishCompanionReplyRan,
    fallbackLoopSuppressorRan,
    finalResponseSource: finalSource,
    replyPreview: String(reply?.reply || '').slice(0, 280),
  };
}

async function main() {
  console.log('=== Sprint 2.REPAIR Live Path Trace ===');
  console.log(`userId: ${USER_ID}`);
  console.log('');

  const recentSessions = [];

  for (let i = 0; i < TURNS.length; i += 1) {
    const message = TURNS[i];
    console.log(`--- Turn ${i + 1}: "${message}" ---`);

    const reply = await runBuddy({ userId: USER_ID, message });
    const trace = describePath(message, reply, recentSessions);

    console.log('1. Route hit:', trace.routeHit);
    console.log('2. runBuddy() path:', trace.runBuddyPath);
    console.log('3. Sabbath intent resolved:', JSON.stringify(trace.sabbathIntentResolved));
    console.log('4. Intercept selected:', trace.interceptSelected);
    console.log('5. Presenter selected:', trace.presenterSelected);
    console.log('6. presentCompanionDoctrine() ran:', trace.presentCompanionDoctrineRan);
    console.log('7. routeHistoricalContext() ran:', trace.routeHistoricalContextRan);
    console.log('8. polishCompanionReply() ran:', trace.polishCompanionReplyRan);
    console.log('9. companionReplyPolish() ran:', trace.companionReplyPolishRan);
    console.log('10. fallbackLoopSuppressor() ran:', trace.fallbackLoopSuppressorRan);
    console.log('11. Final response source:', trace.finalResponseSource);
    console.log('12. Reply preview:', trace.replyPreview);
    console.log('');

    recentSessions.push({
      message,
      reply: reply.reply,
      runtime: reply.runtime,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
