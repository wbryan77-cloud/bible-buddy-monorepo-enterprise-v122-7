#!/usr/bin/env node
/**
 * Phase 1 + 1A validation — Evidence Cards, Doctrine Freeze, Concordance Foundation, Discovery.
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { getAllApprovedCards, retrieveEvidenceCards } = require('../services/evidenceCards');
const {
  loadApprovedDoctrineRegistry,
  getApprovedTopics,
  assertNoAutomaticCardMutation,
  isForbiddenGapPrompt,
} = require('../services/approvedDoctrineRegistry');
const { loadConcordancePlan, enrichCardsWithConcordance } = require('../services/concordanceFoundation');
const { discoverScriptureRelationships } = require('../services/scriptureDiscoveryEngine');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase1-bible-learning-validation.json');

const CHECKS = [];

function check(name, pass, detail = '') {
  CHECKS.push({ name, pass: !!pass, detail });
  console.log(`[${pass ? 'OK' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function testRegistry() {
  const reg = loadApprovedDoctrineRegistry();
  check('approved_doctrine_registry_loads', !!reg.freezePolicy);
  check('freeze_blocks_auto_conclusion_change', reg.freezePolicy.discoveryMayNotAlterBibleFirstConclusionAutomatically === true);
  check('openai_authorship_protected', reg.openAiAuthorshipProtection.finalAnswerAuthor === 'openai');
  check('approved_topic_count', getApprovedTopics().length >= 10, `count=${getApprovedTopics().length}`);
}

function testFreezeGuards() {
  let blocked = false;
  try {
    assertNoAutomaticCardMutation({ proposedChanges: { alterBibleFirstConclusion: true } });
  } catch (e) {
    blocked = /freeze/i.test(e.message);
  }
  check('freeze_blocks_auto_conclusion_mutation', blocked);

  let gapBlocked = false;
  try {
    assertNoAutomaticCardMutation({
      cards: [],
      reinforcement: [{ summary: 'Should this doctrine be removed?', autoApplied: false }],
    });
  } catch (e) {
    gapBlocked = true;
  }
  check('freeze_blocks_forbidden_gap_prompt', gapBlocked);
  check('forbidden_gap_prompt_detect', isForbiddenGapPrompt('Should this doctrine be reconsidered?'));
}

function testEvidenceCards() {
  const cards = getAllApprovedCards();
  check('evidence_card_count', cards.length === 8, `count=${cards.length}`);
  check('all_cards_approved_frozen', cards.every((c) => c.status === 'approved_frozen' && c.approved));
  check('all_cards_have_bible_first_conclusion', cards.every((c) => c.bibleFirstConclusion?.length > 20));

  const pork = retrieveEvidenceCards({ topic: 'dietary_law', message: 'Can I eat pork?' });
  check('dietary_card_retrieval', pork.length >= 1 && pork[0].cardId === 'dietaryLaw');
  const sabbath = retrieveEvidenceCards({ message: 'How do we keep the Sabbath holy?' });
  check('sabbath_card_retrieval', sabbath.some((c) => c.cardId === 'sabbath'));
}

function testConcordanceFoundation() {
  const plan = loadConcordancePlan();
  check('concordance_plan_loads', plan.status === 'approved_foundation');
  check('concordance_seed_entries', (plan.seedEntries || []).length >= 4);
  check('concordance_may_not_author_prose', plan.engineCapabilities.mayNot.includes('author_final_prose'));

  const cards = retrieveEvidenceCards({ topic: 'sabbath', message: 'Sabbath' });
  const support = enrichCardsWithConcordance(cards);
  check('concordance_enrichment', support.length >= 1);
  check('concordance_not_auto_applied', support.every((s) => s.autoApplied === false));
}

function testDiscovery() {
  const cards = retrieveEvidenceCards({ message: 'Can I eat pork? Acts 10 and Isaiah 66:17' });
  const reinforcement = discoverScriptureRelationships(cards);
  check('discovery_reinforcement', reinforcement.length >= 1);
  check('reinforcement_has_confidence', reinforcement.every((r) => typeof r.confidenceScore === 'number'));
  check('reinforcement_review_not_auto', reinforcement.every((r) => r.autoApplied === false));
  check('reinforcement_schema', reinforcement.every((r) => r.topic && 'timestamp' in r));

  const sample = reinforcement[0];
  check(
    'reinforcement_finding_shape',
    sample &&
      'supportingScripturesFound' in sample &&
      'concordanceSupportFound' in sample &&
      'originalLanguageSupportFound' in sample &&
      'continuityChainFound' in sample
  );
}

function testEvidencePackIntegration() {
  const pack = buildRetrievalEvidencePack({
    userId: 'phase1-validation',
    message: 'How many heavens are in the Bible?',
    mode: 'COMPANION',
    recentSessions: [],
    runtimeContext: {},
    profile: {},
    safety: { level: 'standard' },
    routingHintsOnly: true,
  });
  check('pack_has_evidence_cards', !!(pack.evidenceCards?.cards?.length));
  check('pack_has_discovery', Array.isArray(pack.discoveryReinforcement));
  check('pack_cards_authorship_evidence_only', pack.evidenceCards?.authorship === 'evidence_only_not_final_prose');
  check('pack_doctrine_snippets_retained', Array.isArray(pack.doctrine?.snippets));
}

function testJsonArtifacts() {
  const base = path.join(__dirname, '..', 'docs', 'bible-learning');
  for (const file of [
    'approved-doctrine-registry.json',
    'concordance-index-plan.json',
    'scripture-continuity-sample.json',
    'original-language-chain-sample.json',
  ]) {
    const p = path.join(base, file);
    check(`artifact_${file}`, fs.existsSync(p));
    if (fs.existsSync(p)) JSON.parse(fs.readFileSync(p, 'utf8'));
  }
}

async function testLiveSmoke() {
  if (!process.env.OPENAI_API_KEY) {
    check('live_smoke_skipped', true, 'no OPENAI_API_KEY');
    return;
  }
  const { runBuddy } = require('../services/buddyBrain');
  const { clearActiveConversation } = require('../services/activeConversationManager');
  const samples = [
    'Can I eat pork? Yes or no?',
    'How do we keep the Sabbath holy?',
    'How many heavens are talked about in the Bible?',
  ];
  for (const message of samples) {
    const userId = `phase1-smoke-${Date.now()}`;
    clearActiveConversation(userId);
    const s = await runBuddy({ userId, message, mode: 'COMPANION' });
    const dbg = s.coreDebug || s.runtime?.coreDebug || {};
    check(`smoke_openai_${message.slice(0, 20)}`, dbg.openaiCalled === true);
    check(`smoke_evidence_cards_${message.slice(0, 12)}`, dbg.evidenceCardsUsed === true);
    check(`smoke_author_openai_${message.slice(0, 12)}`, dbg.finalAnswerAuthor === 'openai');
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function main() {
  testJsonArtifacts();
  testRegistry();
  testFreezeGuards();
  testEvidenceCards();
  testConcordanceFoundation();
  testDiscovery();
  testEvidencePackIntegration();
  await testLiveSmoke();

  const failed = CHECKS.filter((c) => !c.pass);
  const payload = {
    ranAt: new Date().toISOString(),
    phase: '1+1A',
    totalChecks: CHECKS.length,
    passed: CHECKS.length - failed.length,
    failed: failed.length,
    allPassed: failed.length === 0,
    checks: CHECKS,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(`Passed ${payload.passed}/${payload.totalChecks}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
