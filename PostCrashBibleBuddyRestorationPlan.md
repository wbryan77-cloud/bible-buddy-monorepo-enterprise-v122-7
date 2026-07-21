# Post-Crash BibleBuddy Restoration Plan

**Date:** 2026-06-06  
**Priority:** CRITICAL  
**Scope:** Doctrine-quality restoration after OpenAI-first hard cutover and Render crash fix (`1095f92`)  
**Status:** AUDIT ONLY — no implementation, deploy, or push

---

## Executive summary

Production is **reachable again** after commit `1095f92` fixed the missing `answerVerifier` / `metaAnswerResponder` dependency chain. OpenAI-first routing is **locked and working** for normal turns (`openAiCalled: true`, Logos/heavens paths verified live).

What is **not yet restored** is the intended **Bible-first companion design**: rich Scripture evidence constraining OpenAI, validator coverage for tradition drift (especially heavens/kingdom), companion warmth without template speakers, and frontend contract hygiene.

This plan separates **what must stay disabled** (the systems that caused loops and override) from **what can safely return** (evidence, validators, tone guidance only).

---

## Intended architecture (target state)

```
User message
  → listen and identify current intent (currentMessageIntent)
  → retrieve approved Scripture / KJV / original-language evidence (retrievalEvidencePack)
  → reason line upon line, precept upon precept (OpenAI via reasonFirstComposer)
  → validator checks Scripture boundaries / tradition drift / KJV-first policy
  → companion tone shapes warmth only (polish/sanitize — not authorship)
  → final answer
```

**Invariant:** OpenAI remains the only normal final answer author. Crisis protocol and transparent connection-error messages are the only accepted non-OpenAI exceptions.

---

## What is working now

| Area | Status | Evidence |
|------|--------|----------|
| OpenAI-first routing lock | ✅ | `buddyBrain.runBuddy` → `openAiFirstCompanionRuntime` only; env bypasses warn and ignore |
| Template responders bypassed | ✅ | `sourceGroundedResponderUsed`, `sabbathHistoryDeepResponderUsed` always false on live path |
| Intent layer active | ✅ | `currentMessageIntent.js` drives evidence constraints |
| Evidence Cards in pack | ✅ | Up to 2 frozen cards per turn via `retrievalEvidencePack` |
| Guard stack active | ✅ | doctrine + ownership + directness + forbidden-prose guards |
| API failure hygiene | ✅ | `buildConnectionErrorReply` — no study/template fallback on failure |
| Production HTTP 200 | ✅ | Post-`1095f92` live Logos test: 200, non-empty reply, `openAiCalled: true` |
| Local regression (architecture) | ✅ | `emergencyHardCutoverRegression.js` — 18/18 PASS |
| Ownership battery (pre-cutover) | ✅ | 60/60, heavens/pork/Sabbath corrections OK when quota available |

---

## What is still failing

| Area | Symptom | Root cause class |
|------|---------|------------------|
| Bible-first doctrine depth | Thin or tradition-leaning answers on heavens/kingdom/death | Evidence gaps + unwired catalogs, not routing |
| Kingdom topic | No frozen card, no continuity chain | Asset gap |
| Heavens / third heaven | Risk of collapsing layers or implying believer destination | Thin `heavens.card.js`; rich `deathResurrectionKingdomCatalog.threeHeavens` unwired |
| KJV-first enforcement | Prompt says KJV; no validator blocks NIV/ESV quotes | Policy gap in validators |
| Companion warmth | Can feel cold or generic post-cutover | ECP/golden examples/relationship enrichment disabled |
| UI contract (`index.html`) | Client mask on falsy `reply` | Frontend does not check `res.ok` / `data.ok` |
| Render memory | "Web Service exceeded its memory limit" | See `RenderMemoryStabilityAudit.md` |
| Uncommitted local drift | `routes/buddy.js` capture, Sabbath responder changes | Not in production deploy |

