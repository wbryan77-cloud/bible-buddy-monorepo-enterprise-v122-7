# Bible Learning Architecture Audit

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Mode:** Audit only — no implementation.

**Core question:** Are Scripture/doctrine files **teaching OpenAI as evidence**, or **replacing OpenAI as canned answers**?

---

## Summary verdict

| Mode | Status on default `/buddy/chat` today |
|------|--------------------------------------|
| **Evidence for OpenAI** | **Partially** — `retrievalEvidencePack`, `doctrineEvidenceSnippets`, `scriptureChainExpansion`, `doctrineBoundaries` |
| **Canned final templates** | **Still present in repo**; bypassed on core path but **OpenAI often pastes evidence**; **fallback still speaks** on errors/profile bleed |

**Bible-first intent (line upon line, Genesis–Revelation)** is encoded in evidence and composer instructions, but **not consistently expressed in final user-visible prose** when fallback or evidence-dump behavior wins.

---

## Architecture layers

```text
EVIDENCE LAYER (should teach OpenAI)
├── bibleTopicCatalog.js          — topic titles, scriptureChain metadata
├── scriptureChainExpansion.js    — getScriptureChain(sabbath|dietaryLaw|…)
├── doctrineBoundaries.js         — topic keywords, forbidden teachings
├── doctrineEvidenceSnippets.js   — per-turn facts/refs (core path)
├── retrievalEvidencePack.js      — assembles pack for composer
├── sabbathHistoryDeepResponder.js — HISTORICAL_CHAIN (facts, not live author on core)
└── sourceGroundedResponder.js    — FULL canned replies (legacy)

TEMPLATE LAYER (must not speak on default path)
├── scriptureWitnessEngine.js     — "establishes the matter…" triplet
├── companionDoctrinePresenter.js — witness + study prompts
├── sourceGroundedResponder.js    — sabbathReply, dietaryLawReply, …
├── sabbathHistoryDeepResponder.js — full history blocks
└── registryStudyPresenter.js     — registry template prose

AUTHOR LAYER (default path)
├── reasonFirstComposer.js        — OpenAI JSON compose
└── openAiFirstCompanionRuntime.js — orchestrator

GUARDRAIL LAYER
└── doctrineBoundaryValidator.js  — post-compose check (soft regen today)
```

---

## PART D — Doctrine area matrix

### Sabbath

| Item | Detail |
|------|--------|
| **Source files** | `bibleTopicCatalog.js`, `scriptureChainExpansion.js` (chain `sabbath`), `doctrineEvidenceSnippets.js`, `sabbathHistoryDeepResponder.js`, `sourceGroundedResponder.sabbathReply`, `companionDoctrinePresenter.js` |
| **Evidence snippets available** | Genesis 2:2-3, Ex 20:8-11, Is 58:13-14, Luke 4:16, Acts Sabbath refs, HOW hints, misreadingsToAvoid |
| **Inserted into OpenAI prompt?** | **Yes** — via `evidencePack.scripture` + `doctrine.snippets` + `answerGuidance` when topic/message match |
| **Used as final prose?** | **On core path:** OpenAI composes; **risk:** history chain pasted or Sunday narrative on HOW questions. **On rollback:** full templates |
| **Can override OpenAI?** | Fallback no; OpenAI self-paste yes; master path yes |
| **Helps or loops?** | **Helps** when HOW answered from Ex/Is/Luke; **loops** when Constantine/Laodicea used without historical ask |

### Dietary law / swine / pork

| Item | Detail |
|------|--------|
| **Source files** | `doctrineBoundaries.js` (keywords), `scriptureChainExpansion` (`dietaryLaw`), `doctrineEvidenceSnippets.js`, `sourceGroundedResponder.dietaryLawReply` |
| **Evidence snippets** | Lev 11, Deut 14, Is 66:17, Acts 10:28/11, yesNoHint |
| **In prompt?** | **Yes** when topic `dietary_law` or pork/swine in message |
| **Final prose?** | OpenAI often **dumps reference blocks** without yes/no lead; fallback may say "studying dietary law" |
| **Override OpenAI?** | Template path on rollback; learning profile on fallback |
| **Helps or loops?** | **Helps** if composer leads yes/no; **loops** if Lev/Deut/Daniel block repeats |

