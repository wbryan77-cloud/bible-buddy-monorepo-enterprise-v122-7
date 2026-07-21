'use strict';

/**
 * PHASE 6F PART 4 — Original-Language Completion Verification
 *
 * Verifies that the approved original-language datasets (OSHB Hebrew/Aramaic,
 * Nestle 1904 Greek + Strong's) resolve real, non-fabricated token-level data
 * for the primary witnesses of the highest-priority production doctrine topics,
 * and that ordinary user phrasing reaches the same data through the live
 * orchestrator (bibleCompanionOrchestrator -> originalLanguageProvider).
 *
 * This script does NOT generate, infer, or alter any lemma, morphology, or
 * gloss. It only calls the existing governed provider and records what it
 * returns.
 */

const path = require('path');
const fs = require('fs');

const { getPassageStudy } = require('../../services/originalLanguageProvider');
const { runBuddy } = require('../../services/buddyBrain');

const HIGH_PRIORITY_TOPICS = [
  { topic: 'acts_10', reference: 'Acts 10:28', userMessage: 'What is the original Greek word for common or unclean in Acts 10:28?' },
  { topic: 'david', reference: '2 Samuel 7:12-16', userMessage: 'What is the original Hebrew in 2 Samuel 7:12?' },
  { topic: 'holy_spirit', reference: 'John 14:16-17', userMessage: 'What is the Greek word for Comforter in John 14:16?' },
  { topic: 'resurrection', reference: 'John 11:25', userMessage: 'What is the Greek word for resurrection in John 11:25?' },
  { topic: 'ten_commandments', reference: 'Exodus 20:3', userMessage: 'What is the Hebrew behind Exodus 20:3?' },
  { topic: 'heavens', reference: 'Isaiah 66:1', userMessage: 'What is the Hebrew word for heaven in Isaiah 66:1?' },
  { topic: 'sabbath', reference: 'Exodus 20:8', userMessage: 'What is the Hebrew word for Sabbath in Exodus 20:8?' },
  { topic: 'death_state', reference: 'Daniel 12:2', userMessage: 'What is the Hebrew word for sleep in Daniel 12:2?' },
  { topic: 'love_agape', reference: 'John 3:16', userMessage: 'What is the original Greek word for love in John 3:16?' },
  { topic: 'grace', reference: 'Ephesians 2:8', userMessage: 'What is the Greek word for grace in Ephesians 2:8?' },
];

async function main() {
  const results = [];

  for (const item of HIGH_PRIORITY_TOPICS) {
    const providerResult = await getPassageStudy({ reference: item.reference });
    const providerOk = !!(providerResult && providerResult.ok && Array.isArray(providerResult.tokens) && providerResult.tokens.length > 0);

    let liveOk = false;
    let liveReplySnippet = null;
    let liveError = null;
    try {
      const uid = `phase6f-ol-${item.topic}-${Date.now()}`;
      const res = await runBuddy({
        message: item.userMessage,
        userId: uid,
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
      });
      const reply = res && (res.reply && res.reply.reply ? res.reply.reply : res.reply);
      const fullReply = String(reply || '');
      liveReplySnippet = fullReply.slice(0, 220);
      liveOk = /original language \((GREEK|HEBREW)\)/i.test(fullReply) || (res && res.masterRoute === 'original_language_study');
    } catch (err) {
      liveError = err && err.message ? err.message : String(err);
    }

    results.push({
      topic: item.topic,
      reference: item.reference,
      userMessage: item.userMessage,
      providerOk,
      sourceLanguage: providerResult ? providerResult.sourceLanguage : null,
      tokenCount: providerResult && providerResult.tokens ? providerResult.tokens.length : 0,
      sourceDataset: providerResult && providerResult.tokens && providerResult.tokens[0] ? providerResult.tokens[0].sourceDataset : null,
      providerError: providerResult && !providerResult.ok ? providerResult.error : null,
      liveOk,
      liveReplySnippet,
      liveError,
    });
  }

  const allProviderOk = results.every((r) => r.providerOk);
  const allLiveOk = results.every((r) => r.liveOk);

  const outDir = path.join(__dirname, '..', '..', 'docs', 'alpha');
  const dirs = fs.readdirSync(outDir).filter((d) => d.startsWith('phase6f-'));
  const latestDir = dirs.sort().pop();
  const targetDir = latestDir ? path.join(outDir, latestDir) : outDir;

  const report = {
    generatedAt: new Date().toISOString(),
    topicsTested: results.length,
    allProviderOk,
    allLiveOk,
    results,
  };

  fs.writeFileSync(path.join(targetDir, 'Part4-OriginalLanguageCompletion.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ allProviderOk, allLiveOk, count: results.length }, null, 2));
  results.forEach((r) => {
    console.log(`${r.topic}: provider=${r.providerOk} (${r.sourceLanguage}, ${r.tokenCount} tokens) live=${r.liveOk}`);
  });
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
