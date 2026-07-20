const { detectHumanNeed } = require('../../services/humanNeedDetector');
const { planCompanionDoctrineRouting } = require('../../services/companionDoctrineRouter');
const { buildReasoningPlan } = require('../../services/bibleReasoningEngine');

const cases = [
  { id:'grief', msg:"I’m going through some grief what do I do?", human:'emotional_support', lane:'companion', conceptNull:true },
  { id:'health', msg:"Mom has Alzheimer’s. What do I do?", human:'health_support', lane:'companion', conceptNull:true },
  { id:'listen', msg:"I just want to talk for a minute. Please listen first.", human:'emotional_support', lane:'companion', conceptNull:true },
  { id:'sabbath', msg:"What is a Sabbath day?", human:'doctrine_answer', lane:'strict_doctrine' },
  { id:'pork', msg:"Can I eat pork? Yes or no?", human:'doctrine_answer', lane:'strict_doctrine' },
  { id:'logos', msg:"What does Logos mean in John 1:1?", human:'doctrine_answer', reject:'ten_commandments' },
];

let failed = 0;
for (const t of cases) {
  const userId = `alpha-truth-${t.id}-${Date.now()}`;
  const humanNeed = detectHumanNeed(t.msg, {}, {});
  const routePlan = planCompanionDoctrineRouting({ userId, message:t.msg, recentSessions:[], runtimeContext:{intent:'companion'} });
  const reasoningPlan = buildReasoningPlan({ userId, message:t.msg, recentSessions:[], runtimeContext:{intent:'companion'} });

  const result = {
    id:t.id,
    humanNeed,
    routeLane:routePlan.lane,
    routePlanHumanNeed:routePlan.humanNeed,
    answerLane:reasoningPlan.answerLane,
    concept:reasoningPlan.concept || null
  };

  const pass =
    (!t.human || humanNeed === t.human) &&
    (!t.lane || routePlan.lane === t.lane) &&
    (!t.conceptNull || !reasoningPlan.concept) &&
    (!t.reject || reasoningPlan.concept !== t.reject);

  console.log(`${pass ? 'PASS' : 'FAIL'} ${JSON.stringify(result)}`);
  if (!pass) failed++;
}

if (failed) process.exit(1);
