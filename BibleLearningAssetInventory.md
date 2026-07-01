# Bible Learning Asset Inventory

**Date:** 2026-06-01  
**Mode:** Planning audit — no implementation until approved.  
**No beta · No deploy · No push · No Sprint 3**

**Core rule:** OpenAI authors final answers. Bible assets teach and constrain OpenAI. Doctrine validator checks output.

**Default live path today:** `routes/buddy.js` → `buddyBrain.runBuddy` → `openAiFirstCompanionRuntime` → `retrievalEvidencePack` → `reasonFirstComposer` → `doctrineBoundaryValidator`.

---

## Scoring legend

| Field | Meaning |
|-------|---------|
| **Strength (1–10)** | Scripture coverage, doctrinal clarity, reuse value as evidence |
| **Conflict risk** | Low / Medium / High — likelihood of wrong-topic bleed, template loops, or override |
| **Evidence-only today** | Whether asset is wired as facts/refs only on default path |
| **Can author final prose** | Whether module can return user-visible answer text without OpenAI |
| **Disposition** | **Stay** (as evidence) · **Move** (into Evidence Cards) · **Rewrite** · **Demote** · **Disable** (default path) |

---

## Tier 1 — Core evidence hub (keep, extend)

| File | Topic(s) | Scriptures (sample) | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|----------|---------------------|----------|----------|---------------|---------------|-------------|
| `services/retrievalEvidencePack.js` | All routed topics | Assembled per turn | 9 | Medium | **Yes** | No | **Stay** — central retrieval orchestrator |
| `services/doctrineEvidenceSnippets.js` | Sabbath, dietary, heavens, logos, traditions, death, capability | Lev 11, Deut 14, Acts 10/11, Is 66:17, 2 Cor 12:2, John 1, Jer 10, Eccl 9 | 7 | Low | **Yes** | No | **Rewrite** → seed Evidence Cards (proto-cards exist) |
| `services/answerGuidance.js` | Direct-answer flags, history gating | — | 8 | Low | **Yes** | No | **Stay** — composer routing facts |
| `services/doctrineBoundaries.js` | Topic detect, forbidden teachings | Keywords across doctrine | 8 | Low | **Yes** | No | **Stay** — validator + retrieval |
| `services/doctrineBoundaryValidator.js` | Post-compose guard | Witness/study markers | 8 | Low | N/A | No (regen only) | **Stay** — extend witness-count checks |
| `services/ownershipAntiOverrideGuard.js` | Question match, anti-loop | — | 8 | Low | N/A | No | **Stay** — Part F self-review hook |

---

## Tier 2 — Scripture chains & catalogs (evidence sources → Evidence Cards)

### Sabbath

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/bibleTopicCatalog.js` (`sabbath`) | Gen 2:2-3, Ex 20:8-11, Lev 23, Is 58, Luke 4, Acts 13/17, Heb 4:9 | 9 | Low | Yes | No | **Move** → Sabbath Evidence Card |
| `services/scriptureChainExpansion.js` | Sabbath chain alias | 8 | Low | Yes | No | **Move** — merge into card retrieval |
| `services/genesisToRevelationContinuityRegistry.js` (`sabbath`) | Tiered canonical chain | 9 | Medium | Yes | No | **Move** — primary/supporting split |
| `services/studyContinuityRuntime.js` (`sabbath`) | Same + runtime store | 7 | **High** | Partial | Fallback template risk | **Demote** — runtime notes only, not topic driver |
| `services/doctrineStudyCatalogResolver.js` | Study steps | 7 | Medium | Yes | No | **Move** — `questionTypes` mapping |
| `services/runtimeSabbathContinuityEngine.js` | Engine wrapper | 6 | Medium | Yes | No | **Stay** — optional continuity hints |
| `services/runtimeCanonicalSabbathRestFormationEngine.js` | Rest formation | 5 | Medium | Yes | No | **Demote** — low priority for v1 cards |
| `services/genealogyCaptivityIdentityCatalog.js` (`sabbathBlessingAndPunishment`) | Ex 20, Ex 31, Neh 13, Jer 17, Ezek 20 | 7 | Low | Yes | No | **Move** → supporting scriptures |

### Dietary law / clean & unclean / Acts 10 / Isaiah 66:17

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/bibleTopicCatalog.js` (`dietaryLaw`) | Lev 11, Deut 14, Dan 1, Acts 10:14/28, Acts 11, Is 66:17 | 9 | Low | Yes | No | **Move** → Dietary Evidence Card |
| `services/cleanUncleanSymbolismCatalog.js` | Lev 11, Deut 14, Acts 10, 2 Cor 6:14-18 | 8 | Medium | Yes | No | **Move** — cautionPassages / symbolism |
| `services/runtimeDietaryLawContinuityEngine.js` | Lev 11, Deut 14, Is 66, Dan 1 | 7 | Medium | Partial | No | **Stay** — user notes, not answer author |
| `services/genesisToRevelationContinuityRegistry.js` (`dietary_law`) | Canonical chain | 9 | Low | Yes | No | **Move** |
| `services/doctrineEvidenceSnippets.js` (dietary) | Acts 10 misreading notes | 8 | Low | Yes | No | **Rewrite** — expand `commonMisreadings` |

