/**
 * Founder Alpha mobile UX + onboarding + quality remediation tests.
 * Run: node --test tests/alphaFounderMobileUxRemediation.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');

describe('alpha founder mobile UX remediation', () => {
  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (
        /humanNeedDetector|practicalWisdom|practicalGuidance|prayerCompanion|userAssistance|helpCenter|lessonEngine|adminAuth/.test(
          key,
        )
      ) {
        delete require.cache[key];
      }
    }
  });

  it('public product HTML: no Admin chrome; no capability pills; Help modal lock class', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /id="adminConsoleLink"/);
    assert.doesNotMatch(html, /Genesis-to-Revelation reasoning/);
    assert.match(html, /id="alphaOverlay"/);
    assert.match(html, /Preferred name/);
    assert.match(html, /body\.help-open/);
    assert.match(html, /founderPreviewSection/);
    assert.match(html, /futureFeaturesPanel/);
    assert.match(html, /bb_alpha_tester_id/);
  });

  it('Alpha invite alone does not satisfy Admin auth', () => {
    const prev = process.env.BIBLE_AUTHORITY_ADMIN_TOKEN;
    process.env.BIBLE_AUTHORITY_ADMIN_TOKEN = 'real-admin-secret-token';
    try {
      const { checkAdminAuth } = require('../services/adminAuthMiddleware');
      let status = 0;
      let body = null;
      const res = {
        status(code) {
          status = code;
          return this;
        },
        json(payload) {
          body = payload;
          return this;
        },
      };
      const ok = checkAdminAuth(
        { headers: { authorization: 'Bearer alpha-invite-token-xyz' }, query: {} },
        res,
      );
      assert.equal(ok, false);
      assert.equal(status, 401);
      assert.equal(body.ok, false);
      const okAdmin = checkAdminAuth(
        { headers: { authorization: 'Bearer real-admin-secret-token' }, query: {} },
        { status() { return this; }, json() { return this; } },
      );
      assert.equal(okAdmin, true);
    } finally {
      if (prev == null) delete process.env.BIBLE_AUTHORITY_ADMIN_TOKEN;
      else process.env.BIBLE_AUTHORITY_ADMIN_TOKEN = prev;
    }
  });

  it('explicit biblical / sexual morality asks are not open_life', () => {
    const { detectHumanNeed, isSexualMoralityAsk, isExplicitBiblicalPositionAsk } = require('../services/humanNeedDetector');
    assert.equal(isSexualMoralityAsk('Should I have sex with her'), true);
    assert.equal(isExplicitBiblicalPositionAsk('But biblical should I have sex with her'), true);
    assert.notEqual(detectHumanNeed('Should I have sex with her'), 'open_life');
    assert.equal(detectHumanNeed('Should I have sex with her'), 'doctrine_answer');
    assert.equal(detectHumanNeed('But biblical should I have sex with her'), 'doctrine_answer');
    assert.equal(detectHumanNeed('Should I quit my job?'), 'open_life');
  });

  it('Help: feedback vs human contact vs phone', () => {
    const { askUserAssistance } = require('../services/userAssistanceAssistant');
    const fb = askUserAssistance({ question: 'How do I give feedback?' });
    assert.equal(fb.answered, true);
    assert.match(String(fb.answer), /Helpful|Not helpful/i);

    const human = askUserAssistance({ question: 'How can I get in touch with a physical person?' });
    assert.equal(human.answered, true);
    assert.match(String(human.answer), /does not offer phone|no phone number|Founder\/Admin/i);
    assert.doesNotMatch(String(human.answer), /call 1-|555-/);

    const phone = askUserAssistance({ question: 'Can I get Customer Service on the phone?' });
    assert.equal(phone.answered, true);
    assert.match(String(phone.answer), /does not offer phone|no phone number/i);
  });

  it('grace prayer context recovers from conversation memory', () => {
    const { saveContinuationMemory } = require('../services/conversationContinuationMemory');
    const { resolvePrayerFocus } = require('../services/prayerCompanionEngine');
    const userId = 'prayer-grace-' + Date.now();
    saveContinuationMemory(userId, {
      message: "I've been thinking about grace lately. What does the Bible say about it?",
      answer: { reply: 'Grace is God\'s gift…', scripture: [] },
      humanNeed: 'conversation',
      route: 'bible_concept',
    });
    // Stash doctrine topic into continuation for recovery
    const state = require('../services/doctrineConversationState').getDoctrineConversationState(userId);
    require('../services/doctrineConversationState').updateDoctrineConversationState(userId, {
      conversationMemory: {
        ...(state.conversationMemory || {}),
        lastDoctrineTopic: 'grace',
        lastUserMessage: 'thinking about grace',
        lastReplySummary: 'Grace is…',
      },
    });
    const focus = resolvePrayerFocus({
      message: 'Would you pray with me about that?',
      userId,
      anchor: {},
    });
    assert.match(String(focus.focus), /grace/i);
  });

  it('revision sequence: warmer / professional / final produce distinct copyable drafts', () => {
    const { buildPracticalWisdomResponse } = require('../services/practicalWisdomEngine');
    const state = {
      conversationMemory: {
        lastReply:
          'Here is a text you can copy and send:\n\nI care about you, and I want to be honest. Faith matters.',
      },
    };
    const warm = buildPracticalWisdomResponse({
      message: 'Make that text warmer, more human, and mention the massage and my faith.',
      state,
    });
    assert.match(warm.reply, /massage|faith|respect/i);
    assert.match(warm.reply, /Here is a text/i);

    const nextState = {
      conversationMemory: { lastReply: warm.reply },
    };
    const pro = buildPracticalWisdomResponse({
      message: 'Make it more professional',
      state: nextState,
    });
    assert.match(pro.reply, /clear and respectful|boundary I need/i);
    assert.notEqual(pro.reply, warm.reply);

    const finalState = { conversationMemory: { lastReply: pro.reply } };
    const fin = buildPracticalWisdomResponse({
      message: 'Now give me the final text I can copy and paste to her.',
      state: finalState,
    });
    assert.match(fin.reply, /Here is a text you can copy/i);
    assert.doesNotMatch(fin.reply, /Staying with Scripture/i);
  });

  it('structured study renderer prefers shorter when option set', () => {
    const { renderUserFacingStructuredStudy } = require('../services/lessonEngine');
    const packet = {
      topic: { normalizedTopic: 'grace' },
      scriptureBlocks: [
        { reference: 'Ephesians 2:8', displayReference: 'Ephesians 2:8', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
        { reference: 'Romans 3:24', displayReference: 'Romans 3:24', text: 'Being justified freely by his grace through the redemption that is in Christ Jesus:' },
        { reference: 'Titus 2:11', displayReference: 'Titus 2:11', text: 'For the grace of God that bringeth salvation hath appeared to all men,' },
        { reference: 'John 1:17', displayReference: 'John 1:17', text: 'For the law was given by Moses, but grace and truth came by Jesus Christ.' },
      ],
      connections: [{ sentence: 'These passages show grace as gift, not wage.' }],
      historicalEvidence: [{ note: 'Should be omitted when shorter' }],
    };
    const short = renderUserFacingStructuredStudy({}, packet, 'Help me study grace.', { preferShorter: true });
    assert.match(short, /^Grace/m);
    assert.match(short, /What Scripture shows/);
    assert.match(short, /1\. Ephesians/);
    assert.doesNotMatch(short, /Historical context/);
    assert.ok((short.match(/^\d+\./gm) || []).length <= 3);
  });
});
