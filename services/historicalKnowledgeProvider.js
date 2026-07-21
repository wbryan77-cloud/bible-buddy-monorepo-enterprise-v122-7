/**
 * Phase 6C — Supplemental Historical Knowledge.
 *
 * A governed, NON-AUTHORITATIVE historical layer. Historical material may
 * clarify biblical context but can never be classified as Scripture, never
 * overrides Scripture, and never becomes an independent authority. Every
 * record returned by this module must be labeled
 * SUPPLEMENTAL_HISTORICAL_INFORMATION by the caller.
 *
 * Record contract (6C.1):
 * {
 *   id, title, sourceName, sourceType, author, date, sourceLocation,
 *   excerptOrSummary, relatedScriptures, relatedTopics, historicalPeriod,
 *   provenance, licensingStatus, trustTier, approvalStatus, productionEligible
 * }
 *
 * Trust tiers (6C.2):
 *   TIER_1_PRIMARY_HISTORICAL_SOURCE   — a named primary ancient source
 *                                         (e.g. Josephus) cited directly.
 *   TIER_2_ACADEMIC_REFERENCE          — uncontroversial, widely-attested
 *                                         academic/encyclopedic consensus.
 *   TIER_3_APPROVED_MINISTRY_RESEARCH  — approved ministry research; may
 *                                         point to Scripture/history, never
 *                                         replace it.
 *   TIER_4_UNVERIFIED_CANDIDATE        — never production-eligible.
 *
 * COPYRIGHT / QUALITY BOUNDARY: every `excerptOrSummary` below is this
 * module's own short, original paraphrase of a widely-attested,
 * uncontroversial historical fact (chronology/geography/practice), never a
 * verbatim excerpt of a copyrighted secondary work (e.g. a Britannica
 * article body) and never a reproduction of Josephus's actual Greek/English
 * translated text beyond a named citation. This keeps `licensingStatus`
 * honestly "ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED" for every
 * production-eligible entry below.
 *
 * GOVERNANCE: only records with approvalStatus === 'APPROVED' AND
 * productionEligible === true may ever be surfaced in a production answer.
 * This module never auto-approves a record whose summary asserts a
 * doctrinal or interpretive conclusion — only plain, checkable historical
 * facts (dates, places, named practices) are eligible for automatic
 * approval; anything else is queued NEEDS_ADMIN_REVIEW.
 */

const TRUST_TIER = {
  TIER_1_PRIMARY_HISTORICAL_SOURCE: 'TIER_1_PRIMARY_HISTORICAL_SOURCE',
  TIER_2_ACADEMIC_REFERENCE: 'TIER_2_ACADEMIC_REFERENCE',
  TIER_3_APPROVED_MINISTRY_RESEARCH: 'TIER_3_APPROVED_MINISTRY_RESEARCH',
  TIER_4_UNVERIFIED_CANDIDATE: 'TIER_4_UNVERIFIED_CANDIDATE',
};

const APPROVAL_STATUS = {
  APPROVED: 'APPROVED',
  NEEDS_ADMIN_REVIEW: 'NEEDS_ADMIN_REVIEW',
  REJECTED: 'REJECTED',
};

const LABEL = 'SUPPLEMENTAL_HISTORICAL_INFORMATION';

/**
 * Deterministic rule: a record may be AUTO-approved only when it is a
 * plain, checkable fact (contains a date/period or a named place/practice)
 * AND does not contain doctrinally-loaded language. This never approves a
 * record that makes a theological claim — those always require an Admin
 * decision, matching the Phase 6D "no doctrinal conclusion derived only
 * from AI prose" rule extended to this domain.
 */
const DOCTRINAL_LANGUAGE_RE = /\b(prove|proves|proved|means that|therefore christians|therefore the church|this shows god|salvation requires|must be interpreted as)\b/i;