### Death state / resurrection / heaven / third heaven

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/deathResurrectionKingdomCatalog.js` | Eccl 9, Ps 146, John 11, 1 Thess 4; Gen 1, Deut 10:14, **2 Cor 12:2**, John 3:13; Rev 20 millennium | 9 | Medium | Yes | No | **Move** → Death + Heaven + Millennium cards |
| `services/resurrectionReferenceCatalog.js` | Dan 12, John 5, 1 Cor 15, 1 Thess 4 | 8 | Low | Yes | No | **Move** |
| `services/bibleTopicCatalog.js` (`resurrectionTimeline`) | Mat 12:40, resurrection accounts | 8 | Low | Yes | No | **Move** |
| `services/genesisToRevelationContinuityRegistry.js` (`death_resurrection`, `heaven_heavens`, `resurrection`) | Full chains | 9 | Medium | Yes | No | **Move** |
| `services/doctrineEvidenceSnippets.js` (heavens, death) | 2 Cor 12:2, layered heavens facts | 6 | Low | Yes | No | **Rewrite** — distinguish sky / celestial / third heaven |

### Logos / Jesus in Old Testament / Godhead

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/bibleTopicCatalog.js` (`jesusInBible`) | Gen 1:26, Ps 110, Is 9/53, John 1, Col 1, Rev 1 | 9 | Medium | Yes | No | **Move** → Messiah/Logos card |
| `services/treeOfLifeDoctrineCatalog.js` (`treeOfLife`, serpent) | John 1, John 6, Rev 22; serpent/satan themes | 8 | Medium | Yes | No | **Move** — separate Tree of Life / Serpent cards |
| `services/deathResurrectionKingdomCatalog.js` (`godheadFatherSon`, `holySpiritMessengerStudy`) | John 1, Heb 1, Rev 1/22 | 7 | **High** | Yes | No | **Move** — careful `conflictRisk` on Trinity wording |
| `services/genesisToRevelationContinuityRegistry.js` (`messiah`) | Gen 3:15 → Rev 5 chain | 9 | Low | Yes | No | **Move** |

### Feasts / high Sabbaths / Leviticus 23

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/feastsAndProphecyCatalog.js` | Lev 23 subdivisions, Ex 12, Luke 22, Acts 2, Zech 14, Rev | **10** | Medium | Yes | No | **Move** — primary feast evidence source |
| `services/bibleTopicCatalog.js` (`feastDaysHighSabbaths`) | Lev 23, Num 28-29, Acts 2, 1 Cor 5, Zech 14 | 8 | Low | Yes | No | **Move** |
| `services/runtimeFeastDayContinuityEngine.js` | Per-feast buckets | 7 | Medium | Partial | No | **Stay** — continuity notes |
| `services/genesisToRevelationContinuityRegistry.js` (`feast_days`) | Canonical chain | 8 | Low | Yes | No | **Move** |

### Law / commandments

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/priesthoodAndLawCatalog.js` | Mat 5:17-19, Rom 3:31, Heb 7-10, Dan 9:27, Rev 12/14/22 | **10** | Medium | Yes | No | **Move** → Law & Commandments card |
| `services/sacrificialLawReferenceCatalog.js` | Sacrifice vs commandment | 8 | Medium | Yes | No | **Move** — supporting |
| `services/studyContinuityRuntime.js` (`law`) | Mat 5, Dan 9:27, Heb 7-10 | 7 | Medium | Yes | No | **Move** |
| `services/coveringLawOrderReferenceCatalog.js` | Covering/law order | 6 | Medium | Yes | No | **Move** — v2 card |