---

## Part A — Systems removed, disabled, bypassed, or demoted

Audit sources: `EmergencyHardCutoverRootCauseReport.md`, `OpenAIFirstRestorationReport.md` (superseded), live code in `openAiFirstCompanionRuntime.js`, `buddyBrain.js`, `retrievalEvidencePack.js`.

### A.1 Runtime routing — bypassed / hard-disabled

| System | File | Status | Classification |
|--------|------|--------|----------------|
| `masterBuddyRuntime` (route-first orchestrator) | `services/masterBuddyRuntime.js` | Bypassed | **5 — Never restore as final prose author** |
| `reasonFirstBuddyRuntime` | `services/reasonFirstBuddyRuntime.js` | Bypassed; `BUDDY_RUNTIME=reason_first` blocked | **5** |
| `BUDDY_OPENAI_FIRST=0` rollback | `services/buddyBrain.js` ~1007–1014 | Disabled | **1 — Keep disabled forever** |
| `routeOwnershipTable` route resolution | `services/routeOwnershipTable.js` | Bypassed | **5** |
| `generateAnswer` / `generateOpenAnswer` template dispatch | `services/masterBuddyRuntime.js` | Bypassed | **5** |
| `applyAnswerMatchGate` → `metaAnswerResponder` template regen | `services/answerMatchGate.js` | Bypassed on live path | **5** |

### A.2 Intermediate restoration path — demoted then cut off

| System | File | Status | Classification |
|--------|------|--------|----------------|
| `doctrineCompanionPath` (Sabbath/doctrine narrow path) | `services/doctrineCompanionPath.js` | Zero callers on live path | **2 — Restore as evidence-only** |
| `continue_study` / `memory_recall` short-circuits | formerly in runtime | Removed | **2** |
| `companionRetrievalHints` | `services/companionRetrievalHints.js` | Orphaned — not imported | **2** |
| Golden examples appendix | `services/reasonFirstComposer.js` ~119 | Disabled when `coreRestoration: true` | **2** (optional prompt context) |
| ECP composer block | `services/reasonFirstComposer.js` ~120–122 | Disabled when `coreRestoration: true` | **4 — Tone guidance only** |

### A.3 Template responders — demoted from final speakers

| System | File | Classification |
|--------|------|----------------|
| `sourceGroundedResponder` | `services/sourceGroundedResponder.js` | **2 — Evidence-only** |
| `scriptureWitnessEngine` | `services/scriptureWitnessEngine.js` | **2** |
| `companionDoctrinePresenter` | `services/companionDoctrinePresenter.js` | **2** |
| `sabbathHistoryDeepResponder` | `services/sabbathHistoryDeepResponder.js` | **2** |
| `healthCompanionResponse` / `griefCompanionResponse` / `prayerCompanionResponse` | respective files | **2** |
| `companionDiscernmentResponder` | `services/companionDiscernmentResponder.js` | **5** |
| `metaAnswerResponder` | `services/metaAnswerResponder.js` | **5** (validator helper only via `answerVerifier`) |
| `continueStudyIntent` / `studyConnectionIntent` | respective files | **2** |
| `buildMemoryRecallStructured` | `services/buddyBrain.js` | **2** |
| `companionLearningLayer` study speaker | `services/companionLearningLayer.js` | **2** |
| `registryStudyPresenter` prose path | `services/registryStudyPresenter.js` | **2** |

### A.4 Post-compose presentation — disabled

| System | File | Classification |
|--------|------|----------------|
| `BUDDY_TEMPLATE_PROSE=0` gate (`hardCutover`) | `services/buddyBrain.js` ~697 | **1 — Keep disabled** |
| `enrichResponseWithRelationshipIntelligence` | `services/companionRelationshipOrchestrator.js` | **5** as post-append speaker; **4** as prompt context only |
| `buildCompanionNextSteps` | `services/companionNextSteps.js` | **5** |
| `skipRelationshipEnrichment` / `skipStudyPrompts` | `services/openAiFirstCompanionRuntime.js` | **1 — Keep disabled** on core turns |
| Generic "tell me a little more" route fallback | `routes/buddy.js` (removed) | **5** |
| `personalizedFallback` as primary answer | `services/personalizedFallback.js` | **5** |
| Psalm 46 / study-loop fallback | `personalizedFallback` + guards | **5** |

