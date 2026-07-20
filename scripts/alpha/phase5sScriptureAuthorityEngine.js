/**
 * Phase 5S — Scripture Authority Engine regression.
 *
 * Verifies the deterministic authority layer built on top of the Phase 5P
 * canonical Scripture provider and Phase 5Q grounded Scripture engine:
 *   - explicit single-passage lookups classify as EXPLICITLY_SUPPORTED
 *   - a curated multi-witness doctrine concept (Acts 10) classifies as
 *     SUPPORTED_BY_MULTIPLE_PASSAGES and gathers its real cross-references
 *   - an unaddressed claim classifies as SCRIPTURE_IS_SILENT
 *   - a claim directly opposed by the retrieved text classifies as
 *     EXPLICITLY_CONTRADICTED
 *   - Scripture is never duplicated between primary and supporting
 */

const { runBuddy } = require('../../services/buddyBrain');
const { clearActiveConversation } = require('../../services/activeConversationManager');

const cases = [
  {
    id: 'john_3_16',
    message: 'John 3:16',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/for god so loved the world/i],
    expectWitnessStatus: 'SINGLE_DIRECT_WITNESS',
  },
  {
    id: 'genesis_1_1',
    message: 'Genesis 1:1',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/in the beginning god created/i],
  },
  {
    id: 'revelation_1_14_15',
    message: 'Revelation 1:14-15',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/wool/i, /fine brass/i],
  },
  {
    id: 'acts_10_multiple_passages',
    message: 'Acts 10',
    expectClassification: 'SUPPORTED_BY_MULTIPLE_PASSAGES',
    mustInclude: [/Acts 10:28/i, /Acts 10:14/i, /Acts 10:34-35/i, /Acts 11:1-18/i],
    minSupportingScripture: 3,
    expectWitnessStatus: 'MULTIPLE_WITNESSES',
    minAvailableWitnessCount: 4,
  },
  {
    id: 'romans_8_1_4',
    message: 'Romans 8:1-4',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/no condemnation/i],
  },
  {
    id: 'matthew_22_37_40',
    message: 'Matthew 22:37-40',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/love the lord thy god/i],
  },
  {
    id: 'isaiah_28_10',
    message: 'Isaiah 28:10',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/precept.{0,20}precept/i, /line.{0,20}line/i],
  },
  {
    id: '2_corinthians_13_1',
    message: '2 Corinthians 13:1',
    expectClassification: 'EXPLICITLY_SUPPORTED',
    mustInclude: [/two or three witnesses/i],
  },
  {
    // PHASE_5T: Scripture explicitly describes hair/eyes with different
    // specific content than the claim ("wool"/"snow" vs "blond straight
    // hair"; "flame of fire" vs "blue eyes") — a contrary description, not
    // silence. Must classify EXPLICITLY_CONTRADICTED and answer "No." first.
    id: 'explicitly_contradicted_compound_appearance_claim',
    message: 'Based on Revelation 1:14-15, does Scripture say Jesus is white with blue eyes and fine straight hair? Yes or no?',
    expectClassification: 'EXPLICITLY_CONTRADICTED',
    mustInclude: [/^no/i, /opposite/i, /wool/i, /fine brass/i],
  },
  {
    id: 'explicitly_contradicted_pork_clean',
    message: 'Does Leviticus 11 say pork is clean, yes or no?',
    expectClassification: 'EXPLICITLY_CONTRADICTED',
    mustInclude: [/^no/i, /opposite/i],
  },
  {
    // A genuine silence case: Scripture never addresses time-of-day, so
    // there is neither a supporting nor a contrary statement to cite.
    id: 'scripture_is_silent_on_unaddressed_detail',
    message: 'Does Genesis 1:1 say what time of day God created the heavens?',
    expectClassification: 'SCRIPTURE_IS_SILENT',
    mustInclude: [/does not explicitly state/i, /in the beginning god created/i],
  },
];

(async () => {
  let failed = 0;

  for (const t of cases) {
    const userId = `phase5s-${t.id}-${Date.now()}`;
    clearActiveConversation(userId);

    const structured = await runBuddy({
      userId,
      message: t.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });

    const reply = String(structured.reply || '');
    const route = structured.runtime?.masterRoute || structured.route || null;
    const classification = structured.runtime?.authorityClassification || null;
    const witnessStatus = structured.runtime?.witnessStatus || null;
    const availableWitnessCount = structured.runtime?.availableWitnessCount ?? null;
    const supportingScripture = structured.scripture || [];

    const missing = (t.mustInclude || []).filter((r) => !r.test(reply)).map(String);
    const classificationMismatch =
      t.expectClassification && classification !== t.expectClassification;
    const witnessStatusMismatch =
      t.expectWitnessStatus && witnessStatus !== t.expectWitnessStatus;
    const notEnoughSupporting =
      t.minSupportingScripture && supportingScripture.length < t.minSupportingScripture;
    const notEnoughAvailable =
      t.minAvailableWitnessCount && (availableWitnessCount ?? 0) < t.minAvailableWitnessCount;

    // Scripture must never be duplicated: no two entries with the same
    // reference in the returned scripture array.
    const refs = supportingScripture.map((s) => s.reference);
    const duplicated = refs.length !== new Set(refs).size;

    const pass =
      missing.length === 0 &&
      !classificationMismatch &&
      !witnessStatusMismatch &&
      !notEnoughSupporting &&
      !notEnoughAvailable &&
      !duplicated;

    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${JSON.stringify({
        id: t.id,
        route,
        expectClassification: t.expectClassification,
        classification,
        expectWitnessStatus: t.expectWitnessStatus,
        witnessStatus,
        availableWitnessCount,
        missing,
        duplicated,
        scriptureCount: supportingScripture.length,
        reply: reply.slice(0, 300),
      })}`
    );

    if (!pass) failed++;
  }

  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