### Traditions / Easter / Christmas

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/bibleTopicCatalog.js` (`traditionsOfMen`) | Deut 12, Jer 10, Mat 15, Mark 7, Col 2 | 8 | Low | Yes | No | **Move** |
| `services/treeOfLifeDoctrineCatalog.js` (`deceptionAndFalseWords`) | Deut 4/12, Mat 15, Mark 7, Rev 22 | 7 | Low | Yes | No | **Move** |
| `services/genesisToRevelationContinuityRegistry.js` (`traditions`) | Jer 10 chain | 8 | Low | Yes | No | **Move** |
| `services/doctrineEvidenceSnippets.js` (traditions) | Jer 10, Lev 23, Mark 7 | 7 | Low | Yes | No | **Rewrite** |

### Israel identity / captivity / genealogy / Noah → Jesus line

| File | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|------------|----------|----------|---------------|---------------|-------------|
| `services/genealogyCaptivityIdentityCatalog.js` | Gen 10-49, **Deut 28:68**, Ezek 37, Acts 10:34-35, Rom 11 | **10** | **High** | Yes | No | **Move** — captivity/ships card; block ethnic identity prose |
| `services/bibleTopicCatalog.js` (noah, tribes, captivity) | Gen 5-10, Deut 28, Ezek 37, Rev 7 | 9 | High | Yes | No | **Move** |
| `services/genesisToRevelationContinuityRegistry.js` (`captivity`, `remnant`, `egypt_bondage`) | Lev 26, Deut 28, Jer 16, Ezek 37 | 8 | High | Yes | No | **Move** |
| `services/historicalContextRouter.js` | Blocks identity misuse | 8 | Low | N/A | No | **Stay** — guardrail |

### Extended doctrine (Part G test topics — partial coverage today)

| File | Topic | Scriptures | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|-------|------------|----------|----------|---------------|---------------|-------------|
| `services/marriageChurchTonguesAndLineageCatalog.js` | Tongues, fornication, Esau/Edom | Acts 2, 1 Cor 14; Rev 17-18; Gen 25, Obadiah | 8 | Medium | Yes | No | **Move** → 3 cards |
| `services/feastsAndProphecyCatalog.js` | Abomination of desolation | Dan 9/11/12, Mat 24, 2 Thess 2 | 9 | Medium | Yes | No | **Move** |
| `services/genesisToRevelationContinuityRegistry.js` (`graven_images`) | Graven images / cross question | Ex 20, Deut 4-5, Is 40-46 | 7 | Medium | Yes | No | **Move** — new card |
| `services/prophecyCharacterAndAngelsCatalog.js` | Satan, Job, tribulation | Ezek 28, Isa 14, Job 1-2, Rev 12 | 8 | Medium | Yes | No | **Move** → Serpent/Satan card |
| `services/treeOfLifeDoctrineCatalog.js` | Tree of knowledge / serpent | Gen 3, Rev 12, 2 Cor 11 | 8 | Low | Yes | No | **Move** |
| `services/deathResurrectionKingdomCatalog.js` (`millennium`) | 1000-year reign, bottomless pit | Rev 20 | 8 | Medium | Yes | No | **Move** |
| `services/eschatologyReferenceCatalog.js` | End-times themes | Various | 7 | Medium | Yes | No | **Move** — v2 |
| `services/beastSystemReferenceCatalog.js` | Beast/Babylon | Dan 7, Rev 13-17 | 7 | Medium | Yes | No | **Move** — v2 |
| `services/babylonReferenceCatalog.js` | Babylon symbolism | Rev 17-18 | 7 | Medium | Yes | No | **Move** — v2 |

**Gap:** No dedicated Evidence Card yet for homosexuality/Sodom, lying, holy high Sabbaths (beyond feast catalog), or cross-as-graven-image edge cases — catalog fragments exist but need card authoring.

---

## Tier 3 — History (secondary evidence only)

| File | Topic | Strength | Conflict | Evidence-only | Authors prose | Disposition |
|------|-------|----------|----------|---------------|---------------|-------------|
| `services/sabbathHistoryDeepResponder.js` | Constantine, Laodicea, Rome, Sunday shift | 8 | **High** | Partial (pack when explicit Q) | **Yes** (master path) | **Demote** — `historySecondaryNotes` only; strip prose blocks |
| `services/historicalReferenceIndex.js` | Source labels | 7 | Low | Yes | No | **Stay** |
| `services/historicalEvidenceLayer.js` | Secondary labels | 6 | Low | Yes | No | **Stay** |
| `services/retrievalEvidencePack.js` (`parseHistoricalFacts`) | Parsed A–E chain | 7 | Medium | Yes | No | **Stay** — gated by `explicitHistorical` |

---

## Tier 4 — Template / study path authors (must not speak on default path)

| File | Topics | Strength as evidence | Conflict | Can author prose | Disposition |
|------|--------|---------------------|----------|------------------|-------------|
| `services/sourceGroundedResponder.js` | Sabbath, dietary, feasts, traditions, resurrection | 8 (content) | **High** | **Yes** (`BUDDY_OPENAI_FIRST=0`) | **Disable** default; mine → Evidence Cards |
| `services/companionDoctrinePresenter.js` | All core doctrine + witness | 7 | **High** | **Yes** (master) | **Disable** default |
| `services/registryStudyPresenter.js` | Registry study prose | 7 | **High** | **Yes** (master) | **Disable** default |
| `services/scriptureWitnessEngine.js` | Witness triplet connection text | 6 | **High** | Partial (paste risk) | **Demote** — internal labels only |
| `services/continueStudyEngine.js` | Study continuation | 5 | **High** | **Yes** (master) | **Disable** as answer opener |
| `services/studyConnectionIntent.js` | "You've been studying…" | 4 | **High** | **Yes** | **Disable** |
| `services/personalizedFallback.js` | Study speaker | 3 | **High** | **Yes** (when enabled) | **Disabled** today via env |
| `services/companionLearningLayer.js` | Learning profile → study lines | 5 | **High** | **Yes** (via fallback) | **Disable** as answer author |
| `services/doctrineRuntimePipeline.js` | Template intercept | — | High | **Yes** (master) | **Disable** default |
| `services/doctrineCompanionPath.js` | Presenter orchestration | — | High | **Yes** (master) | **Disable** default |
| `services/masterBuddyRuntime.js` | Dispatches templates | — | High | **Yes** | Rollback only |

---

## Tier 5 — Runtime Scripture engines (103+ files)

Pattern: `services/runtimeScripture*.js`, `runtime*ContinuityEngine.js`

| Assessment | Detail |
|------------|--------|
| **Strength** | 4–7 individually; high overlap |
| **Conflict risk** | **High** collectively — duplicate traversal logic, loop risk, unclear ownership |
| **Evidence-only** | Partial — most feed context matrices, not direct prose |
| **Authors prose** | No directly; risk via enrichment bleed |
| **Disposition** | **Do not expand.** Freeze for v1 Scripture Learning Engine. Consolidate behind `retrievalEvidencePack` + Evidence Cards. Revisit only if a card needs a specific engine hook. |

Notable exceptions worth keeping wired:

- `services/runtimeLineUponLineTraversalEngine.js` — line-upon-line ordering helper
- `services/scriptureTeachingOrderEngine.js` — teaching order hints
- `services/runtimeDietaryLawContinuityEngine.js` / `runtimeFeastDayContinuityEngine.js` — per-user continuity notes (not answer authors)

---

## Tier 6 — Study paths & journey (context only)

| File | Role | Conflict | Disposition |
|------|------|----------|-------------|
| `services/studyJourneyEngine.js` | Journey context | High if surfaced in answer | **Demote** — post-answer optional only |
| `services/companionNextSteps.js` | Gentle next steps | Medium | **Stay** — after answer only |
| `services/continueStudyIntent.js` | Continue-study detect | High | **Disable** as opener |
| `services/continuityStudySessionRuntime.js` | Session persistence | Low | **Stay** — memory |
| `services/studyModeGating.js` | Study mode gate | Low | **Stay** |

---

## Tier 7 — Docs / validation artifacts

| File | Purpose | Disposition |
|------|---------|-------------|
| `BibleLearningArchitectureAudit.md` | Prior architecture audit | **Stay** — reference |
| `FinalResponseOwnershipAudit.md` | Ownership audit | **Stay** |
| `OwnershipCleanupImplementationReport.md` | 60/60 ownership pass | **Stay** |
| `docs/regression-trace/ownership-cleanup-results.json` | Battery results | **Stay** — baseline |
| `docs/sprint214b/sabbath-history-depth-results.json` | Sabbath history QA | **Stay** |
| `tests/automatedDoctrineQaHarness.js` | Doctrine QA harness | **Extend** → `bibleLearningEngineAudit.js` |

---

## Tier 8 — Bible Concordance (Part I — not started)

| Status | Detail |
|--------|--------|
| **Current** | No concordance file in repo; retrieval uses embedded catalogs and chains |
| **Planned** | Upload structured concordance (Strong's / cross-ref index) as **retrieval index only** |
| **Rule** | Concordance feeds Evidence Card `supportingScriptures` expansion — never final prose |
| **Disposition** | **Plan only** — implement after Evidence Cards v1 approved |

---

## Summary matrix by requested topic

| Topic | Primary evidence files | Template risk | Card priority |
|-------|------------------------|---------------|---------------|
| Sabbath | bibleTopicCatalog, doctrineEvidenceSnippets, registry | sabbathHistoryDeepResponder, sourceGroundedResponder | **P0** |
| Dietary / Acts 10 / Is 66:17 | dietaryLaw chain, cleanUncleanSymbolism, snippets | sourceGroundedResponder | **P0** |
| Death state | deathResurrectionKingdomCatalog | sourceGroundedResponder | **P0** |
| Heaven / third heaven | deathResurrectionKingdomCatalog, snippets | registryStudyPresenter | **P0** |
| Logos / Jesus OT | jesusInBible, messiah registry | companionDoctrinePresenter | **P0** |
| Feasts / high Sabbaths | feastsAndProphecyCatalog | sourceGroundedResponder | **P1** |
| Law / commandments | priesthoodAndLawCatalog | sourceGroundedResponder | **P1** |
| Traditions / Easter / Christmas | traditionsOfMen, snippets | learning profile bleed | **P0** |
| Israel / Deut 28:68 | genealogyCaptivityIdentityCatalog | identity history misuse | **P1** |
| Resurrection timeline | resurrectionTimeline, resurrectionReferenceCatalog | sourceGroundedResponder | **P1** |
| Abomination of desolation | feastsAndProphecyCatalog | — | **P1** |
| Fornication / tongues / Esau | marriageChurchTonguesAndLineageCatalog | — | **P2** |
| Graven images / cross | graven_images registry | — | **P2** |
| Serpent / Satan / tree | treeOfLifeDoctrineCatalog, prophecyCharacterAndAngels | — | **P2** |
| Millennium | deathResurrectionKingdomCatalog | — | **P2** |
| Noah → Jesus line | bibleTopicCatalog, genealogy catalogs | registryStudyPresenter | **P2** |

---

## Inventory conclusion

**~45 catalog/chain files** contain valuable Scripture learning content. **~15 template/study modules** must never own final prose on the default path. **~100 runtime Scripture engines** should remain frozen until Evidence Cards prove which hooks are actually needed.

**`doctrineEvidenceSnippets.js` is the proto Evidence Card layer** — small, composer-safe, and the right pattern to scale. **`sourceGroundedResponder.js` and presenters** hold the richest canned prose and are the highest loop risk if re-enabled.