**Accepted non-OpenAI exceptions (keep active):** crisis protocol (`buddyBrain.fallbackReply`), `buildConnectionErrorReply` (`coreResponseGuards.js`).

### A.5 Evidence retrieval demotions (`routingHintsOnly: true`)

| Behavior | File | Classification |
|----------|------|----------------|
| `activeConversation` as route owner | `retrievalEvidencePack.js` ~394 | **2** — summary as context only |
| Follow-up / correction inheritance for routing | ~401–408 | **2** |
| Topic from prior sessions | ~433–439 | **2** — current message only |
| `studyState` retrieval | ~523–526 | **2** — suppressed unless intent unclear |
| `history.included` | ~445–452 | **2** — only when `historyAllowed` |
| `currentMessageIntent` layer | `services/currentMessageIntent.js` | **2** |

### A.6 Guards — enabled (replacement for template speakers)

| System | Classification |
|--------|----------------|
| `forbiddenProseGuard` | **3 — Validator-only** |
| `coreResponseGuards` | **3** |
| `directnessGuard` | **3** |
| `ownershipAntiOverrideGuard` | **3** |
| `doctrineBoundaryValidator` | **3** |
| `listeningSpecificityValidator` | **3** (soft recommendations) |

### A.7 Tone — still active

| System | Classification |
|--------|----------------|
| `polishCompanionReply` | **4 — Tone guidance only** |
| `runtimeResponseSanitizer` | **4** |
| `runtimeLabelStripper` | **4** |
| `lightPolish` in composer | **4** |
| `buildSystemPrompt` North Star warmth lines | **4** (prompt guidance) |

### A.8 What caused old loops — must not return

| Loop pattern | Mechanism | Why it failed |
|--------------|-----------|---------------|
| Study continuation override | `personalizedFallback`, `continueStudyIntent`, study state routing | Answered new questions with prior study topic |
| Witness triplet prose | `scriptureWitnessEngine`, `sourceGroundedResponder` | Pasted "establishes the matter" blocks as final answer |
| Sabbath history template | `sabbathHistoryDeepResponder`, history chains | HOW questions got Constantine/Laodicea instead of Scripture |
| Route-first dispatch | `masterBuddyRuntime.generateAnswer` | Wrong responder owned final prose |
| Meta template regen | `metaAnswerResponder` via `answerMatchGate` | Re-authored with canned correction prose |
| Relationship post-append | `enrichResponseWithRelationshipIntelligence` | Appended study/memory lines after OpenAI |
| Client mask | `public/index.html:498` | Hid HTTP failures as "Tell me a little more" |
| Env rollback | `BUDDY_OPENAI_FIRST=0` | Re-enabled multi-speaker chaos |

---

## Part B — Scripture foundation gap audit

Evidence stack: `services/evidenceCards/`, `docs/bible-learning/`, `services/scriptureDiscoveryEngine.js`, `services/concordanceFoundation.js`, `services/doctrineEvidenceSnippets.js`, `services/deathResurrectionKingdomCatalog.js` (unwired).

### Topic matrix