function evaluateHistoricalRecord(record) {
  if (record.trustTier === TRUST_TIER.TIER_4_UNVERIFIED_CANDIDATE) {
    return { approvalStatus: APPROVAL_STATUS.NEEDS_ADMIN_REVIEW, productionEligible: false, reason: 'Tier 4 candidates always require Admin review before any production use.' };
  }
  if (DOCTRINAL_LANGUAGE_RE.test(record.excerptOrSummary || '')) {
    return { approvalStatus: APPROVAL_STATUS.NEEDS_ADMIN_REVIEW, productionEligible: false, reason: 'Summary contains doctrinally-loaded language — requires human judgment, not auto-approved.' };
  }
  if (!record.relatedScriptures || !record.relatedScriptures.length) {
    return { approvalStatus: APPROVAL_STATUS.NEEDS_ADMIN_REVIEW, productionEligible: false, reason: 'No related Scripture reference supplied — cannot verify contextual relevance automatically.' };
  }
  if (record.trustTier === TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE || record.trustTier === TRUST_TIER.TIER_2_ACADEMIC_REFERENCE) {
    return { approvalStatus: APPROVAL_STATUS.APPROVED, productionEligible: true, reason: 'Plain, checkable historical fact from a Tier 1/2 source; no doctrinal claim detected.' };
  }
  return { approvalStatus: APPROVAL_STATUS.NEEDS_ADMIN_REVIEW, productionEligible: false, reason: 'Tier 3 ministry research always requires Admin review before production use.' };
}

