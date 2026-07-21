const { detectHumanNeed } = require('../../services/humanNeedDetector');
const { planCompanionDoctrineRouting } = require('../../services/companionDoctrineRouter');
const { buildReasoningPlan } = require('../../services/bibleReasoningEngine');

const cases = [
  {
    name: 'grief companion',
    message: "I’m going through some grief what do I do?",
    expectHumanNeed: 'emotional_support',
    expectLane: 'companion',
    expectConcept: null,
  },
  {
    name: 'health companion',
    message: "Mom has Alzheimer’s. What do I do?",
    expectHumanNeed: 'health_support',
    expectLane: 'companion',
    expectConcept: null,
  },
  {
    name: 'listen first companion',
    message: "I just want to talk for a minute. Please listen first.",
    expectHumanNeed: 'emotional_support',
    expectLane: 'companion',
    expectConcept: null,
  },
  {
    name: 'sabbath doctrine',
    message: "What is a Sabbath day?",
    expectHumanNeed: 'doctrine_answer',
    expectLane: 'strict_doctrine',
  },
  {
    name: 'pork doctrine',
    message: "Can I eat pork? Yes or no?",
    expectHumanNeed: 'doctrine_answer',
    expectLane: 'strict_doctrine',
  },
  {
    name: 'logos bible question',
    message: "What does Logos mean in John 1:1?",
    expectHumanNeed: 'doctrine_answer',
    rejectConcept: 'ten_commandments',
  },
];

let failed = 0;

for (const t of cases) {
  const userId = `alpha-core-${t.name.replace(/\W+/g, '-')}-${Date.now()}`;
  const humanNeed = detectHumanNeed(t.message, {}, {});
  const routePlan = planCompanionDoctrineRouting({
    userId,
    message: t.message,
    recentSessions: [],
    runtimeContext: { intent: 'companion' },
  });
  const reasoningPlan = buildReasoningPlan({
    userId,
    message: t.message,
    recentSessions: [],
    runtimeContext: { intent: 'companion' },
  });

  const result = {
    name: t.name,
    message: t.message,
    humanNeed,
    routeLane: routePlan.lane,
    routePlanHumanNeed: routePlan.humanNeed,
    answerLane: reasoningPlan.answerLane,
    concept: reasoningPlan.concept,
  };

  const okHuman = !t.expectHumanNeed || humanNeed === t.expectHumanNeed;
  const okLane = !t.expectLane || routePlan.lane === t.expectLane;
  const okConcept = !('expectConcept' in t) || reasoningPlan.concept === t.expectConcept;
  const okRejectConcept = !t.rejectConcept || reasoningPlan.concept !== t.rejectConcept;

  if (!okHuman || !okLane || !okConcept || !okRejectConcept) {
    failed++;
    console.error('[FAIL]', JSON.stringify(result, null, 2));
  } else {
    console.log('[PASS]', JSON.stringify(result));
  }
}

if (failed) {
  console.error(`Alpha core smoke failed: ${failed}`);
  process.exit(1);
}
console.log('Alpha core smoke passed.');