| Topic | Evidence Card | Registry | Continuity chain | Language chain | Concordance | Snippets | Typical failure mode | Validator gap | Admin review needed |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|---|---|---|
| **Heavens / third heaven** | ✅ `heavens.card.js` | ✅ | ❌ | ✅ G3772 | ✅ | ✅ | Collapsing sky/firmament/Paul's third heaven; implying believers "go to" third heaven | No rule for unsupported believer-destination claims | Wire `threeHeavens` catalog → continuity; expand card scriptures |
| **Kingdom on earth** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Generic church-kingdom language; heaven-as-destination drift | No kingdom-specific boundary | **New `kingdom.card.js` + continuity chain** from `kingdomComesToEarth` catalog |
| **"Where I go ye cannot come"** | ❌ (subtopic) | ❌ | ❌ | ❌ | ❌ | ❌ | Conflated with believer heaven-at-death | No John 7/8/13/14 sequence validator | Sub-card or passage bundle under heavens/kingdom |
| **"No man hath ascended"** | ⚠️ partial | ⚠️ | ❌ | ⚠️ John 3:13 in catalog only | ❌ | ⚠️ | Skipped or misapplied vs 2 Cor 12:2 | Validator: distinguish Paul’s vision from general ascension | Add John 3:13 to heavens card primary scriptures |
| **John 14 / second coming** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | "Mansions in heaven" tradition vs return/coming | No John 14:3 destination validator | Kingdom/heavens card cross-link |
| **Revelation 21 / kingdom coming down** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | New Jerusalem as "we go there now" | No earth-kingdom boundary | Kingdom card with Rev 21:1-3, 5:10, 11:15 |
| **Sabbath** | ✅ full stack | ✅ | ✅ | ✅ H7676 | ✅ | ✅ | Unsolicited Sunday history on HOW | ✅ directness + doctrine boundaries | Low — best-covered topic |
| **Clean / unclean** | ✅ `dietaryLaw` | ✅ | ✅ | ✅ | ✅ | ✅ | Acts 10 misread as pork permission | ✅ `dietary_abolished` boundary | Acts 10 context notes in card |
| **Acts 10** | ✅ via dietary | ✅ | ✅ 10:28, 11:1-18 | ✅ 10:14 | ✅ | ✅ | "All foods clean" without Peter’s explanation | Partial — no standalone Acts 10 validator | Optional standalone clarification card |
| **Death state** | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ narrow trigger | Heaven-at-death assumed | ✅ `heaven_at_death` pattern only | Expand snippets; link to kingdom/resurrection |
| **Logos** | ✅ `messiahLogos` | ✅ | ✅ | ✅ G3056 | ✅ | ⚠️ narrow regex | Works when triggered; may miss simple "Logos" | `missing_word_study` directness | Broaden trigger in `index.js` |
| **Law / commandments** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | "Law abolished" or vague grace-only | ✅ `law_abolished` boundary | Continuity chain + snippets |
| **Feasts** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ via `feast_days` | Lev 23 depth shallow | Partial | Language/concordance seeds |

### Cross-cutting gaps

1. **2-card cap** (`evidenceCards/index.js`) — compound turns (Sabbath + feasts + kingdom) drop cards.
2. **`TOPIC_TO_CHAIN` mapping** — heavens, death_state, law_commandments, kingdom get cards but no doctrine scripture chain from `retrieveScriptureEvidence()`.
3. **Concordance bulk** — phases 1B–2 planned; only 6 seed entries in `concordance-index-plan.json`.
4. **`deathResurrectionKingdomCatalog.js`** — rich teaching orders for `threeHeavens`, `kingdomComesToEarth`, `stateOfTheDead` — **not wired** into evidence pack or discovery JSON.

---

## Part C — Heavens / kingdom case study

### Failed conversation pattern (pre- and post-cutover)

**User intent:** "What is the third heaven?" / "How many heavens are there?"

**Observed failures (historical):**

1. **Study-loop override** — redirected to traditions/Christmas study instead of answering heavens (pre-ownership cleanup; fixed in routing, not evidence).
2. **Tradition drift** — treating "third heaven" as where believers go at death or afterlife destination (common evangelical default; not proven from the listed passages).
3. **Layer collapse** — counting heavens as one metaphysical place instead of distinguishing firmament/sky (Gen 1:6-8), celestial region (Gen 1:14-17), and Paul's "third heaven" (2 Cor 12:2).
4. **Thin evidence** — `heavens.card.js` lists only 5 primary scriptures; missing John 3:13, John 7:33-34, John 8:21, John 13:33, John 14:3, Acts 1:9-11, Revelation passages that constrain *destination* teaching.