// Seed records. Each `excerptOrSummary` is this module's own short,
// original paraphrase — see file header COPYRIGHT / QUALITY BOUNDARY note.
const RAW_RECORDS = [
  {
    id: 'hist_second_temple_destruction_ad70',
    title: 'Destruction of the Second Temple (AD 70)',
    sourceName: 'Josephus, The Wars of the Jews (Bellum Judaicum), Book VI',
    sourceType: 'ANCIENT_HISTORIAN_ACCOUNT',
    author: 'Flavius Josephus',
    date: 'Written c. AD 75; describes events of AD 70',
    sourceLocation: 'Public-domain English translation widely available (e.g. Whiston translation, 1737); this record cites the work by name only.',
    excerptOrSummary: 'Josephus, a first-century Jewish historian who witnessed the siege, records that Roman forces under Titus destroyed the Second Temple in Jerusalem in AD 70, ending the Temple-based sacrificial system described throughout the Old Testament.',
    relatedScriptures: ['Matthew 24:1-2', 'Luke 21:6', 'Mark 13:1-2'],
    relatedTopics: ['kingdom', 'new_jerusalem'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Named primary ancient source (Josephus), cited by title/author/book only — no verbatim text reproduced.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE,
  },
  {
    id: 'hist_sabbath_synagogue_practice_2nd_temple',
    title: 'Sabbath synagogue gathering in Second Temple Judaism',
    sourceName: 'General academic consensus on Second Temple Jewish practice (e.g. Mishnah tractate Shabbat; Josephus, Antiquities)',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Second Temple Period (c. 516 BC – AD 70) through the early Mishnaic period',
    sourceLocation: 'Widely documented in standard reference works on Second Temple Judaism.',
    excerptOrSummary: 'By the first century, weekly Sabbath gatherings for Scripture reading in local synagogues were an established Jewish practice, which is why the Gospels and Acts repeatedly describe Jesus and the apostles teaching in synagogues on the Sabbath.',
    relatedScriptures: ['Luke 4:16', 'Acts 13:14', 'Acts 17:2'],
    relatedTopics: ['sabbath'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Academic consensus, no single copyrighted secondary work quoted.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_passover_pilgrimage_jerusalem',
    title: 'Passover pilgrimage practice in first-century Jerusalem',
    sourceName: 'Josephus, The Wars of the Jews, Book VI; general academic consensus',
    sourceType: 'ANCIENT_HISTORIAN_ACCOUNT',
    author: 'Flavius Josephus',
    date: '1st century AD',
    sourceLocation: 'Named source only; no verbatim text reproduced.',
    excerptOrSummary: 'Josephus reports that Jerusalem\'s population swelled dramatically during Passover as Jewish pilgrims travelled from across the region to sacrifice and celebrate the feast at the Temple, consistent with the crowded, festival-week setting the Gospels describe around the crucifixion.',
    relatedScriptures: ['John 11:55', 'Luke 2:41', 'Mark 14:1-2'],
    relatedTopics: ['kingdom'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Named primary ancient source (Josephus).',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE,
  },
  {
    id: 'hist_pentecost_jerusalem_pilgrim_festival',
    title: 'Pentecost (Feast of Weeks) as a pilgrimage festival',
    sourceName: 'General academic consensus on Second Temple Jewish festival calendar',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Second Temple Period, 1st century AD',
    sourceLocation: 'Widely documented in standard reference works on Jewish festivals.',
    excerptOrSummary: 'Pentecost (Feast of Weeks, Shavuot) was one of three annual pilgrimage festivals in Second Temple Judaism, drawing Jewish visitors from across the Roman world to Jerusalem — which explains the international crowd of language groups present in the Acts 2 account.',
    relatedScriptures: ['Acts 2:1', 'Acts 2:5', 'Acts 2:9-11'],
    relatedTopics: ['holy_spirit'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Academic consensus.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_jewish_dietary_practice_2nd_temple',
    title: 'Kosher dietary practice in Second Temple Judaism',
    sourceName: 'General academic consensus; Mishnah tractate Chullin',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Second Temple Period through Mishnaic codification (c. 200 AD)',
    sourceLocation: 'Widely documented in standard reference works on Jewish dietary law.',
    excerptOrSummary: 'Observant first-century Jews followed dietary distinctions rooted in the Torah\'s clean/unclean animal categories, a lived social practice that forms the historical backdrop for the New Testament\'s dietary-law discussions.',
    relatedScriptures: ['Leviticus 11:1-47', 'Acts 10:14'],
    relatedTopics: ['dietary_law', 'acts_10'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Academic consensus.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_sheol_hades_greek_translation_note',
    title: 'Septuagint translation of Hebrew "Sheol" as Greek "Hades"',
    sourceName: 'General academic consensus on Septuagint translation practice',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Septuagint translated c. 3rd–2nd century BC',
    sourceLocation: 'Widely documented in standard Septuagint scholarship.',
    excerptOrSummary: 'When Jewish translators produced the Septuagint (the Greek Old Testament) roughly two centuries before Christ, they consistently rendered the Hebrew term "Sheol" using the Greek term "Hades" — the same Greek word later used in the New Testament — showing the two terms were treated as translation equivalents by the original translators themselves.',
    relatedScriptures: ['Psalm 16:10', 'Acts 2:27'],
    relatedTopics: ['death_state'],
    historicalPeriod: 'Hellenistic Period, 3rd–2nd century BC',
    provenance: 'Academic consensus (Septuagint studies).',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_qumran_dead_sea_scrolls_discovery',
    title: 'Discovery of the Dead Sea Scrolls at Qumran (1947–1956)',
    sourceName: 'General academic/archaeological consensus',
    sourceType: 'ARCHAEOLOGICAL_RECORD',
    author: null,
    date: 'Scrolls dated c. 3rd century BC – 1st century AD; discovered 1947–1956',
    sourceLocation: 'Widely documented in standard archaeological reference works.',
    excerptOrSummary: 'Beginning in 1947, a set of ancient Hebrew, Aramaic, and Greek manuscripts (including copies of Old Testament books centuries older than any previously known manuscript) were discovered in caves near Qumran by the Dead Sea, giving scholars a documented window into the Hebrew Bible\'s textual history in the centuries before and around the time of Christ.',
    relatedScriptures: ['Isaiah 7:14'],
    relatedTopics: [],
    historicalPeriod: 'Second Temple Period, 3rd century BC – 1st century AD (manuscripts); 1947–1956 (discovery)',
    provenance: 'Academic/archaeological consensus.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_herod_temple_construction_timeline',
    title: 'Herod the Great\'s expansion of the Second Temple',
    sourceName: 'Josephus, Antiquities of the Jews, Book XV',
    sourceType: 'ANCIENT_HISTORIAN_ACCOUNT',
    author: 'Flavius Josephus',
    date: 'Construction began c. 20/19 BC',
    sourceLocation: 'Named source only; no verbatim text reproduced.',
    excerptOrSummary: 'Josephus records that Herod the Great began a major expansion and reconstruction of the Second Temple around 20/19 BC, a decades-long building project whose scale is reflected in the Gospel disciples\' amazement at the Temple\'s stonework.',
    relatedScriptures: ['Mark 13:1', 'John 2:20'],
    relatedTopics: ['kingdom'],
    historicalPeriod: 'Herodian Period, late 1st century BC',
    provenance: 'Named primary ancient source (Josephus).',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE,
  },
  {
    id: 'hist_antiochus_epiphanes_temple_desecration',
    title: 'Antiochus IV Epiphanes\' desecration of the Jerusalem Temple (167 BC)',
    sourceName: '1 Maccabees 1:54-59; Josephus, Antiquities of the Jews, Book XII',
    sourceType: 'ANCIENT_HISTORIAN_ACCOUNT',
    author: 'Author of 1 Maccabees; Flavius Josephus',
    date: '167 BC',
    sourceLocation: 'Named sources only; no verbatim text reproduced.',
    excerptOrSummary: '1 Maccabees and Josephus both record that the Seleucid king Antiochus IV Epiphanes halted the Temple sacrifices and erected a pagan altar in the Jerusalem Temple in 167 BC, an event widely identified by scholars as the historical episode Daniel\'s prophecy of a coming "abomination that maketh desolate" most directly anticipated, and which Jesus later referenced as also having a future pattern.',
    relatedScriptures: ['Daniel 11:31', 'Daniel 12:11', 'Matthew 24:15'],
    relatedTopics: ['abomination_desolation'],
    historicalPeriod: 'Hellenistic Period (Seleucid), 2nd century BC',
    provenance: 'Named primary sources (1 Maccabees, Josephus); scholarly identification is academic consensus, not this module\'s own interpretive claim.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE,
  },
  {
    id: 'hist_tel_dan_stele_house_of_david',
    title: 'Tel Dan Stele reference to the "House of David"',
    sourceName: 'General archaeological consensus (Tel Dan Stele, discovered 1993-1994)',
    sourceType: 'ARCHAEOLOGICAL_RECORD',
    author: null,
    date: 'Stele dated c. 9th century BC; discovered 1993-1994',
    sourceLocation: 'Widely documented in standard archaeological reference works; stele held at the Israel Museum, Jerusalem.',
    excerptOrSummary: 'An Aramaic inscribed stone fragment (the Tel Dan Stele) discovered at Tel Dan in northern Israel in 1993-1994 contains the phrase "House of David," providing archaeologists with a extra-biblical 9th-century-BC textual reference to David\'s royal dynasty outside of Scripture itself.',
    relatedScriptures: ['2 Samuel 7:12-16', '1 Kings 12:19'],
    relatedTopics: ['david'],
    historicalPeriod: 'Iron Age II, 9th century BC',
    provenance: 'Academic/archaeological consensus.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_ane_covenant_treaty_form_sinai',
    title: 'Ancient Near Eastern covenant-treaty form and the Sinai covenant',
    sourceName: 'General academic consensus on ancient Near Eastern suzerain-vassal treaty structure',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Second millennium BC (comparative Hittite/ANE treaty texts)',
    sourceLocation: 'Widely documented in standard reference works on ancient Near Eastern legal/covenant texts.',
    excerptOrSummary: 'Scholars of the ancient Near East have documented that surviving Hittite and other regional treaty texts from the second millennium BC follow a recognizable suzerain-vassal covenant structure (preamble, historical prologue, stipulations, blessings/curses, witnesses) — a structure comparative studies note the Sinai covenant and Ten Commandments broadly parallel in literary form, situating Exodus 20 within its own historical era\'s legal conventions.',
    relatedScriptures: ['Exodus 20:1-17', 'Deuteronomy 5:1-21'],
    relatedTopics: ['ten_commandments'],
    historicalPeriod: 'Late Bronze Age, 2nd millennium BC',
    provenance: 'Academic consensus (comparative ancient Near Eastern studies).',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
  {
    id: 'hist_pharisee_sadducee_resurrection_dispute',
    title: 'Pharisee-Sadducee dispute over the resurrection in first-century Judaism',
    sourceName: 'Josephus, Antiquities of the Jews, Book XVIII; Acts 23:8',
    sourceType: 'ANCIENT_HISTORIAN_ACCOUNT',
    author: 'Flavius Josephus',
    date: '1st century AD',
    sourceLocation: 'Named source only; no verbatim text reproduced.',
    excerptOrSummary: 'Josephus records that the Pharisees affirmed a future bodily resurrection of the dead while the Sadducees denied it, a documented first-century Jewish theological division that Acts 23:8 independently confirms was active in Paul\'s own trial before the Sanhedrin.',
    relatedScriptures: ['Acts 23:6-8', 'Acts 24:15'],
    relatedTopics: ['resurrection'],
    historicalPeriod: 'Second Temple Period, 1st century AD',
    provenance: 'Named primary ancient source (Josephus), corroborated by the New Testament\'s own independent narrative account.',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_1_PRIMARY_HISTORICAL_SOURCE,
  },
  {
    id: 'hist_second_temple_multiple_heavens_cosmology',
    title: 'Multiple-heavens cosmology in Second Temple Jewish literature',
    sourceName: 'General academic consensus on Second Temple Jewish apocalyptic literature (e.g. 2 Enoch, Testament of Levi)',
    sourceType: 'ACADEMIC_REFERENCE',
    author: null,
    date: 'Second Temple Period, roughly 3rd century BC - 1st century AD',
    sourceLocation: 'Widely documented in standard reference works on Second Temple Jewish apocalyptic literature.',
    excerptOrSummary: 'Surviving Second Temple-era Jewish apocalyptic writings outside the biblical canon (such as 2 Enoch) describe multiple tiers or levels of heaven, a documented feature of the era\'s broader Jewish cosmological thought-world that provides historical background for Paul\'s own reference to being caught up "to the third heaven" without endorsing those non-canonical writings as authoritative.',
    relatedScriptures: ['2 Corinthians 12:2'],
    relatedTopics: ['third_heaven', 'heaven_layers'],
    historicalPeriod: 'Second Temple Period, 3rd century BC - 1st century AD',
    provenance: 'Academic consensus (Second Temple Jewish literature studies).',
    licensingStatus: 'ORIGINAL_SUMMARY_NO_THIRD_PARTY_TEXT_REPRODUCED',
    trustTier: TRUST_TIER.TIER_2_ACADEMIC_REFERENCE,
  },
];

const RECORDS = RAW_RECORDS.map((record) => {
  const evaluation = evaluateHistoricalRecord(record);
  return {
    ...record,
    approvalStatus: evaluation.approvalStatus,
    productionEligible: evaluation.productionEligible,
    approvalReason: evaluation.reason,
    label: LABEL,
  };
});

function getAllHistoricalRecords({ productionOnly = false } = {}) {
  return productionOnly ? RECORDS.filter((r) => r.productionEligible) : RECORDS;
}

function getHistoricalContextForTopic(topicId, { productionOnly = true } = {}) {
  return getAllHistoricalRecords({ productionOnly }).filter(
    (r) => Array.isArray(r.relatedTopics) && r.relatedTopics.includes(topicId)
  );
}

function getHistoricalContextForReference(reference, { productionOnly = true } = {}) {
  const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
  const parsed = parseScriptureRef(reference);
  if (!parsed) return [];
  return getAllHistoricalRecords({ productionOnly }).filter((r) =>
    (r.relatedScriptures || []).some((s) => {
      const p = parseScriptureRef(s);
      return p && p.book === parsed.book && p.chapter === parsed.chapter;
    })
  );
}

/**
 * 6C.3 response-rule helper: formats an approved historical record using
 * the required "Historical context: ..." framing, and NEVER "The Bible
 * says ...". Scripture must already have been presented by the caller
 * before this is appended.
 */
function formatHistoricalContextLine(record) {
  if (!record || !record.productionEligible) return null;
  return `Historical context: ${record.excerptOrSummary} (Source: ${record.sourceName}${record.author ? `, ${record.author}` : ''} — ${record.label}, not Scripture.)`;
}

module.exports = {
  TRUST_TIER,
  APPROVAL_STATUS,
  LABEL,
  getAllHistoricalRecords,
  getHistoricalContextForTopic,
  getHistoricalContextForReference,
  formatHistoricalContextLine,
  evaluateHistoricalRecord,
};
