/**
 * Citation-vs-support verification — judges whether cited Scripture actually supports the claim.
 * Uses approved support graph + frozen card rules — no new doctrine.
 */

const { normalizeRef } = require('./claimNormalizer');
const { refMatchesPattern } = require('./scriptureReferenceNormalizer');
const { matchSupportGraph, buildApprovedSupportGraph } = require('./approvedSupportGraph');

/** Legacy denials — kept for offline fixtures; graph is primary at runtime. */
const CITATION_SUPPORT_DENIALS = [
  {
    id: '2cor12_2_not_destination',
    refRe: /\b2\s*cor(?:inthians)?\s*12:2\b/i,
    claimRes: [
      /\bbelievers?\b.{0,40}\b(go|ascend|enter)\b.{0,30}\b(third heaven|heaven)\b/i,
      /\b(third heaven|destination|eternal home)\b.{0,40}\b(proves?|shows?|means?)\b/i,
      /\bproves?\b.{0,50}\b(third heaven|eternal home|believers?['']?\s+(destination|final))\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'heavens.card bindingRules',
  },
  {
    id: '2cor5_8_not_immediate_heaven',
    refRe: /\b2\s*cor(?:inthians)?\s*5:8\b/i,
    claimRes: [
      /\b(heaven at death|immediate heaven|go to heaven when we die)\b/i,
      /\b(proves?|means?|shows?)\b.{0,30}\b(heaven at death|immediate)\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'heavens.card bindingRules',
  },
  {
    id: 'john3_13_not_believer_ascension',
    refRe: /\bjohn\s*3:13\b/i,
    claimRes: [
      /\bbelievers?\s+have\s+ascended\b/i,
      /\b(men|people)\s+have\s+ascended\b/i,
      /\bascended\b.{0,40}\b(believers?|except christ)\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'heavens.card bindingRules',
  },
  {
    id: 'matt6_10_not_kingdom_in_heaven',
    refRe: /\bmatthew\s*6:9-10\b|\bmatthew\s*6:10\b/i,
    claimRes: [
      /\bkingdom\b.{0,50}\b(in heaven|only in heaven)\b.{0,40}\b(believers?|go|after death)\b/i,
      /\bbelievers?\b.{0,40}\bgo\b.{0,30}\bheaven\b.{0,30}\bkingdom\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'kingdom.card bindingRules',
  },
  {
    id: 'acts10_not_pork_clean',
    refRe: /\bacts\s*10\b/i,
    claimRes: [
      /\b(makes?|made|declares?)\b.{0,30}\b(all foods|pork|unclean).{0,20}\bclean\b/i,
      /\b(yes|indeed)\b.{0,20}\b(pork|unclean).{0,20}\b(clean|permitted)\b/i,
      /\bcan\s+(now\s+)?eat\s+pork\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'dietaryLaw.card cautionPassages',
  },
  {
    id: 'john13_33_not_permanent_heaven',
    refRe: /\bjohn\s*13:33\b/i,
    claimRes: [
      /\b(join|be with)\s+jesus\b.{0,50}\bheaven\b/i,
      /\bpermanently\b.{0,40}\b(heaven|away from earth)\b/i,
      /\bbelievers?\b.{0,40}\bjoin\b.{0,40}\bjesus\b.{0,40}\bheaven\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'kingdom.card bindingRules',
  },
  {
    id: 'lev11_not_pork_clean',
    refRe: /\b(leviticus\s*11|deuteronomy\s*14)\b/i,
    claimRes: [
      /\b(pork|swine)\b.{0,30}\b(clean|permitted|allowed)\b/i,
      /\b(yes|can)\b.{0,20}\b(eat\s+)?pork\b/i,
      /\bpork is clean\b/i,
    ],
    issue: 'citation_does_not_support_claim',
    source: 'dietaryLaw.card bibleFirstConclusion',
  },
];

/** Legacy affirmations — graph edges are primary; kept for backward-compatible exports. */
const CITATION_SUPPORT_AFFIRMATIONS = [
  {
    id: '2cor12_2_names_third_heaven',
    refRe: /\b2\s*cor(?:inthians)?\s*12:2\b/i,
    claimRes: [
      /\bpaul\b.{0,40}\b(names|mentions|caught up|saw)\b.{0,40}\bthird heaven\b/i,
      /\bthird heaven\b.{0,40}\b(named|mentioned|exists)\b/i,
    ],
    supportClass: 'A',
  },
  {
    id: 'matt6_10_kingdom_on_earth',
    refRe: /\bmatthew\s*6:9-10\b|\bmatthew\s*6:10\b/i,
    claimRes: [
      /\bkingdom\b.{0,40}\b(on earth|in earth|come)\b/i,
      /\bthy kingdom come\b/i,
      /\bwill be done\b.{0,20}\b(in earth|on earth)\b/i,
    ],
    supportClass: 'A',
  },
  {
    id: 'john3_13_no_ascension',
    refRe: /\bjohn\s*3:13\b/i,
    claimRes: [
      /\bno man\b.{0,40}\bascended\b/i,
      /\bno one\b.{0,40}\bascended\b/i,
      /\bexcept\b.{0,20}\bson of man\b/i,
    ],
    supportClass: 'A',
  },
  {
    id: 'john13_33_cannot_come',
    refRe: /\bjohn\s*13:33\b/i,
    claimRes: [
      /\b(cannot|can not)\s+come\b/i,
      /\bwhither i go\b.{0,40}\b(cannot|can not)\b/i,
      /\bye cannot come\b/i,
    ],
    supportClass: 'A',
  },
  {
    id: 'lev11_unclean',
    refRe: /\b(leviticus\s*11|deuteronomy\s*14)\b/i,
    claimRes: [
      /\b(swine|pork)\b.{0,30}\b(unclean|not clean)\b/i,
      /\bunclean\b.{0,30}\b(swine|pork)\b/i,
    ],
    supportClass: 'A',
  },
];

function verifyCitationSupportsClaim(claimText = '', refs = [], graph = {}) {
  const text = String(claimText || '');
  const issues = [];

  const supportGraph =
    graph.supportGraph ||
    buildApprovedSupportGraph(graph.evidencePack || { evidenceCards: { cards: [] } });

  const graphResult = matchSupportGraph(text, refs, supportGraph);

  if (graphResult.outcome === 'contradicted' && graphResult.match) {
    const m = graphResult.match;
    return {
      supported: false,
      contradicted: true,
      classification: m.classification || 'D',
      issues: ['citation_does_not_support_claim', m.id],
      supportRelationship: 'contradicted',
      citationDenialId: m.id,
      citedRef: refs[0] || null,
      supportGraphMatch: m,
      affirmationId: null,
    };
  }

  if (graphResult.outcome === 'affirmed' && graphResult.match) {
    const m = graphResult.match;
    return {
      supported: true,
      contradicted: false,
      classification: m.classification || 'A',
      issues: [],
      supportRelationship: m.relationship || 'direct',
      affirmationId: m.id,
      citedRef: refs[0] || null,
      supportGraphMatch: m,
      citationDenialId: null,
    };
  }

  if (graphResult.outcome === 'chain' && graphResult.match) {
    const m = graphResult.match;
    return {
      supported: true,
      contradicted: false,
      classification: 'B',
      issues: [],
      supportRelationship: 'chain',
      citedRef: refs[0] || null,
      supportGraphMatch: m,
      affirmationId: m.id,
    };
  }

  for (const ref of refs) {
    for (const denial of CITATION_SUPPORT_DENIALS) {
      if (!refMatchesPattern(ref, denial.refRe)) continue;
      for (const claimRe of denial.claimRes) {
        if (claimRe.test(text)) {
          return {
            supported: false,
            contradicted: true,
            classification: 'D',
            issues: [denial.issue, denial.id],
            supportRelationship: 'contradicted',
            citationDenialId: denial.id,
            citedRef: ref,
            supportGraphMatch: { id: denial.id, source: denial.source, supportType: 'contradicts' },
          };
        }
      }
    }
  }

  for (const ref of refs) {
    for (const aff of CITATION_SUPPORT_AFFIRMATIONS) {
      if (!refMatchesPattern(ref, aff.refRe)) continue;
      for (const claimRe of aff.claimRes) {
        if (claimRe.test(text)) {
          return {
            supported: true,
            contradicted: false,
            classification: aff.supportClass,
            issues: [],
            supportRelationship: 'direct',
            affirmationId: aff.id,
            citedRef: ref,
            supportGraphMatch: { id: aff.id, source: 'legacy_affirmation', supportType: 'directly_affirms' },
          };
        }
      }
    }
  }

  const bindingHit = (graph.bindingRules || []).some(({ rule }) => {
    const r = String(rule || '').toLowerCase();
    const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    return words.filter((w) => r.includes(w)).length >= 2;
  });

  if (bindingHit && refs.length) {
    return {
      supported: true,
      contradicted: false,
      classification: 'A',
      issues: [],
      supportRelationship: 'binding_rule',
      citedRef: refs[0],
      supportGraphMatch: { id: 'binding_rule_overlap', source: 'card.bindingRules', supportType: 'directly_affirms' },
    };
  }

  const inChain = (graph.teachingOrders || []).some((chain) =>
    refs.some((ref) =>
      (chain.teachingOrder || []).some((t) => normalizeRef(ref).includes(normalizeRef(t).split(':')[0]))
    )
  );

  if (inChain && refs.length) {
    return {
      supported: true,
      contradicted: false,
      classification: 'B',
      issues: [],
      supportRelationship: 'chain',
      citedRef: refs[0],
      supportGraphMatch: { id: 'catalog_teaching_order', source: 'approvedCatalogEvidence', supportType: 'indirectly_supports' },
    };
  }

  if (refs.length) {
    issues.push('citation_without_verified_support');
    return {
      supported: false,
      contradicted: false,
      classification: 'C',
      issues,
      supportRelationship: 'unverified',
      citedRef: refs[0],
      supportGraphMatch: null,
    };
  }

  return {
    supported: false,
    contradicted: false,
    classification: 'C',
    issues: ['ungrounded_claim'],
    supportRelationship: 'none',
    supportGraphMatch: null,
  };
}

function validatorDecisionFromClass(classification, { denial = false } = {}) {
  if (denial) return 'Approved';
  if (classification === 'A' || classification === 'B') return 'Approved';
  if (classification === 'C') return 'Rejected';
  if (classification === 'D') return 'Rejected';
  return 'NeedsReview';
}

module.exports = {
  CITATION_SUPPORT_DENIALS,
  CITATION_SUPPORT_AFFIRMATIONS,
  verifyCitationSupportsClaim,
  validatorDecisionFromClass,
};