### Scripture-by-passage teaching role (evidence-only, not prose script)

| Reference | Role in answer | Caution |
|-----------|----------------|---------|
| **Genesis 1:1** | "Heavens" as created realm — foundation | Do not equate with Paul's third heaven |
| **Genesis 1:6-8** | Firmament/heaven as sky expanse — first layered use | Physical/sky sense |
| **Genesis 1:14-17** | Heavens as host of sun/moon/stars | Second layered sense |
| **Matthew 6:9-10** | Father in heaven; kingdom come **on earth** | Thy will done **on earth** — constrains away-from-earth-only kingdom |
| **John 3:13** | "No man hath ascended up to heaven" except Son of Man | Blocks casual "believers ascend to heaven" |
| **John 7:33-34** | "Where I am, thither ye cannot come" | Present-tense separation — not believer third-heaven destination |
| **John 8:21** | "Whither I go, ye cannot come" | Same constraint pattern |
| **John 13:33** | "Whither I go, ye cannot come" | Disciples cannot follow now |
| **John 14:3** | "I will come again, and receive you unto myself" | **Coming to believers** / gathering — not "you go to third heaven" |
| **Acts 1:9-11** | Ascension; "same manner" return | Second coming framework |
| **Revelation 5:10** | Saints reign **on earth** | Earth-kingdom evidence |
| **Revelation 11:15** | Kingdom of world becomes kingdom of Lord | Eschatological earth rule |
| **Revelation 20** | Thousand years; reign with Christ | Millennial earth context |
| **Revelation 21:1-3** | New heaven and earth; tabernacle **with men** | God dwells **with** men on earth |
| **2 Corinthians 12:2** | Paul caught up to **third heaven** (vision, man in Christ) | **Paul's exceptional vision** — not normative believer itinerary |

### How BibleBuddy should answer "What is the third heaven?"

**Without claiming believers go to the third heaven unless Scripture proves it:**

1. **Listen** — user asks definition/count, not grief or death comfort.
2. **Lead** — state in the first sentence that Scripture uses "heaven/heavens" in more than one sense, and that Paul alone names a "third heaven" in 2 Corinthians 12:2.
3. **Layer** — briefly distinguish sky/firmament (Gen 1:6-8), celestial heavens (Gen 1:14-17), and Paul's third heaven (2 Cor 12:2) without forcing a single church tradition count.
4. **Constrain destination** — cite John 3:13 and John 14:3 / Acts 1:11: Scripture emphasizes Christ's ascension and return; do not teach that ordinary believers are said to go to the "third heaven."
5. **Kingdom anchor** — if user asks where God's people inherit, point to Matthew 6:10, Revelation 5:10, 21:1-3 (kingdom/ dwelling **with** men) rather than third-heaven relocation.
6. **Warmth** — acknowledge if question connects to loss or hope; do not pivot to therapy or unsolicited study.

### Evidence Card proposal (admin review — do not implement)

**Proposed:** Expand `heavens.card.js` OR add `heavensThirdHeaven.card.js` (admin choice).

