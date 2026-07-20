/**
 * Phase 6C — Supplemental Historical Knowledge smoke test.
 *
 * Verifies:
 *  - the trust-tier/record contract is well-formed for every seed record
 *  - only APPROVED + productionEligible records are ever returned by the
 *    production-facing lookups (default productionOnly=true)
 *  - approved historical context is retrievable by reference and by topic
 *  - the formatter always labels output SUPPLEMENTAL_HISTORICAL_INFORMATION
 *    and never says "The Bible says ..."
 *  - Tier 4 / doctrinally-loaded candidates are never auto-approved
 */

const {
  TRUST_TIER,
  APPROVAL_STATUS,
  getAllHistoricalRecords,
  getHistoricalContextForTopic,
  getHistoricalContextForReference,
  formatHistoricalContextLine,
  evaluateHistoricalRecord,
} = require('../../services/historicalKnowledgeProvider');

let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
  } else {
    failed += 1;
    console.log('FAIL', name, detail ? JSON.stringify(detail) : '');
  }
}

const REQUIRED_FIELDS = [
  'id', 'title', 'sourceName', 'sourceType', 'author', 'date', 'sourceLocation',
  'excerptOrSummary', 'relatedScriptures', 'relatedTopics', 'historicalPeriod',
  'provenance', 'licensingStatus', 'trustTier', 'approvalStatus', 'productionEligible',
];

const all = getAllHistoricalRecords();
check('at_least_one_seed_record', all.length > 0, { count: all.length });

for (const record of all) {
  const missing = REQUIRED_FIELDS.filter((f) => !(f in record));
  check(`record_${record.id}_has_full_contract`, missing.length === 0, { missing });
  check(`record_${record.id}_valid_trust_tier`, Object.values(TRUST_TIER).includes(record.trustTier), { trustTier: record.trustTier });
  check(`record_${record.id}_valid_approval_status`, Object.values(APPROVAL_STATUS).includes(record.approvalStatus), { approvalStatus: record.approvalStatus });
  check(`record_${record.id}_label_is_supplemental`, record.label === 'SUPPLEMENTAL_HISTORICAL_INFORMATION');
  check(`record_${record.id}_no_third_party_text_reproduced`, /ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED/.test(record.licensingStatus));
}

const productionOnly = getAllHistoricalRecords({ productionOnly: true });
check('production_only_excludes_non_approved', productionOnly.every((r) => r.approvalStatus === APPROVAL_STATUS.APPROVED && r.productionEligible === true));

// Tier 4 candidate must never auto-approve.
const tier4 = evaluateHistoricalRecord({
  trustTier: TRUST_TIER.TIER_4_UNVERIFIED_CANDIDATE,
  excerptOrSummary: 'An unverified claim about ancient Israel.',
  relatedScriptures: ['Genesis 1:1'],
});
check('tier4_never_auto_approved', tier4.approvalStatus === APPROVAL_STATUS.NEEDS_ADMIN_REVIEW && tier4.productionEligible === false, tier4);

// Doctrinally-loaded language must never auto-approve, even from Tier 1/2.
const doctrinal = evaluateHistoricalRecord({
  trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  excerptOrSummary: 'This proves that Christians must worship on Sunday.',
  relatedScriptures: ['Acts 20:7'],
});
check('doctrinal_language_never_auto_approved', doctrinal.approvalStatus === APPROVAL_STATUS.NEEDS_ADMIN_REVIEW && doctrinal.productionEligible === false, doctrinal);

// Tier 3 ministry research always requires review (never overrides Scripture/Tier1/2 automatically).
const tier3 = evaluateHistoricalRecord({
  trustTier: TRUST_TIER.TIER_3_APPROVED_MINISTRY_RESEARCH,
  excerptOrSummary: 'Ministry research on first-century burial customs.',
  relatedScriptures: ['John 11:38'],
});
check('tier3_ministry_research_always_needs_review', tier3.approvalStatus === APPROVAL_STATUS.NEEDS_ADMIN_REVIEW && tier3.productionEligible === false, tier3);

// Retrieval by reference and by topic.
const byRef = getHistoricalContextForReference('Mark 13:1');
check('retrieval_by_reference_finds_temple_destruction', byRef.some((r) => r.id === 'hist_second_temple_destruction_ad70'), { found: byRef.map((r) => r.id) });

const byTopic = getHistoricalContextForTopic('sabbath');
check('retrieval_by_topic_finds_sabbath_context', byTopic.some((r) => r.id === 'hist_sabbath_synagogue_practice_2nd_temple'), { found: byTopic.map((r) => r.id) });

const noMatch = getHistoricalContextForReference('Philemon 1:1');
check('honest_empty_result_for_unmatched_reference', Array.isArray(noMatch) && noMatch.length === 0, { found: noMatch });

// Formatter contract.
const line = formatHistoricalContextLine(byTopic[0]);
check('formatter_uses_historical_context_prefix', /^Historical context: /.test(line), { line });
check('formatter_never_says_the_bible_says', !/the bible says/i.test(line), { line });
check('formatter_labels_supplemental_not_scripture', /SUPPLEMENTAL_HISTORICAL_INFORMATION, not Scripture/.test(line), { line });
check('formatter_returns_null_for_non_eligible_record', formatHistoricalContextLine({ productionEligible: false }) === null);

console.log('');
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
