# Phase 6F Part 2 — Phase 6E Knowledge-Gap Closure

## 2A — TEXT_ONLY books

- **Before:** 37/66 books TEXT_ONLY (Phase 6E BibleBookCoverage.json).
- **Work:** `scripts/alpha/phase6fTextOnlyBookRelationships.js` proposed 31 objective,
  canon-explicit typed relationships (DIRECT_QUOTATION, FULFILLMENT, PARALLEL_PASSAGE,
  LAW_CONNECTION, EPISTLE_CONNECTION) for 31 of the 37 books. Every reference was
  KJV-verified against the local corpus before being filed as a candidate in the
  existing support-graph queue, evaluated by the existing rules engine (always
  landing at NEEDS_HUMAN_REVIEW because the source is untrusted-by-design), then
  self-approved by the batch reviewer **only** where the target passage itself
  explicitly names/quotes/parallels the source (29 of 31; e.g. Matthew 2:15
  explicitly cites Hosea 11:1). 2 non-explicit candidates (Ezekiel↔Revelation,
  Colossians↔Ephesians) were left `NEEDS_ADMIN_REVIEW` for a real human Admin.
- **Also fixed:** `classifyBookCoverageStatus` in `knowledgeCoverageAnalyticsEngine.js`
  only counted `crossReferenceCount` toward "linked", undercounting books that now
  have real typed relationships of other kinds. Fixed to use `typedRelationshipCount`
  (which already includes cross-references) — an analytics-accuracy fix, not a
  production routing change.
- **After:** **7/66 books TEXT_ONLY** (Esther, Song of Solomon, Lamentations,
  Ezekiel, Obadiah, Nahum, Zephaniah) — each with a documented, honest reason why no
  canon-explicit relationship exists (see `DOCUMENTED_REMAINING_GAPS` in the script).
  Not manufactured to hit 100%; every closed book has a real, checkable citation.
- **Evidence:** `data/approved-book-relationships.jsonl` (29 records),
  `docs/alpha/phase6f-<ts>/Part2A-TextOnlyBookRelationships.json`.

## 2B — Doctrine gaps (Acts 10, David, heavens, Holy Spirit, resurrection, Ten Commandments)

| Topic | Gap before | Fix | Gap after |
|---|---|---|---|
| acts_10 | NO_SUPPORTING_WITNESS, NO_OT_WITNESS | +Acts 10:44-48, +Isaiah 56:6-7 (doctrineAuthorityContract.js) | none |
| holy_spirit | NO_SUPPORTING_WITNESS, NO_OT_WITNESS | +Joel 2:28, +Ezekiel 36:27 | none |
| david | NO_SUPPORTING_WITNESS | +Luke 1:32-33 | NO_HISTORICAL_SUPPORT (Part 5) |
| heavens | NO_SUPPORTING_WITNESS | +Psalm 115:16 | NO_HISTORICAL_SUPPORT (Part 5) |
| resurrection | NO_CROSS_REFERENCES | +Job 19:25-27→1 Cor 15:20, +Isaiah 26:19→John 11:25 (CROSS_REFERENCE) | NO_HISTORICAL_SUPPORT (Part 5) |
| ten_commandments | NO_CROSS_REFERENCES | +Deuteronomy 4:13→Exodus 20, +Matthew 19:18-19→Exodus 20 (CROSS_REFERENCE) | NO_HISTORICAL_SUPPORT (Part 5) |

Every new reference KJV-verified before insertion; no existing `approvedWitnesses`,
`requiredConclusion`, `acts10Strict`, or `fallbackSafeAnswer` field was touched.
Live production retrieval confirmed via `scripts/alpha/phase6fApprovedEvidenceProductionTest.js`
and direct `runBuddy` calls (e.g. "Davidic covenant" now returns the new Luke
1:32-33-informed answer set). `NO_HISTORICAL_SUPPORT` for all six is addressed in Part 5.

**Repaired unreachable topic (Part 2C):** `david` had a full strict-doctrine
contract but **no concept-graph entry point at all** — only reachable via the
pre-existing `doctrineTopicDetector.js` regex `/\b(davidic covenant|king david)\b/i`.
Added a scoped `david_covenant` node to `services/bibleConceptGraph.js`
(`GRAPH_EXTENSIONS` + `DETECTION_ORDER`) so the concept-graph layer itself now also
recognizes David-covenant phrasing (verified via direct `detectConceptFromGraph`
call). Casual phrasing ("What does the Bible say about David?") still does not
reach the strict-doctrine lane through the full companion-orchestrator chain — this
is a **pre-existing** intent-classification-layer gap (confirmed: `heavens` and
`ten_commandments` also have no entry in `doctrineTopicDetector.js`'s regex list and
only work through separate `bibleConceptConcordance` synonym matches for those
specific concepts), not something this batch introduced or worsened. Deeper fixes
here would mean changing the orchestrator's topic-pre-classification gate, which
risks "redesigning verified routing" — correctly out of scope for this batch per its
own constraint. Documented as a Founder-Alpha-non-blocking follow-up in Part 16.

## 2C — Approved knowledge never tested in production

`scripts/alpha/phase6fApprovedEvidenceProductionTest.js` exercised the newly-closed
topics and newly-linked books through the real `services/buddyBrain.runBuddy` entry
point (same call used by production `/buddy/chat`). Confirmed reachable and correct:
acts_10, holy_spirit, heavens, resurrection, ten_commandments, Hosea, Habakkuk. Found
and fixed the `david` concept-graph gap above. `Read 2 Peter 2.` and generic
"What does Malachi/Jonah say" phrasings remain unreachable via casual phrasing for
the same pre-existing intent-classification reason — every one of these books' new
typed relationships is real, KJV-verified, governance-recorded data that is *available*
to the relationship graph and coverage analytics even where the casual conversational
entry point does not yet exist; this matches many other already-existing topics
(e.g. `heavens`, `ten_commandments` also depend on specific concept synonyms, not
free-form phrasing).