```yaml
cardId: heavens_third_heaven_v2
topic: heavens
status: proposed_admin_review
questionTypes: [third_heaven, how_many, where_do_believers_go, firmament]
primaryScriptures:
  - Genesis 1:6-8
  - Genesis 1:14-17
  - 2 Corinthians 12:2
  - John 3:13
supportingScriptures:
  - Matthew 6:9-10
  - John 7:33-34
  - John 8:21
  - John 13:33
  - John 14:3
  - Acts 1:9-11
  - Revelation 5:10
  - Revelation 21:1-3
cautionPassages:
  - "Do not teach believers 'go to' third heaven — 2 Cor 12:2 is Paul's vision"
  - "John 3:13 — no man hath ascended except the Son of Man"
  - "John 14:3 — I will come again (not you ascend to mansions now)"
commonMisreadings:
  - Equating third heaven with believer afterlife destination
  - Collapsing firmament, celestial, and Paul's third heaven into one count without distinction
  - Using John 14 mansions language to override Acts 1:11 return and Rev 21:3 dwelling with men
bibleFirstConclusion: >
  Scripture uses heaven in layered ways; only Paul names a third heaven (2 Cor 12:2).
  Destination hope for believers is framed around Christ's return and God's kingdom —
  not a proven itinerary to the third heaven.
evidenceOnlyAuthorship: true
wireFromCatalog: deathResurrectionKingdomCatalog.threeHeavens
companionToneHints:
  - Answer the count/definition first
  - Gentle if user ties question to deceased loved one — Scripture hope without heaven-at-death assumption
```

**Companion kingdom card (separate proposal):** `kingdom.card.js` from `kingdomComesToEarth` teaching order — admin review required before freeze.

---

## Part D — KJV-first / original language policy audit

### Current enforcement

| Layer | KJV policy | Gap |
|-------|------------|-----|
| `buildSystemPrompt` (`buddyBrain.js` ~316) | "Use KJV references when citing Scripture" | Prompt-only |
| `reasonFirstComposer` `COMPOSER_INSTRUCTION` | Scripture foundation; no translation named | No KJV hard requirement in composer block |
| `CORE_RESTORATION_INSTRUCTION` | Line upon line; evidence cards | No translation rule |
| `doctrineBoundaryValidator` | Forbidden teachings (Sunday, law abolished, heaven-at-death) | **No NIV/ESV/NLT quote detection** |
| `forbiddenProseGuard` | Template labels | No translation drift |
| `concordanceFoundation` | Transliteration + gloss when useful | ✅ aligned |
| `contentInsight.js` | KJV-only for sermon module | Not on buddy chat path |

### Policy gaps

1. **No validator** rejects non-KJV quoted verse text (NIV, ESV, NLT phrasing).
2. **No validator** flags paraphrase presented as direct quotation.
3. **Original language** — gloss appears in concordance hints but composer may over-use Greek/Hebrew without KJV anchor.
4. **Man-made tradition** — partial coverage via `FORBIDDEN_TEACHINGS`; no general "tradition stated as Scripture command" pattern beyond Christmas/Easter.
5. **History when not asked** — `directnessGuard` checks `HISTORY_MARKERS` (Constantine/Laodicea); does not catch all historical lecturing.
6. **Scripture interprets Scripture** — prompt intent only; no validator for single-verse proof-texting.

### Recommended validator / prompt improvements (do not implement)

| # | Improvement | Type |
|---|-------------|------|
| 1 | Add `translationDriftValidator`: detect common NIV/ESV/NLT phrase fingerprints in quoted text | Validator |
| 2 | Composer instruction: "Quote KJV only when quoting verse text; otherwise cite reference without invented wording" | Prompt |
| 3 | `unsupportedClaimValidator` for heavens/kingdom: patterns like "believers go to (the )?third heaven", "soul goes to heaven" beyond existing `heaven_at_death` | Validator |
| 4 | `historyWithoutIntentValidator`: count historical proper nouns when `historyAllowed=false` | Validator |
| 5 | Evidence pack flag `kjvFirst: true` on all scripture nodes | Evidence metadata |
| 6 | Original-language gloss cap: max 2 lemmas per turn unless user asks word study | Prompt + validator |
| 7 | `traditionAsDoctrineValidator`: "church teaches", "tradition holds" without Scripture cite when stating command | Validator (soft regen) |
| 8 | Require at least 2 Scripture references from evidence pack when `doctrine_explanation` intent | Soft validator |