### Acts 10

| Item | Detail |
|------|--------|
| **Source files** | `doctrineEvidenceSnippets.js` (Peter/Gentiles context), `sourceGroundedResponder`, `doctrineBoundaries` |
| **Evidence** | Acts 10:28, 11:1-18; warning not to auto-permit unclean food |
| **In prompt?** | When dietary topic or Acts mentioned |
| **Final prose?** | OpenAI-authored; quality depends on direct-answer rules |
| **Override?** | No template on core |
| **Helps or loops?** | **Helps** when used as context after yes/no; **loops** if Acts 10 taught as pork permission without Peter’s explanation |

### Isaiah 66:17

| Item | Detail |
|------|--------|
| **Source files** | `doctrineEvidenceSnippets.js`, chains/catalog |
| **Evidence** | Reference listed in dietary snippet |
| **In prompt?** | With dietary/swine questions |
| **Final prose?** | OpenAI |
| **Helps or loops?** | Helps as supporting ref; loop if stacked mechanically |

### Traditions / Easter / Christmas

| Item | Detail |
|------|--------|
| **Source files** | `doctrineBoundaries.js` (`traditions` keywords), `bibleTopicCatalog`, `sourceGroundedResponder`, `companionLearningLayer` (favorite topic **traditions**) |
| **Evidence** | Jeremiah 10, feast/tradition boundaries |
| **In prompt?** | When message mentions Easter/Christmas |
| **Final prose?** | OpenAI; **fallback** may say "You've been studying **traditions**" (user-observed on heavens question — profile bleed) |
| **Override?** | **Learning profile → personalizedFallback** |
| **Helps or loops?** | **Major loop source** via wrong favoriteTopic on unrelated questions |

### Death state

| Item | Detail |
|------|--------|
| **Source files** | `doctrineBoundaries` (heaven-at-death boundary), catalog/chains resurrection |
| **Evidence** | Boundaries in pack; limited dedicated snippets |
| **In prompt?** | Via topic detection |
| **Final prose?** | OpenAI |
| **Helps or loops?** | Needs richer evidence snippets; validator blocks false doctrine |

### Heaven / heavens / third heaven

| Item | Detail |
|------|--------|
| **Source files** | `doctrineEvidenceSnippets` (heavens topic), `doctrineBoundaries` keywords |
| **Evidence** | Gen 1:1, 2 Cor 12:2, Deut 10:14, Ps 148 |
| **In prompt?** | When "heaven" in message |
| **Final prose?** | **Often fallback** (user report) not OpenAI |
| **Override?** | **personalizedFallback + traditions study line** |
| **Helps or loops?** | **Broken** when fallback speaks; evidence adequate if OpenAI called |

### Logos / Jesus in Old Testament

| Item | Detail |
|------|--------|
| **Source files** | `doctrineEvidenceSnippets` (messiah_logos), `doctrineBoundaries` (messiah_logos keywords) |
| **Evidence** | John 1, Is 9:6, Micah 5:2, Col 1, Heb 1 |
| **In prompt?** | When Logos/Jesus/OT God detected |
| **Final prose?** | OpenAI; wording questions need meta guidance |
| **Helps or loops?** | Loops if Rome/Sabbath history substituted |

### Law / commandments

| Item | Detail |
|------|--------|
| **Source files** | `bibleTopicCatalog`, chains, boundaries (law_abolished) |
| **Evidence** | Boundaries + chain refs |
| **In prompt?** | Topic detection |
| **Final prose?** | OpenAI |
| **Helps or loops?** | Validator prevents "law abolished" teaching |

### Clean and unclean

