#!/usr/bin/env node
/**
 * Offline claim validator fixtures — no OpenAI required.
 */
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture } = require('../services/claimToScriptureValidator');

const FIXTURES = [
  {
    id: 'f_third_heaven_bad',
    message: 'What is the third heaven?',
    reply: 'Believers go to the third heaven when they die. 2 Corinthians 12:2 proves our destination.',
    claims: [
      { claimId: 'c1', claim: 'Believers go to the third heaven when they die.', type: 'doctrine', supportingScriptures: ['2 Corinthians 12:2'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_kingdom_heaven_bad',
    message: 'What is the kingdom of God?',
    reply: 'The kingdom is in heaven where believers go after death. Matthew 6:10.',
    claims: [
      { claimId: 'c1', claim: 'The kingdom is in heaven where believers go after death.', type: 'doctrine', supportingScriptures: ['Matthew 6:9-10'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_acts10_bad',
    message: 'Does Acts 10 make pork clean?',
    reply: 'Yes, Acts 10 makes all foods clean including pork.',
    claims: [
      { claimId: 'c1', claim: 'Acts 10 makes all foods clean including pork.', type: 'doctrine', supportingScriptures: ['Acts 10:14'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_third_heaven_good',
    message: 'What is the third heaven?',
    reply: 'Paul names a third heaven in 2 Corinthians 12:2. Scripture does not state that believers go there as final destination.',
    claims: [
      { claimId: 'c1', claim: 'Paul names a third heaven in 2 Corinthians 12:2.', type: 'doctrine', supportingScriptures: ['2 Corinthians 12:2'] },
    ],
    expectFail: false,
    expectClass: 'A',
  },
  {
    id: 'f_no_ascended_bad',
    message: 'Where does the Bible say no man has ascended to heaven?',
    reply: 'Believers have ascended to heaven except Christ.',
    claims: [
      { claimId: 'c1', claim: 'Believers have ascended to heaven except Christ.', type: 'doctrine', supportingScriptures: ['John 3:13'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_cannot_come_bad',
    message: 'What did Jesus mean where I go ye cannot come?',
    reply: 'Believers will join Jesus in heaven permanently away from earth.',
    claims: [
      { claimId: 'c1', claim: 'Believers will join Jesus in heaven permanently away from earth.', type: 'doctrine', supportingScriptures: ['John 13:33'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_citation_without_support',
    message: 'What is the third heaven?',
    reply: 'Paul went to the third heaven and this shows our eternal home.',
    claims: [
      {
        claimId: 'c1',
        claim: '2 Corinthians 12:2 proves believers eternal home is the third heaven.',
        type: 'doctrine',
        supportingScriptures: ['2 Corinthians 12:2'],
      },
    ],
    expectFail: true,
    expectClass: 'D',
    expectIssue: 'citation_does_not_support_claim',
  },
  {
    id: 'f_pork_citation_leviticus',
    message: 'Can I eat pork?',
    reply: 'Yes, pork is clean for believers.',
    claims: [
      { claimId: 'c1', claim: 'Yes, pork is clean for believers.', type: 'doctrine', supportingScriptures: ['Leviticus 11'] },
    ],
    expectFail: true,
    expectClass: 'D',
  },
  {
    id: 'f_matt610_citation_kingdom_heaven',
    message: 'What is the kingdom of God?',
    reply: 'Matthew 6:10 teaches the kingdom is in heaven where we go.',
    claims: [
      {
        claimId: 'c1',
        claim: 'Matthew 6:10 teaches the kingdom is in heaven where believers go.',
        type: 'doctrine',
        supportingScriptures: ['Matthew 6:9-10'],
      },
    ],
    expectFail: true,
    expectClass: 'D',
  },
];

let passed = 0;
for (const f of FIXTURES) {
  const pack = buildRetrievalEvidencePack({ message: f.message, routingHintsOnly: true });
  const v = validateClaimToScripture({ reply: f.reply, claims: f.claims, evidencePack: pack, message: f.message });
  const cls = v.claimResults[0]?.classification;
  const issues = v.claimResults[0]?.issues || [];
  const ok = f.expectFail ? !v.passed : v.passed;
  const classOk = !f.expectClass || cls === f.expectClass;
  const issueOk = !f.expectIssue || issues.includes(f.expectIssue);
  if (ok && classOk && issueOk) {
    passed += 1;
    console.log(`PASS ${f.id} class=${cls}`);
  } else {
    console.log(`FAIL ${f.id} passed=${v.passed} class=${cls} issues=${JSON.stringify(v.claimResults[0]?.issues)}`);
  }
}

console.log(JSON.stringify({ passed, total: FIXTURES.length, allPass: passed === FIXTURES.length }));
process.exit(passed === FIXTURES.length ? 0 : 1);