---

## Part E — Companion warmth restoration audit

### What the hard cutover removed

| Warmth mechanism | Pre-cutover | Post-cutover | Safe return? |
|------------------|-------------|--------------|------------|
| `enrichResponseWithRelationshipIntelligence` | Post-appended prose | Skipped (`hardCutover`) | **No** as speaker; **Yes** as `runtimeContext.memory` slice in evidence |
| ECP (`BUDDY_ECP=1`) | First-paragraph emotional center | Disabled when `coreRestoration: true` | **Yes** — tone guidance in composer prompt only |
| Golden examples (`BUDDY_EXAMPLES=golden`) | Few-shot style appendix | Disabled when `coreRestoration: true` | **Yes** — prompt appendix only, not pasted |
| `companionRetrievalHints` | Health/grief/prayer context | Orphaned | **Yes** — merge into evidence pack |
| `buildSystemPrompt` North Star | Active | Active | **Already on** |
| `extractEmotionalCenter` | In user payload | Still extracted; ECP instruction off | **Yes** — re-enable ECP instruction without responder |
| `listeningSpecificityValidator` | Soft recommendations | Active | **Yes** — validator/tone |
| `polishCompanionReply` | Strips study-loop phrases | Active | **Yes** |
| Study next-steps / journey append | After reply | Disabled | **No** — caused loops |

### Warmth restoration principles

1. **Listen first** — `currentMessageIntent` + `emotional_companion` + `listeningSpecificityValidator` (already present).
2. **Reflect burden** — pass slim `emotionalCenter` + `detailCandidates` in user payload; enable ECP **composer instruction** only.
3. **Gently bring Scripture** — evidence cards + `CORE_RESTORATION_INSTRUCTION` "line upon line" (already present).
4. **Avoid therapy claims** — keep safety lines in `buildSystemPrompt`; do not re-enable health/grief **responders**.
5. **Not generic advice** — golden examples as style reference (env-gated), not answer templates.
6. **Not cold Q&A** — person-first reflect lines in `reasonFirstComposer.applyPersonFirstCompanionHierarchy` (already active).

### Systems safe to return as tone-only / prompt-guidance-only

| System | Return mode |
|--------|-------------|
| `emotionalCenter` + ECP instruction | Prompt block when `BUDDY_ECP=1`; no post-compose append |
| `goldenCompanionExamples` | Composer appendix when `BUDDY_EXAMPLES=golden`; disabled on `coreRestoration` until explicitly re-enabled as appendix-only |
| `companionRetrievalHints` | Evidence pack fields: `companionContext.griefHint`, etc. |
| Relationship memory | Slim slice in `evidencePack.memory` (top 3 memories, not 40) |
| `companionReplyPolish` | Keep active — removes robotic study phrases |

---

## Part G — Safe restoration architecture (next phase)

### Phase rules (non-negotiable)

1. **OpenAI** — sole final author for normal turns.
2. **Evidence Cards** — constrain and teach; never speak (`authorship: evidence_only_not_final_prose`).
3. **Scripture chains** — retrieval evidence; not scripts or witness triplets.
4. **Companion warmth** — tone guidance in prompt + polish; not responders.
5. **Validators** catch:
   - tradition drift
   - unsupported heaven/kingdom destination claims
   - non-KJV quotation drift
   - history when not asked
   - answer not matching latest question
6. **Learning engine** — admin-review findings only (`discoveryReinforcement`); no auto-merge into cards.

### Proposed implementation phases

| Phase | Focus | Risk |
|-------|-------|------|
| **Phase 1 — Stability** | Render memory ops (see companion audit); UI contract fix `index.html`; disable prod debug flags | Low |
| **Phase 2 — Evidence depth** | Kingdom card; expand heavens card; wire `deathResurrectionKingdomCatalog` → continuity JSON; law/feasts concordance seeds | Medium |
| **Phase 3 — Validators** | Translation drift; unsupported heaven/kingdom claims; history-without-intent | Medium |
| **Phase 4 — Warmth** | Re-enable ECP + golden appendix as prompt-only; slim relationship memory in evidence | Low–medium |
| **Phase 5 — Learning loop** | Admin review UI for `discoveryReinforcement`; no auto doctrine merge | Low |