| Item | Detail |
|------|--------|
| **Source files** | Same as dietary_law |
| **Evidence** | Lev 11, Deut 14 |
| **In prompt?** | Yes |
| **Final prose?** | OpenAI / fallback |
| **Helps or loops?** | Same as dietary |

### Feast days

| Item | Detail |
|------|--------|
| **Source files** | `bibleTopicCatalog` feastDaysHighSabbaths, chains |
| **Evidence** | Lev 23 refs in catalog |
| **In prompt?** | When feast keywords match |
| **Final prose?** | OpenAI on core |
| **Helps or loops?** | Generally evidence-only on core |

---

## Evidence vs template — file-level classification

| File | Role today | Should be |
|------|------------|-----------|
| `retrievalEvidencePack.js` | **Evidence assembler** | KEEP — sole doctrine input to composer |
| `doctrineEvidenceSnippets.js` | **Evidence** | EXPAND all doctrine areas |
| `scriptureChainExpansion.js` | **Evidence** | KEEP — refs only |
| `bibleTopicCatalog.js` | **Evidence metadata** | KEEP |
| `doctrineBoundaries.js` | **Evidence + validator input** | KEEP |
| `scriptureWitnessEngine.js` | **Template prose generator** | DEMOTE — refs only, delete connection text from live |
| `sourceGroundedResponder.js` | **Full template author** | REMOVE from `/buddy/chat` |
| `companionDoctrinePresenter.js` | **Template author** | REMOVE from default |
| `sabbathHistoryDeepResponder.js` | **Template + fact store** | KEEP facts; REMOVE build* from live |
| `personalizedFallback.js` | **Study/fallback author** | REMOVE as answer |

---

## Is evidence actually reaching OpenAI?

**Yes**, when `openaiCalled === true`:

```javascript
// reasonFirstComposer.js — user payload includes:
evidence: { memory, scripture, history, doctrine, understanding, companionContext, answerGuidance }
// system prompt includes Evidence pack (facts only): JSON.stringify(evidenceSlice)
```

**Gaps:**

1. **`runtimeContext.memory`** in `enrichRuntimeContextWithMemory` can be **large** — may dilute focus (Render OOM risk).
2. **`history.included`** can still be true when misclassified; practical Sabbath HOW should force `included: false` (partially implemented).
3. **`answerGuidance`** is not a hard contract — composer can ignore yes/no lead.
4. **No snippet coverage** for Easter/traditions/death-state at same depth as dietary/Sabbath.

---

## Does evidence override OpenAI?

| Mechanism | Overrides? |
|-----------|------------|
| Template responders on core path | **No** (bypassed) |
| personalizedFallback | **Yes** — replaces entire answer |
| Validator regen | **Partial** — up to 4 attempts; may still fail soft |
| stripDangerousFallbackSpeaker | **Partial** — strips phrases; may leave thin reply |
| Learning profile → fallback | **Yes** — unrelated question gets "studying traditions" |

---

## Recommended Bible learning model (target)

1. **Single evidence builder:** `retrievalEvidencePack` + expanded `doctrineEvidenceSnippets` for every doctrine area in PART D.
2. **Structured evidence shape:** `{ references: [], facts: [], boundaries: [], misreadingsToAvoid: [], answerShape: "yes_no_first" | "how_to" | "wording" }`.
3. **No prose generators** in the hot path — witness engine returns `{ refs: [] }` only.
4. **Validator enforces answer shape** — fail regen if study opener or witness triplet or missing yes/no.
5. **History object** `{ included: false, reason }` unless explicit historical question.
6. **Line upon line** — composer instruction to weave refs naturally, never paste catalog blocks.

---

## Related documents

- [FinalResponseOwnershipAudit.md](FinalResponseOwnershipAudit.md) — ownership + mutators + deletion plan  
- [OwnershipDamageRanking.json](docs/regression-trace/OwnershipDamageRanking.json) — damage estimates + live failure mapping  
- [RenderMemoryStabilityNotes.md](RenderMemoryStabilityNotes.md) — OOM / connection failures  

**Stop:** Audit complete. No code changes in this task.
