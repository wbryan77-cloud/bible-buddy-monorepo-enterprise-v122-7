/**
 * Product Sprint D — explicit structured Scripture study (VLP-backed).
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const {
  detectExplicitStructuredStudyIntent,
  packetUsableForStructuredStudy,
  renderUserFacingStructuredStudy,
  buildVerifiedLessonPacket,
  assembleLessonFromStudyChain,
} = require('../services/lessonEngine');
const {
  attachVerifiedLessonPacketToEvidencePack,
  tryBuildStructuredStudyReply,
} = require('../services/openAiFirstCompanionRuntime');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { detectHumanNeed } = require('../services/humanNeedDetector');
const { getArticle } = require('../services/helpCenterContentStore');

describe('Sprint D structured Scripture study', () => {
  it('detects explicit study intents and rejects ordinary / protected asks', () => {
    assert.equal(detectExplicitStructuredStudyIntent('Help me study forgiveness'), true);
    assert.equal(detectExplicitStructuredStudyIntent('Give me a Bible study on the Sabbath'), true);
    assert.equal(detectExplicitStructuredStudyIntent('Let’s study prayer in Scripture'), true);
    assert.equal(detectExplicitStructuredStudyIntent('Can we study forgiveness together?'), true);
    assert.equal(detectExplicitStructuredStudyIntent('Show me a study about faith.'), true);
    assert.equal(detectExplicitStructuredStudyIntent('Walk me through the Bible on grace.'), true);
    assert.equal(detectExplicitStructuredStudyIntent('What is the Sabbath?'), false);
    assert.equal(detectExplicitStructuredStudyIntent('What does the Bible say about forgiveness?'), false);
    assert.equal(detectExplicitStructuredStudyIntent('Explain forgiveness.'), false);
    assert.equal(detectExplicitStructuredStudyIntent('I want to understand resurrection more deeply.'), false);
    assert.equal(detectExplicitStructuredStudyIntent('I lost my friend'), false);
    assert.equal(detectExplicitStructuredStudyIntent('Pray for me'), false);
    assert.equal(detectExplicitStructuredStudyIntent('My knees hurt'), false);
    assert.equal(detectHumanNeed('I lost my friend'), 'emotional_support');
    assert.equal(detectHumanNeed('My knees hurt'), 'health_support');
  });

  it('seed enrichment activates study for common topics outside doctrine catalog', async () => {
    const message = 'Help me study forgiveness.';
    const pack = buildRetrievalEvidencePack({
      userId: 'sprint-d-forgiveness',
      message,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    await attachVerifiedLessonPacketToEvidencePack(pack, message);
    // Catalog usually has no forgiveness chain → attach may be empty.
    const study = await tryBuildStructuredStudyReply(pack, message);
    assert.equal(study.ok, true, JSON.stringify(study));
    assert.match(study.reply, /^Forgiveness\s*$/im);
    assert.doesNotMatch(study.reply, /Study theme:/i);
    assert.match(study.reply, /Matthew 6:14/i);
    assert.ok((study.scripture || []).length >= 3);
    assert.doesNotMatch(study.reply, /roles:|contribute to studying/i);
    assert.doesNotMatch(study.reply, /States a command or required practice/i);
    assert.doesNotMatch(study.reply, /Helps define the subject at/i);
    assert.doesNotMatch(study.reply, /historicalEvidenceLayer/i);
    assert.match(study.reply, /How these passages connect/i);
    assert.doesNotMatch(study.reply, /resurrection_timeline_resurrection/i);
    // KJV integrity
    const { getLocalPassage } = require('../services/localKjvCorpusProvider');
    for (const s of study.scripture) {
      const local = getLocalPassage(s.reference);
      assert.equal(local.ok, true, s.reference);
      assert.equal(String(local.text).replace(/\s+/g, ' ').trim(), String(s.text).replace(/\s+/g, ' ').trim());
    }
  });

  it('user-facing renderer quotes KJV blocks and hides Admin jargon', () => {
    const packet = {
      topic: { lessonTitle: 'Forgiveness', normalizedTopic: 'forgiveness' },
      lesson: { lessonSummary: 'Scripture calls us to forgive as we have been forgiven.', lessonId: 'lesson_test' },
      scriptureBlocks: [
        {
          reference: 'Matthew 6:14',
          displayReference: 'Matthew 6:14',
          text: 'For if ye forgive men their trespasses, your heavenly Father will also forgive you:',
          roleExplanation: 'Command concerning forgiveness.',
        },
      ],
      connections: [{ sentence: 'Matthew 6:14 states the forgiveness command plainly.' }],
      historicalEvidence: [],
      languageEvidence: [],
      doctrineStatus: 'NEEDS_ADMIN_REVIEW',
      governanceStatus: 'CANDIDATE_ONLY',
    };
    const md = renderUserFacingStructuredStudy({}, packet, 'Help me study forgiveness');
    assert.match(md, /^Forgiveness\s*$/im);
    assert.match(md, /Matthew 6:14/);
    assert.match(md, /For if ye forgive men/);
    assert.match(md, /King James/);
    assert.doesNotMatch(md, /NEEDS_ADMIN_REVIEW/);
    assert.doesNotMatch(md, /CANDIDATE_ONLY/);
    assert.doesNotMatch(md, /Verified Lesson Packet/i);
    assert.doesNotMatch(md, /productionActivation/);
  });

  it('explicit study activates structured reply when packet has Scripture', async () => {
    const message = 'Help me study the Sabbath';
    const pack = buildRetrievalEvidencePack({
      userId: 'sprint-d-study',
      message,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    await attachVerifiedLessonPacketToEvidencePack(pack, message);
    assert.ok(pack.verifiedLessonPacket, 'packet attached');
    // Default attach remains inactive until study path activates.
    assert.equal(pack.verifiedLessonPacket.productionActivation, false);

    const study = await tryBuildStructuredStudyReply(pack, message);
    if (!packetUsableForStructuredStudy(pack.verifiedLessonPacket)) {
      assert.ok(study === null || study.fallback === true);
      return;
    }
    assert.equal(study.ok, true);
    assert.match(study.reply, /^The Sabbath\s*$/im);
    assert.match(study.reply, /Key passages/i);
    assert.doesNotMatch(study.reply, /roles:|contribute to studying/i);
    assert.doesNotMatch(study.reply, /States a command or required practice/i);
    assert.doesNotMatch(study.reply, /historicalEvidenceLayer/i);
    assert.ok((study.scripture || []).length >= 1);
    assert.equal(study.runtime.masterRoute, 'structured_scripture_study');
    assert.equal(study.runtime.verifiedLessonPacketActivated, true);
    assert.equal(pack.verifiedLessonPacket.productionActivation, true);
    assert.equal(study.runtime.openAiCalled, false);
    // No invented doctrine promotion language
    assert.doesNotMatch(study.reply, /conclusively proved/i);
  });

  it('ordinary Scripture question does not take structured-study early return', async () => {
    const message = 'What is the Sabbath?';
    const pack = buildRetrievalEvidencePack({
      userId: 'sprint-d-ordinary',
      message,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    await attachVerifiedLessonPacketToEvidencePack(pack, message);
    const study = await tryBuildStructuredStudyReply(pack, message);
    assert.equal(study, null);
    assert.equal(pack.verifiedLessonPacket?.productionActivation, false);
  });

  it('grief and prayer stay out of structured study', async () => {
    for (const message of ['I lost my friend', 'Pray for me about my job']) {
      const pack = buildRetrievalEvidencePack({
        userId: 'sprint-d-protected',
        message: 'Help me study forgiveness', // pack build
        mode: 'companion',
        recentSessions: [],
        runtimeContext: {},
        profile: {},
        safety: {},
        routingHintsOnly: true,
      });
      await attachVerifiedLessonPacketToEvidencePack(pack, 'Help me study forgiveness');
      const study = await tryBuildStructuredStudyReply(pack, message);
      assert.equal(study, null, `protected should not study: ${message}`);
    }
  });

  it('Help documents structured study without overclaim', () => {
    const article = getArticle('how-do-i-get-a-bible-study');
    assert.ok(article, 'study help article present');
    assert.match(article.body, /Help me study/i);
    assert.match(article.body, /conversational/i);
    assert.doesNotMatch(article.body, /every answer is a structured lesson/i);
    assert.doesNotMatch(article.body, /Verified Lesson Packet/i);
  });

  it('Study CTA uses explicit structured-study phrasing', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert.match(html, /onclick="quickAsk\('Help me study grace\.'\)"/);
    assert.doesNotMatch(html, /study the Bible more deeply/i);
  });

  it('packetUsable rejects empty / blocked packets', () => {
    assert.equal(packetUsableForStructuredStudy(null), false);
    assert.equal(
      packetUsableForStructuredStudy({
        lesson: { teachingReadiness: 'BLOCKED_OR_REJECTED' },
        scriptureBlocks: [{ reference: 'John 3:16', text: 'For God so loved the world...' }],
      }),
      false,
    );
    assert.equal(
      packetUsableForStructuredStudy({
        lesson: { teachingReadiness: 'FOCUSED_STUDY_REVIEW' },
        scriptureBlocks: [{ reference: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son.' }],
      }),
      true,
    );
  });
});
