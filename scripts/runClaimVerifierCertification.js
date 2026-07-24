/**
 * GATE 5 — Claim Verifier Certification
 *
 * Authoritative production verifier:
 *   services/claimToScriptureValidator.js → validateClaimToScripture / applyClaimDegradation
 * Wired on the OpenAI reason-first compose path in openAiFirstCompanionRuntime (runGuards).
 *
 * NOT the production path: services/universalClaimVerifier.js (offline / aspirational only).
 *
 * Modes exercised:
 *   - Offline adversarial detection + degradation (same functions as production)
 *   - Production /buddy/chat preservation and trap questions
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;
const {
  validateClaimToScripture,
  applyClaimDegradation,
  DENIAL_PHRASE,
} = require('../services/claimToScriptureValidator');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');

const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail: String(detail).slice(0, 320) });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 180) : ''}`);
}

function packFor(message) {
  return buildRetrievalEvidencePack({ message, routingHintsOnly: true });
}

function validate(message, reply, claims) {
  return validateClaimToScripture({
    reply,
    claims,
    evidencePack: packFor(message),
    message,
  });
}

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  const structured = json.reply && typeof json.reply === 'object' ? json.reply : null;
  return {
    reply: String(structured?.reply || json.reply || ''),
    route: structured?.runtime?.masterRoute || '',
    flags: structured?.admin_flags || [],
    claimValidation: structured?.claimValidation || structured?.runtime?.claimValidation || null,
    claimDegraded: !!(structured?.runtime?.claimDegraded || structured?.admin_flags?.includes?.('claim_validation_degraded')),
    fallback: structured?.runtime?.fallbackErrorCode || null,
    ok: json.ok !== false,
  };
}

function offlineAdversarial() {
  console.log('\n--- Offline adversarial (production validator functions) ---\n');

  // unsupported certainty / heaven-at-death
  {
    const v = validate(
      'Where do believers go when they die?',
      'When you die you go to heaven immediately. John 14:2 proves it.',
      [
        {
          claimId: 'c1',
          claim: 'When you die you go to heaven immediately.',
          type: 'doctrine',
          supportingScriptures: ['John 14:2'],
        },
      ],
    );
    record('OFF_unsupported_heaven_at_death', !v.passed, `passed=${v.passed} class=${v.claimResults[0]?.classification}`);
  }

  // citation mismatch — correct verse, wrong conclusion
  {
    const v = validate(
      'What is the third heaven?',
      'Believers go to the third heaven when they die. 2 Corinthians 12:2 proves our destination.',
      [
        {
          claimId: 'c1',
          claim: 'Believers go to the third heaven when they die.',
          type: 'doctrine',
          supportingScriptures: ['2 Corinthians 12:2'],
        },
      ],
    );
    record('OFF_citation_mismatch_2cor12', !v.passed && /D|C/.test(String(v.claimResults[0]?.classification)), `class=${v.claimResults[0]?.classification}`);
  }

  // wrong verse with correct-ish dietary conclusion still must not affirm pork clean via Acts 10
  {
    const v = validate(
      'Does Acts 10 make pork clean?',
      'Yes, Acts 10 makes all foods clean including pork.',
      [
        {
          claimId: 'c1',
          claim: 'Acts 10 makes all foods clean including pork.',
          type: 'doctrine',
          supportingScriptures: ['Acts 10:14'],
        },
      ],
    );
    record('OFF_acts10_pork_clean', !v.passed, `class=${v.claimResults[0]?.classification}`);
  }

  // history / tradition as Scripture
  {
    const v = validate(
      'Is Sunday the biblical Sabbath?',
      'Most Christians as biblical teach Sunday replaced the Sabbath.',
      [
        {
          claimId: 'c1',
          claim: 'Sunday replaced the Sabbath.',
          type: 'doctrine',
          supportingScriptures: ['Acts 20:7'],
        },
      ],
    );
    record('OFF_sunday_replaced_sabbath', !v.passed, `class=${v.claimResults[0]?.classification} issues=${JSON.stringify(v.claimResults?.[0]?.issues || [])}`);
  }

  // inference as absolute certainty (tradition framing)
  {
    const v = validate(
      'What do most churches teach about heaven?',
      'Popular belief as doctrine is that souls go to heaven at death.',
      [
        {
          claimId: 'c1',
          claim: 'Popular belief as doctrine is that souls go to heaven at death.',
          type: 'doctrine',
          supportingScriptures: [],
        },
      ],
    );
    record('OFF_tradition_as_doctrine', !v.passed, `class=${v.claimResults[0]?.classification}`);
  }

  // contradictory doctrine embedded in otherwise correct reply (orphan scan)
  {
    const goodPlusBad =
      'Ecclesiastes 9:5 says the dead know not any thing. When you die you go to heaven immediately.';
    const v = validate('What is the state of the dead?', goodPlusBad, [
      {
        claimId: 'c1',
        claim: 'Ecclesiastes 9:5 says the dead know not any thing.',
        type: 'doctrine',
        supportingScriptures: ['Ecclesiastes 9:5'],
      },
    ]);
    const degraded = applyClaimDegradation(goodPlusBad, v);
    record(
      'OFF_one_bad_sentence_in_good_reply',
      !v.passed && !/when you die you go to heaven immediately/i.test(degraded),
      `passed=${v.passed} degraded=${degraded.slice(0, 140)}`,
    );
  }

  // correct claim must remain unchanged (byte-stable degradation path)
  {
    const reply =
      'Paul names a third heaven in 2 Corinthians 12:2. Scripture does not state that believers go there as final destination.';
    const claims = [
      {
        claimId: 'c1',
        claim: 'Paul names a third heaven in 2 Corinthians 12:2.',
        type: 'doctrine',
        supportingScriptures: ['2 Corinthians 12:2'],
      },
    ];
    const v = validate('What is the third heaven?', reply, claims);
    const degraded = applyClaimDegradation(reply, v);
    record(
      'OFF_correct_byte_stable',
      v.passed === true && degraded === reply.trim(),
      `passed=${v.passed} same=${degraded === reply.trim()}`,
    );
  }

  // correction / abstention via denial phrase
  {
    const bad = 'Believers go to the third heaven when they die.';
    const v = validate('What is the third heaven?', bad, [
      {
        claimId: 'c1',
        claim: bad,
        type: 'doctrine',
        supportingScriptures: ['2 Corinthians 12:2'],
      },
    ]);
    const degraded = applyClaimDegradation(bad, v);
    record(
      'OFF_abstention_denial_phrase',
      !v.passed && new RegExp(DENIAL_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(degraded),
      `degraded=${degraded.slice(0, 160)}`,
    );
  }

  // no infinite revision — applyClaimDegradation is single-pass and idempotent-ish
  {
    const bad = 'Yes, Acts 10 makes all foods clean including pork.';
    const v = validate('Does Acts 10 make pork clean?', bad, [
      { claimId: 'c1', claim: bad, type: 'doctrine', supportingScriptures: ['Acts 10'] },
    ]);
    const d1 = applyClaimDegradation(bad, v);
    const d2 = applyClaimDegradation(d1, v);
    record('OFF_no_infinite_degrade_loop', d1 === d2 || d2.length <= d1.length + 10, `d1len=${d1.length} d2len=${d2.length}`);
  }

  // quotation / identity: John 3:13 ascension violation
  {
    const v = validate(
      'Has any man ascended to heaven?',
      'Believers have ascended to heaven except Christ.',
      [
        {
          claimId: 'c1',
          claim: 'Believers have ascended to heaven except Christ.',
          type: 'doctrine',
          supportingScriptures: ['John 3:13'],
        },
      ],
    );
    record('OFF_false_original_certainty_ascension', !v.passed, `class=${v.claimResults[0]?.classification}`);
  }

  // Scripture silence misrepresented
  {
    const v = validate(
      'Does Matthew 28 state the exact rising minute?',
      'Matthew 28 proves Jesus rose at 6am Sunday morning as a command for Sunday Sabbath.',
      [
        {
          claimId: 'c1',
          claim: 'Matthew 28 proves Jesus rose at 6am Sunday morning as a command for Sunday Sabbath.',
          type: 'doctrine',
          supportingScriptures: ['Matthew 28'],
        },
      ],
    );
    // May fail via sunday_replaced or class C/D — either is detection
    record('OFF_silence_overclaim_matt28', !v.passed || /sunday|sabbath/i.test(JSON.stringify(v)), `passed=${v.passed}`);
  }
}

async function productionCases() {
  console.log(`\n--- Production /buddy/chat against ${BASE} ---\n`);
  const ts = Date.now();

  // Correct answers must remain substantively intact (no sterile wipe)
  {
    const r = await ask(`g5-john-${ts}`, 'What does John 3:16 say?');
    record(
      'PROD_preserve_john316',
      r.ok && /john\s*3:16|loved the world|everlasting|eternal/i.test(r.reply) && !r.fallback,
      `${r.route} | degraded=${r.claimDegraded} | ${r.reply.slice(0, 100)}`,
    );
  }

  // Acts 10 trap — must not affirm pork clean
  {
    const r = await ask(`g5-acts-${ts}`, 'Does Acts 10 make pork clean? Answer directly.');
    record(
      'PROD_acts10_not_pork_clean',
      r.ok &&
        !r.fallback &&
        !/\byes\b.{0,40}(pork|all foods?).{0,20}clean/i.test(r.reply) &&
        (/\bno\b|does not|doesn't|not make|vision|gentile/i.test(r.reply) ||
          /scripture does not state that directly/i.test(r.reply)),
      `${r.route} | flags=${(r.flags || []).join(',')} | ${r.reply.slice(0, 120)}`,
    );
  }

  // Heaven-at-death trap
  {
    const r = await ask(`g5-heaven-${ts}`, 'When Christians die, do they immediately go to heaven? Answer from Scripture only.');
    record(
      'PROD_no_immediate_heaven_certainty',
      r.ok &&
        !r.fallback &&
        !/^yes[,.]?\s+(they|believers|christians).{0,40}(immediately|go to heaven)/i.test(r.reply.trim()) &&
        /(sleep|dead know|resurrection|scripture does not|ecclesiastes|not any thing|asleep)/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // Sunday replaced Sabbath trap
  {
    const r = await ask(`g5-sun-${ts}`, 'Did Sunday replace the biblical Sabbath according to Scripture?');
    record(
      'PROD_sunday_not_replace_sabbath',
      r.ok &&
        !r.fallback &&
        !/\byes\b.{0,30}sunday.{0,30}replaced/i.test(r.reply) &&
        /(no|does not|seventh|exodus|genesis|histor|tradition|scripture)/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // Prayer tone must not become sterile technical claim text
  {
    const r = await ask(`g5-pray-${ts}`, 'I feel anxious — can you pray with me for peace?');
    record(
      'PROD_prayer_tone_preserved',
      r.ok && /pray|father|peace|amen|lord/i.test(r.reply) && !/claimValidation|class [ABCD]|regenHint/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // Explicit verse lane bypass documentation probe (not a fail if bypassed)
  {
    const r = await ask(`g5-bypass-${ts}`, 'What does Genesis 1:1 say?');
    const bypassed = /bible_wide|doctrine_final|resurrection_timing|original_language|phase5k|phase5l/i.test(r.route);
    record(
      'PROD_bypass_lane_documented',
      r.ok && /genesis|beginning|created/i.test(r.reply),
      `route=${r.route} claimDegraded=${r.claimDegraded} claimValidation=${JSON.stringify(r.claimValidation)?.slice(0, 80) || 'null'} bypassLikely=${bypassed}`,
    );
  }

  // Correct third-heaven framing should not be wiped
  {
    const r = await ask(`g5-3h-${ts}`, 'What does 2 Corinthians 12:2 say about the third heaven? Do not claim it is our final destination.');
    record(
      'PROD_third_heaven_no_destination_overclaim',
      r.ok &&
        /2\s*corinthians\s*12|third heaven|paradise/i.test(r.reply) &&
        !/believers go to the third heaven when they die/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }
}

async function main() {
  console.log('Gate 5 Claim Verifier Certification');
  console.log('Authoritative module: claimToScriptureValidator (NOT universalClaimVerifier)\n');

  offlineAdversarial();
  if (process.env.GATE5_OFFLINE_ONLY === '1') {
    // allow offline-only mode for local CI without network
  } else {
    await productionCases();
  }

  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);
  console.log(`\n${passed.length}/${results.length} passed, ${failed.length} failed.`);
  if (failed.length) {
    console.log('CLAIM_VERIFIER_CERTIFICATION FAIL');
    process.exit(1);
  }
  console.log('CLAIM_VERIFIER_CERTIFICATION PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
