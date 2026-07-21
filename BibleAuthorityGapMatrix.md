# Bible Authority Gap Matrix

**Date:** 2026-06-07  
**Source:** `docs/regression-trace/bae-gap-audit.json` (offline retrieval + validator)  
**Live OpenAI claims:** pending API key

---

## Doctrine trace table

| Topic | Question | Evidence available | Retrieved | Chain refs | Catalog | Binding rules | Validator blocks drift | Doctrine confidence | Root cause if live drift |
|-------|----------|:------------------:|:---------:|:----------:|:-------:|:-------------:|:----------------------:|:-------------------:|--------------------------|
| Third heaven | What is the third heaven? | ✅ | ✅ heavens | 10 | threeHeavens | 10 | ✅ D | High | — |
| Kingdom | What is the kingdom of God? | ✅ | ✅ kingdom | 7 | kingdomComesToEarth | 10 | ✅ D | High | — |
| Death state | What happens when we die? | ✅ | ✅ deathState | 6* | stateOfTheDead | 4 | ✅ D | High | — |
| Resurrection | Scripture teach resurrection? | ✅ | ✅ deathState* | 6* | stateOfTheDead* | 4 | ✅ C/D | Medium | **A→fixed** routing |
| Acts 10 | Does Acts 10 make pork clean? | ✅ | ✅ dietaryLaw | 7 | — | 0 | ✅ D | Medium | — |
| Clean/unclean | Is pork unclean? | ✅ | ✅ dietaryLaw | 7 | — | 0 | ✅ D | Medium | — |
| Sabbath | How keep Sabbath holy? | ✅ | ✅ sabbath | 8 | — | 0 | ✅ D | Medium | — |
| Holy days | What feasts commanded? | ✅ | ✅ feasts | 6* | — | 0 | ✅ C | Medium | — |
| Logos | Logos in John 1:1? | ✅ | ✅ messiahLogos | 0 | — | 0 | ✅ C | Medium | **G** chain missing |
| Holy | What does holy mean? | ❌ | ❌ | 0 | — | 0 | ✅ C | Low | **A** no card |
| No ascended | No man ascended to heaven? | ✅ | ✅ heavens | 10 | threeHeavens | 10 | ✅ D* | High | **E→fixed** |
| Cannot come | Where I go ye cannot come? | ✅ | ✅ kingdom | 7 | kingdomComesToEarth | 10 | ✅ D* | High | **E→fixed** |

\*Updated this session (chain wiring + validator patterns).

---

## Claims validation capability

| Capability | Status |
|------------|--------|
| Can prove third heaven naming (2 Cor 12:2) | ✅ A with binding |
| Can block third heaven destination | ✅ D |
| Can prove kingdom on earth | ✅ binding + catalog |
| Can block kingdom-in-heaven-only | ✅ D |
| Can prove sleep in death | ✅ deathState + catalog |
| Can block heaven-at-death | ✅ D |
| Can block Acts 10 pork clean | ✅ D |
| Can block Sunday replaced Sabbath | ✅ D |
| Can handle thin holy (no card) | ✅ C → denial required |
| Can block John 3:13 violation | ✅ D (fixed) |
| Can block cannot-come misread | ✅ D (fixed) |

---

## Root cause legend

| Code | Meaning | Topics affected |
|------|---------|-----------------|
| A | Evidence missing | holy |
| B | Evidence not sent | none detected |
| C | OpenAI ignored evidence | live only |
| D | claims[] weak | live only |
| E | Validator missed | ~~no_ascended, cannot_come~~ fixed |
| F | Citation without support | monitored live |
| G | Graph incomplete | logos (chain) |
| H | Routing failure | ~~resurrection~~ fixed |

---

## Evidence graph completeness

| Asset | Cards | Catalog | Chain | Binding |
|-------|:-----:|:-------:|:-----:|:-------:|
| Heavens | ✅ | ✅ | ✅ | ✅ |
| Kingdom | ✅ | ✅ | ✅ | ✅ |
| Death/resurrection | ✅ | ✅ | ✅* | partial |
| Dietary | ✅ | — | ✅ | partial |
| Sabbath | ✅ | — | ✅ | partial |
| Feasts | ✅ | — | ✅* | partial |
| Logos | ✅ | — | ❌ | partial |
| Holy (generic) | ❌ | — | — | — |

---

## Recommended fix order (authority system, not doctrine content)

1. **Live validation** with API key — prove claims[] compliance
2. **Logos chain wiring** — add catalog chain key if approved content exists (admin)
3. **Holy word study** — expansion gate: card or explicit thin-evidence denial policy
4. **Binding rules** on sabbath/dietary/death cards — metadata only, admin review
5. **IOG candidates** — admin pipeline only after live pass

**Artifact:** `node scripts/baeAuthorityGapAudit.js` → `docs/regression-trace/bae-gap-audit.json`
