#!/usr/bin/env node
/**
 * AUDIT ONLY — ownership damage ranking battery (no runtime fixes).
 * Output: docs/regression-trace/OwnershipDamageRanking.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { detectDangerousFallbackSpeaker } = require('../services/coreResponseGuards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'OwnershipDamageRanking.json');
const CLEANUP_OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'ownership-cleanup-results.json');

const STUDY = /You've been studying|We can continue that study|continue your study journey|Would you like to continue studying/i;
const WITNESS = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;
const HISTORY = /Constantine|Council of Laodicea|Saturday to Sunday/i;
const PRAY = /glad you asked to pray|How have you been doing since we prayed/i;

function hasYesNoLead(reply = '', message = '') {
  const lead = String(reply || '').slice(0, 180);
  if (/^\s*(yes|no)\b/i.test(lead) || /\b(yes|no)\b/i.test(lead.slice(0, 120))) return true;
  if (/\b(can i eat|should i eat|eat pork|eat swine|eat shrimp|yes or no)\b/i.test(String(message || ''))) {
    return /\b(not to be eaten|not permitted|is unclean|are unclean|forbidden|prohibited|should not|do not eat)\b/i.test(
      lead
    );
  }
  return false;
}

const TESTS = [
  { id: 'live_01', message: 'Can I eat pork? Yes or no?', category: 'live_failed', expectYesNo: true },
  { id: 'live_02', message: 'Why do you say Yahweh instead of Jesus?', category: 'live_failed', forbidHistory: true },
  { id: 'live_03', message: 'Today has been a rough day. I had to let go of someone I love.', category: 'live_failed' },
  { id: 'live_04', message: 'Is Easter real?', category: 'live_failed' },
  { id: 'live_05', message: "So we shouldn't do Easter per the Bible?", category: 'live_failed' },
  { id: 'live_06', message: 'How many heavens are talked about in the Bible?', category: 'live_failed' },
  { id: 'live_07', message: 'Can you search the scriptures and tell where they talk about the third heaven?', category: 'live_failed' },
  { id: 'live_08', message: 'Can you search the Bible directly or no?', category: 'live_failed' },
  { id: 'live_09', message: 'How do we keep this Sabbath day holy to the Lord?', category: 'live_failed', forbidHistory: true },
  { id: 'live_10', message: "My mother is going through Alzheimer's.", category: 'live_failed' },
  { id: 'live_11', message: "I have homework and don't know how to finish it before school.", category: 'live_failed' },
  { id: 'live_12', message: "Why won't you answer my question?", category: 'live_failed' },
  { id: 'doc_01', message: 'What is a Sabbath day according to Scripture?', category: 'doctrine' },
  { id: 'doc_02', message: 'Is the Sabbath still required today?', category: 'doctrine' },
  { id: 'doc_03', message: 'Who changed the Sabbath to Sunday?', category: 'doctrine', allowHistory: true },
  { id: 'doc_04', message: 'What does the Bible say about dietary law?', category: 'doctrine' },
  { id: 'doc_05', message: 'So yes or no, can I eat swine or pork?', category: 'doctrine', expectYesNo: true },
  { id: 'doc_06', message: 'Explain Acts 10 — is it about eating unclean animals?', category: 'doctrine' },
  { id: 'doc_07', message: 'What does Isaiah 66:17 teach about eating swine?', category: 'doctrine' },
  { id: 'doc_08', message: 'What happens when we die according to the Bible?', category: 'doctrine' },
  { id: 'doc_09', message: 'Do souls go to heaven immediately at death?', category: 'doctrine' },
  { id: 'doc_10', message: 'How many heavens does the Bible mention?', category: 'doctrine' },
  { id: 'doc_11', message: 'Is the Logos in John 1 the same God as the Old Testament?', category: 'doctrine' },
  { id: 'doc_12', message: 'Is Jesus the God seen in the Old Testament?', category: 'doctrine' },
  { id: 'doc_13', message: 'Are the commandments still in effect?', category: 'doctrine' },
  { id: 'doc_14', message: 'What is clean and unclean food in Leviticus?', category: 'doctrine' },
  { id: 'doc_15', message: 'What are the biblical feast days in Leviticus 23?', category: 'doctrine' },
  { id: 'comp_01', message: 'I am grieving the loss of my friend.', category: 'companion' },
  { id: 'comp_02', message: 'I let go of someone I truly love and it hurts.', category: 'companion' },
  { id: 'comp_03', message: 'I feel afraid about the future.', category: 'companion' },
  { id: 'comp_04', message: 'I feel distant from God lately.', category: 'companion' },
  { id: 'comp_05', message: 'Caring for my mom with dementia is exhausting.', category: 'companion' },
  { id: 'comp_06', message: 'I need practical help deciding whether to take a job offer.', category: 'companion' },
  { id: 'gen_01', message: 'Help me plan my week around school and church.', category: 'general' },
  { id: 'gen_02', message: 'What should I do when I feel overwhelmed?', category: 'general' },
  { id: 'gen_03', message: 'Do you remember what we talked about last time?', category: 'general' },
  { id: 'gen_04', message: "You didn't answer my question about pork. Just answer yes or no.", category: 'correction', expectYesNo: true },
  { id: 'gen_05', message: "I didn't ask to pray. Answer the Bible question.", category: 'correction' },
  { id: 'gen_06', message: 'Why are you giving me the same study script?', category: 'correction' },
  { id: 'gen_07', message: 'Can you help with Ruth chapter 1 homework?', category: 'general' },
  { id: 'gen_08', message: 'Is Christmas biblical?', category: 'doctrine' },
  { id: 'gen_09', message: 'Should Christians keep Easter?', category: 'doctrine' },
  { id: 'gen_10', message: 'What does Jeremiah 10 say about trees and traditions?', category: 'doctrine' },
  { id: 'doc_16', message: 'Where does it say the seventh day is the Sabbath?', category: 'doctrine' },
  { id: 'doc_17', message: 'Does Daniel 9:27 change the Sabbath?', category: 'doctrine' },
  { id: 'doc_18', message: 'Can I eat shrimp?', category: 'doctrine', expectYesNo: true },
  { id: 'doc_19', message: 'Did Peter eat unclean animals in Acts 10?', category: 'doctrine' },
  { id: 'doc_20', message: 'What is the third heaven Paul mentions?', category: 'doctrine' },
  { id: 'comp_07', message: 'My knees hurt again today.', category: 'companion' },
  { id: 'comp_08', message: 'Please pray for my family.', category: 'companion' },
  { id: 'comp_09', message: 'I just want to talk for a minute. Listen first.', category: 'companion' },
  { id: 'comp_10', message: 'Why are you broken today?', category: 'companion' },
  { id: 'gen_11', message: 'What is the kingdom of God in Scripture?', category: 'doctrine' },
  { id: 'gen_12', message: 'Explain resurrection timeline from Scripture only.', category: 'doctrine' },
  { id: 'live_13', message: 'Can I eat pork according to Leviticus and Deuteronomy?', category: 'live_failed', expectYesNo: true },
  { id: 'live_14', message: 'How do we honor the Sabbath practically this week?', category: 'live_failed', forbidHistory: true },
  { id: 'live_15', message: 'You said traditions — I asked about heavens in the Bible.', category: 'correction' },
  { id: 'live_16', message: 'Where does the Bible say not to eat pork?', category: 'live_failed' },
  { id: 'live_17', message: 'Should I keep the Sabbath on Saturday?', category: 'doctrine', expectYesNo: true },
  { id: 'live_18', message: 'Can you look up third heaven in Scripture for me?', category: 'live_failed' },
];

function scoreDirectness(test, reply) {
  let s = 5;
  if (test.expectYesNo && hasYesNoLead(reply, test.message)) s = 10;
  else if (test.expectYesNo && /\b(yes|no)\b/i.test(reply.slice(0, 100))) s = 7;
  else if (test.expectYesNo) s = 2;
  if (STUDY.test(reply)) s = Math.min(s, 2);
  if (WITNESS.test(reply)) s = Math.min(s, 3);
  if (test.forbidHistory && HISTORY.test(reply) && !test.allowHistory) s = Math.min(s, 3);
  if (reply.length > 80 && !STUDY.test(reply)) s = Math.max(s, 6);
  return s;
}

function scoreBibleGrounding(reply) {
  if (/\b(genesis|exodus|leviticus|deuteronomy|isaiah|acts|john|matthew|corinthians|psalm)\b/i.test(reply)) return 8;
  if (/\bscripture\b/i.test(reply)) return 6;
  if (STUDY.test(reply)) return 2;
  return 4;
}

function scoreQuestionMatch(test, reply) {
  let s = 7;
  if (STUDY.test(reply)) s = 1;
  if (test.forbidHistory && HISTORY.test(reply) && !/history|constantine|rome/i.test(test.message)) s = 2;
  if (test.expectYesNo && !hasYesNoLead(reply, test.message)) s = 3;
  if (/search the bible directly/i.test(test.message) && STUDY.test(reply)) s = 1;
  return s;
}

function scoreOrganic(reply, dbg) {
  if (dbg.fallbackUsed) return 2;
  if (STUDY.test(reply) || WITNESS.test(reply)) return 3;
  if (dbg.openaiCalled && dbg.finalAnswerAuthor === 'openai') return 8;
  return 5;
}

function classifyFailure(test, reply, dbg) {
  const reasons = [];
  if (!dbg.openaiCalled) reasons.push('openai_not_called');
  if (dbg.fallbackUsed) reasons.push('fallback_author');
  if (dbg.studyLoopUsed || STUDY.test(reply)) reasons.push('study_continuation_author');
  if (dbg.scriptureWitnessTemplateUsed || WITNESS.test(reply)) reasons.push('scripture_witness_author');
  if (dbg.prayerTemplateUsed || PRAY.test(reply)) reasons.push('prayer_template_author');
  if (test.forbidHistory && HISTORY.test(reply) && !test.allowHistory) reasons.push('history_override');
  if (test.expectYesNo && !hasYesNoLead(reply, test.message)) reasons.push('not_direct_yes_no');
  if (scoreQuestionMatch(test, reply) <= 3) reasons.push('question_mismatch');
  return reasons;
}

function inferPrimaryBlame(reasons, dbg) {
  if (reasons.includes('fallback_author') || !dbg.openaiCalled) return 'personalizedFallback_or_connectionError';
  if (reasons.includes('study_continuation_author')) return 'personalizedFallback_or_learningProfile';
  if (reasons.includes('scripture_witness_author')) return 'openai_pasted_witness_or_template_path';
  if (reasons.includes('history_override')) return 'evidencePack_history_bleed_or_openai';
  if (reasons.includes('not_direct_yes_no')) return 'answerGuidance_weak_or_openai';
  if (reasons.includes('question_mismatch')) return 'openai_or_evidence_mismatch';
  return dbg.finalAnswerAuthor === 'openai' ? 'openai_quality' : 'unknown';
}

async function runOne(test, i) {
  const userId = `ownership-audit-${test.id}-${Date.now()}-${i}`;
  clearActiveConversation(userId);
  const s = await runBuddy({ userId, message: test.message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  const dbg = s.coreDebug || s.runtime?.coreDebug || {};
  const reply = String(s.reply || '');
  const danger = detectDangerousFallbackSpeaker(reply);
  const failReasons = classifyFailure(test, reply, { ...dbg, studyLoopUsed: dbg.studyLoopUsed || danger.studyLoopUsed });
  const wrong = failReasons.length > 0 || scoreQuestionMatch(test, reply) <= 4;

  return {
    id: test.id,
    category: test.category,
    message: test.message,
    openaiCalled: !!(dbg.openaiCalled ?? s.runtime?.openAiCalled),
    finalAnswerAuthor: dbg.finalAnswerAuthor || (dbg.openaiCalled ? 'openai' : 'unknown'),
    finalAnswerSource: dbg.responderUsed || s.runtime?.masterRoute,
    postOpenAIRewritten: !!(s.admin_flags || []).includes('dangerous_fallback_stripped') || !!s.runtime?.relationshipIntelligence,
    templateUsed: !!(dbg.templateUsed || danger.detected),
    fallbackUsed: !!dbg.fallbackUsed,
    studyLoopUsed: !!(dbg.studyLoopUsed || STUDY.test(reply)),
    scriptureWitnessTemplateUsed: !!(dbg.scriptureWitnessTemplateUsed || WITNESS.test(reply)),
    relationshipEnrichmentUsed: !!s.runtime?.relationshipIntelligence,
    doctrineResponderUsed: ['doctrine_general', 'sabbath_definition', 'sabbath_history', 'health_support'].includes(s.runtime?.masterRoute),
    answerDirectness: scoreDirectness(test, reply),
    bibleGrounding: scoreBibleGrounding(reply),
    currentQuestionMatch: scoreQuestionMatch(test, reply),
    organicCompanion: scoreOrganic(reply, dbg),
    wrongAnswer: wrong,
    failureReasons: failReasons,
    primaryBlameSystem: inferPrimaryBlame(failReasons, dbg),
    routeUsed: dbg.routeUsed || s.runtime?.masterRoute,
    replyPreview: reply.slice(0, 350),
  };
}

function buildSystemRanking(results) {
  const wrong = results.filter((r) => r.wrongAnswer);
  const totalWrong = wrong.length || 1;
  const counts = {};
  for (const r of wrong) {
    const sys = r.primaryBlameSystem;
    counts[sys] = counts[sys] || { triggered: 0, wrong: 0, override: 0 };
    counts[sys].wrong += 1;
    if (r.fallbackUsed || r.studyLoopUsed || r.doctrineResponderUsed) counts[sys].override += 1;
  }
  for (const r of results) {
    const sys = r.primaryBlameSystem;
    if (!counts[sys]) counts[sys] = { triggered: 0, wrong: 0, override: 0 };
    if (r.openaiCalled && sys.includes('openai')) counts[sys].triggered += 1;
    if (r.fallbackUsed) counts['personalizedFallback_or_connectionError'].triggered += 1;
    if (r.studyLoopUsed) counts['personalizedFallback_or_learningProfile'].triggered += 1;
  }
  return Object.entries(counts)
    .map(([system, c]) => ({
      system,
      timesTriggered: c.triggered || c.wrong,
      wrongAnswerCount: c.wrong,
      overrideCount: c.override,
      damagePercent: Math.round((c.wrong / totalWrong) * 1000) / 10,
      recommendation:
        system.includes('personalizedFallback')
          ? 'REMOVE from default path'
          : system.includes('witness')
            ? 'DEMOTE witness to evidence; block paste in validator'
            : system.includes('history')
              ? 'Tighten history gating in evidence pack'
              : system.includes('answerGuidance')
                ? 'Strengthen direct-answer composer rules'
                : 'Improve OpenAI prompt/evidence quality',
    }))
    .sort((a, b) => b.damagePercent - a.damagePercent);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required for ownership audit battery.');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const results = [];
  for (let i = 0; i < TESTS.length; i++) {
    const row = await runOne(TESTS[i], i);
    results.push(row);
    process.stdout.write(`[${row.wrongAnswer ? 'WRONG' : 'OK'}] ${row.id} author=${row.finalAnswerAuthor}\n`);
    await new Promise((r) => setTimeout(r, 350));
  }
  const ranking = buildSystemRanking(results);
  const payload = {
    ranAt: new Date().toISOString(),
    path: 'POST /buddy/chat → buddyBrain.runBuddy → openAiFirstCompanionRuntime',
    totalTests: results.length,
    wrongAnswers: results.filter((r) => r.wrongAnswer).length,
    openAiCalledRate: results.filter((r) => r.openaiCalled).length / results.length,
    systemRanking: ranking,
    tests: results,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  fs.writeFileSync(CLEANUP_OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Wrote ${CLEANUP_OUT}`);
  console.log(`Wrong ${payload.wrongAnswers}/${payload.totalTests}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
