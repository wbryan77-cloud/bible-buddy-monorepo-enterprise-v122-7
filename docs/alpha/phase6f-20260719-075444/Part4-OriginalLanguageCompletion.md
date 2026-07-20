# PHASE 6F — PART 4: Original-Language Completion

## Scope

Verify that the approved original-language datasets (OSHB Hebrew/Aramaic
morphology, Nestle 1904 Greek morphology, Strong's Hebrew/Greek dictionaries —
all wired in Phase 6B) resolve real, non-fabricated token-level data for the
primary witnesses of the highest-priority production doctrine topics, and that
ordinary user phrasing reaches that data through the live orchestrator.

No lemma, morphology, gloss, transliteration, or manuscript reading was
generated, inferred, or altered by AI. Every value below comes directly from
`services/originalLanguageProvider.js` reading the vendored datasets
(`data/original-language/`).

## Method

Created `scripts/alpha/phase6fOriginalLanguageCompletion.js`, which for 10
high-priority doctrine/topic primary witnesses:

1. Calls `getPassageStudy({ reference })` directly (provider-level proof).
2. Sends an ordinary natural-language user message through the live
   `runBuddy` orchestrator path (product-level proof).

Topics tested: `acts_10`, `david`, `holy_spirit`, `resurrection`,
`ten_commandments`, `heavens`, `sabbath`, `death_state`, `love_agape`,
`grace` — chosen because they are either one of the six Phase 6F Part 2B
doctrine-gap topics or a high-frequency ordinary-user Bible-study term.

## Result (after repair)

**10/10 provider-level, 10/10 live-orchestrator-level.**

| Topic | Reference | Language | Tokens | Live routing |
|---|---|---|---|---|
| acts_10 | Acts 10:28 | GREEK | 25 | ✅ |
| david | 2 Samuel 7:12-16 | HEBREW | 64 | ✅ |
| holy_spirit | John 14:16-17 | GREEK | 43 | ✅ |
| resurrection | John 11:25 | GREEK | 18 | ✅ |
| ten_commandments | Exodus 20:3 | HEBREW | 7 | ✅ |
| heavens | Isaiah 66:1 | HEBREW | 18 | ✅ |
| sabbath | Exodus 20:8 | HEBREW | 5 | ✅ |
| death_state | Daniel 12:2 | HEBREW | 12 | ✅ |
| love_agape | John 3:16 | GREEK | 25 | ✅ |
| grace | Ephesians 2:8 | GREEK | 15 | ✅ |

Full machine-readable detail: `Part4-OriginalLanguageCompletion.json`.

## Two real defects found and repaired

### Defect 1 — narrow phrasing gap in original-language intent detection

`services/originalLanguageResponseFormatter.js`'s `isOriginalLanguageRequest`
regex required an explicit study-keyword ("word", "study", "gloss",
"lemma", "morphology", "transliteration", "Strong's") to co-occur with
"Hebrew"/"Aramaic"/"Greek"/"original language". Natural phrasings such as
*"What is the Hebrew **behind** Exodus 20:3?"* and *"What is the **original
Hebrew** in 2 Samuel 7:12?"* did not match, so those requests silently fell
through to `bible_wide_reasoning` (plain Scripture, no original-language
data) or to the OpenAI reason-first fallback instead of the governed
Phase 6B original-language lane.

**Fix:** extended the regex to also recognize `behind`, `underlying`,
`wording`, and a bare `original + (language|hebrew|aramaic|greek|text|wording)`
pattern. Kept the change narrow — did not add generic words like "used" or
"says" that would risk false-triggering on ordinary companion messages that
merely mention a language name in passing.

### Defect 2 — numbered-book reference extraction could starve itself of its own leading digit

`bibleWideReasoningEngine.extractExplicitScriptureReferences` uses a global
regex that advances past an entire failed candidate match. For input like
*"...Hebrew **in 2** Samuel 7:12"*, the first candidate match
(`"...Hebrew in 2"`) failed to resolve to a canonical book and was correctly
discarded — but the regex engine had already consumed the `2`, leaving only
`"Samuel 7:12"` for the next match, and bare `"Samuel"` does not canonicalize
(ambiguous between 1/2 Samuel). This silently dropped the reference for any
message where a numbered book (`1/2/3 Samuel`, `Kings`, `Chronicles`, `John`,
`Corinthians`, `Peter`, etc.) is preceded by other numeric-looking text.

**Fix:** when a candidate fails to resolve to any canonical book, the
extractor now retries starting one character later (`match.index + 1`)
instead of jumping past the whole failed span, so the digit remains
available to the following, more specific candidate. Verified this does not
change behavior for any previously-passing reference shape (`John 3:16`,
`1 Corinthians 13:4-7`, `2 Kings 2:11`, `3 John 4`, multi-reference messages).

## Regression proof after both fixes

| Suite | Result |
|---|---|
| `scriptureFidelitySmoke.js` | 4/4 PASS |
| `alphaCoreTruthSmoke.js` | 6/6 PASS |
| `decisionOwnershipSmoke.js` | 4/4 PASS |
| `phase6eTestMatrix.js` | 38/38 PASS |

No doctrine, authority, or routing architecture was redesigned. Both fixes
are additive, narrow, and only widen recognition of already-intended,
already-governed lanes (original-language study, explicit-reference
retrieval) — they do not introduce a new lane, provider, or authority path.

## What was verified is already complete, not newly built

Per Phase 6B, the full original-language study response
(`formatOriginalLanguageReply`) already exposes, for every resolvable
reference:

- KJV baseline text
- Actual Hebrew/Aramaic (OSHB) or Greek (Nestle 1904) original text
- Transliteration per token
- Token-by-token lemma, morphology, Strong's number, and literal gloss
- All KJV renderings of that Strong's entry (never alphabetical-lexicon
  "contextual meaning" — this is the source dataset's own gloss, presented
  as-is with limitations noted when thin)
- Literal study rendering
- Source dataset name and license per token
- Explicit limitations when a passage or token lacks full coverage

Part 4 did not need to build new original-language infrastructure — the
work was (a) proving 10 high-priority doctrine passages actually resolve
real data with no fabrication, and (b) closing the two routing gaps above
so ordinary users asking in natural phrasing actually reach that governed
data instead of falling through to an ungoverned OpenAI answer.

## Remaining known limitation (documented, not fixed — out of Part 4 scope)

Casual, un-anchored doctrine questions with **no explicit chapter:verse**
(e.g. "What is the Hebrew word for Comforter?" with no reference) still
require the user to supply or be prompted for a specific reference, because
`getPassageStudy` operates on a resolved reference, not a topic. This is
consistent with the existing Phase 6B design (reference-scoped original-
language study) and was not a Part 4 requirement to change.
