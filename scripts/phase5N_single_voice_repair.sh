#!/usr/bin/env bash
set -e

echo "== Phase 5N Single Voice Repair =="

python3 - <<'PY'
from pathlib import Path
p = Path("services/humanNeedDetector.js")
s = p.read_text()

s = s.replace(
"const APP_IDENTITY_RE =\n  /\\b(what is (the )?purpose of this app|what is this app|are you trying to convert|why are you here|what do you do|are you (just )?quoting bible|closed.?minded)\\b/i;",
"const APP_IDENTITY_RE =\n  /\\b(what is (the )?purpose of this app|what is this app|what does (the )?app do|what does this app do|what can this app do|how does this app work|are you trying to convert|why are you here|what do you do|are you (just )?quoting bible|closed.?minded)\\b/i;"
)

s = s.replace(
"if (/\\b(pray with me|can you pray|let's pray|pray for me|deeper prayer|give me a deeper prayer)\\b/i.test(m)) return 'prayer';",
"if (/\\b(pray with me|can you pray|let's pray|pray for me|deeper prayer|better prayer|beeter prayer|give me a deeper prayer|prayer as i asked)\\b/i.test(m)) return 'prayer';"
)

s = s.replace(
"if (/\\b(what do i do about it|and then what do i do)\\b/i.test(m)) return 'next_steps';",
"if (/\\b(what do i do about it|and then what do i do|decision|not about the bible|life decision)\\b/i.test(m)) return 'next_steps';"
)

s = s.replace(
"if (intent.category === 'doctrine_answer') return 'doctrine_answer';\n  if (intent.category === 'clarification_needed') return 'clarification';\n  if (anchor.currentPracticalNeed) return 'practical_words_to_say';\n  return 'doctrine_answer';",
"if (intent.category === 'doctrine_answer') return 'doctrine_answer';\n  if (intent.category === 'clarification_needed') return 'clarification';\n  if (anchor.currentPracticalNeed) return 'practical_words_to_say';\n  return 'conversation';"
)

p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path
p = Path("services/practicalWisdomEngine.js")
s = p.read_text()

s = s.replace(
"""  const candidates = [
    conceptId,
    sm.activeConcept,
    state.lastAnsweredConcept,
    anchor.currentDoctrineConcept,
    anchor.currentTopic,
    'dietary_pork_unclean',
  ];""",
"""  const candidates = [
    conceptId,
    anchor.currentDoctrineConcept,
    sm.activeConcept,
    state.lastAnsweredConcept,
    anchor.currentTopic,
  ];"""
)

s = s.replace(
"  return 'dietary_pork_unclean';",
"  return null;"
)

s = s.replace(
"""  const id = resolvePracticalConceptId(conceptId, anchor, state);
  const m = String(message || '');""",
"""  const id = resolvePracticalConceptId(conceptId, anchor, state);
  const m = String(message || '');"""
)

s = s.replace(
"""  if (wantsFamilyWording) {
    const fam = buildFamilyExplanation({ concept: id });""",
"""  if (wantsFamilyWording) {
    if (!id) {
      return {
        reply: "I hear you. What is the situation with your son? Tell me what happened and what you want him to understand, and I’ll help you say it with truth, love, and wisdom.",
        scripture: [],
        masterRoute: 'phase5n_practical_context_needed',
      };
    }
    const fam = buildFamilyExplanation({ concept: id });"""
)

p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path
p = Path("services/bibleCompanionOrchestrator.js")
s = p.read_text()

# Add local stop release helper after runNoGlitchPreflight function header area if not present.
marker = "function runNoGlitchPreflight(userId, message, safety, runtimeContext) {"
helper = """
function clearStopReleaseStateSafely(userId) {
  const prev = getDoctrineConversationState(userId);
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    activeBibleConcept: null,
    lastAnsweredConcept: null,
    lastAnsweredTopic: null,
    lastStrictDoctrineTopic: null,
    usedConceptWitnesses: [],
    releaseRequested: false,
    doctrineSuspended: false,
    sessionMemory: {
      ...(prev.sessionMemory || {}),
      activeConcept: null,
      pendingQuestion: null,
    },
    releaseReason: 'stop_acknowledged',
  });
}

"""
if "function clearStopReleaseStateSafely" not in s:
    s = s.replace(marker, helper + marker)

s = s.replace("      finalizeStopRelease(userId);", "      clearStopReleaseStateSafely(userId);")

p.write_text(s)
PY

cat > scripts/runPhase5NSingleVoiceRegression.js <<'JS'
const assert = require('assert');

const BASE = process.env.BUDDY_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com';

const cases = [
  ['What is this app?', /Scripture-grounded companion|listen|study/i, /phase5l_app_identity/],
  ['What does the app do?', /Scripture-grounded companion|listen|study|pray/i, /phase5l_app_identity/],
  ['Can you pray with me?', /pray with you|Father/i, /phase5k_prayer_companion/],
  ['I need a better prayer', /pray|Father|Lord/i, /prayer|companion/],
  ["I'm nervous about tomorrow.", /nervous|weighing|breathe/i, /presence|nervous|companion/],
  ['Decision', /decision|tell me|what decision|weighing/i, /(presence|companion|guidance|clarification)/],
  ['I have a decision that is not about the Bible.', /decision|tell me|wisdom|choice/i, /(companion|guidance|presence)/],
  ['What should I say to my son?', /situation with your son|what happened|want him to understand/i, /practical|context/],
  ['Can we eat pork?', /No.*pork.*unclean|Leviticus|Deuteronomy/i, /doctrine_final_authority/],
  ['Can we eat shellfish?', /No.*shellfish.*unclean|Leviticus|Deuteronomy/i, /doctrine_final_authority/],
  ['What about Acts 10?', /Acts 10:28|people|Gentiles|common or unclean/i, /doctrine_final_authority/],
  ['Stop.', /stop|topic|what do you want/i, /stop|release|no_glitch_stop/],
];

(async () => {
  const out = [];
  for (const [message, replyRe, routeRe] of cases) {
    const res = await fetch(`${BASE}/buddy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `phase5n-${Date.now()}`, message }),
    });
    const json = await res.json();
    const reply = json.reply?.reply || '';
    const route = json.reply?.runtime?.masterRoute || '';
    const fallback = json.reply?.runtime?.fallbackErrorCode || null;

    const pass = replyRe.test(reply) && routeRe.test(route) && !fallback;
    out.push({ message, pass, route, fallback, reply });
  }

  console.table(out.map(x => ({
    pass: x.pass,
    message: x.message,
    route: x.route,
    fallback: x.fallback,
    reply: x.reply.slice(0, 90),
  })));

  const failed = out.filter(x => !x.pass);
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log('Phase 5N single voice regression PASS');
})();
JS

echo "== Changed files =="
git diff -- services/humanNeedDetector.js services/practicalWisdomEngine.js services/bibleCompanionOrchestrator.js scripts/runPhase5NSingleVoiceRegression.js