---

## Top 10 restoration tasks (ranked by value / risk)

| Rank | Task | Value | Risk if wrong | Phase |
|------|------|-------|---------------|-------|
| 1 | Fix `index.html` HTTP/`data.ok` contract; remove client mask on error | High — stops false "tell me more" | Low | 1 |
| 2 | Add `kingdom.card.js` + continuity chain from `kingdomComesToEarth` | High — largest doctrine gap | Medium — needs admin freeze | 2 |
| 3 | Expand heavens evidence (John 3/7/8/13/14, Acts 1, Rev 5/11/21) | High — failed case study | Medium | 2 |
| 4 | Wire `deathResurrectionKingdomCatalog` into discovery JSON (read-only) | High | Low if evidence-only | 2 |
| 5 | Add `unsupportedHeavenKingdomClaimValidator` | High — stops tradition drift | Medium — false positives | 3 |
| 6 | Cap OpenAI regen budget (max 1 regen; reduce `maxAttempts`) | High — Render stability | Low | 1 |
| 7 | Re-enable ECP as composer instruction only (`BUDDY_ECP=1`) | Medium — warmth | Low if no responder | 4 |
| 8 | Add KJV / translation drift validator | Medium | Medium | 3 |
| 9 | Slim evidence payload to OpenAI (single serialization; cap memory) | Medium — memory | Low | 1 |
| 10 | Broaden Logos + law snippets and `TOPIC_TO_CHAIN` mapping | Medium | Low | 2 |

---

## What should stay disabled forever

- `masterBuddyRuntime` as live router
- Template responders as final speakers (`sourceGroundedResponder`, `sabbathHistoryDeepResponder`, `metaAnswerResponder` prose path)
- `personalizedFallback` / study-loop fallback as answer owner
- `BUDDY_OPENAI_FIRST=0` and `BUDDY_RUNTIME=reason_first` bypasses
- Post-compose relationship enrichment and study journey append
- Client-side generic mask replacing API errors
- Scripture witness triplet blocks in user-visible text
- Learning engine auto-merge into frozen cards

---

## What can safely return

- Evidence Cards + discovery reinforcement (admin-review only)
- Doctrine snippets + scripture continuity chains
- Concordance gloss hints
- Intent layer + directness/ownership/doctrine validators
- ECP + golden examples as **prompt appendix only**
- Slim relationship memory in evidence pack
- `companionReplyPolish` / sanitizers
- Crisis protocol + connection-error message

---

## Recommended next implementation phase

**Start with Phase 1 (Stability)** in parallel with **Phase 2 evidence for heavens/kingdom only** — no responder re-wiring, no template re-enablement, no `masterBuddyRuntime` restore.

Success criteria for next deploy:

1. "What is the third heaven?" — layered Scripture answer; no believer-destination claim without proof.
2. "Thy kingdom come" / kingdom on earth — cites Matt 6:10, Rev 21:1-3 from evidence pack.
3. No study-loop or witness labels in reply.
4. `openAiCalled: true`, `finalAnswerAuthor: openai`.
5. Render memory stable under 10 concurrent chats without OOM.

---

## Related documents

- `EmergencyHardCutoverRootCauseReport.md` — cutover architecture
- `RenderParityFixReport.md` — `1095f92` production fix
- `RenderMemoryStabilityAudit.md` — infrastructure stability
- `EmptyReplyRootCauseReport.md` — client mask analysis
- `OwnershipCleanupImplementationReport.md` — pre-cutover ownership battery

**End of restoration plan — audit only.**
