# JSON Encoding Audit

**Type:** Maintenance fix (encoding only)  
**Generated:** 2026-06-02  
**Scope:** U+00A0 (non-breaking space) in JSON files — no runtime, routing, or architecture changes

---

## Summary

Local validation surfaced repeated console errors:

```
Error reading project-brain file providers.json Unexpected token ' ', "[
  {
    "k"... is not valid JSON
```

**Root cause:** `project-brain/providers.json` used **84 U+00A0 non-breaking spaces** for indentation. JSON permits only ASCII space, tab, LF, and CR as whitespace — not U+00A0.

**Fix applied:** Replaced all U+00A0 with normal ASCII spaces (U+0020) in the one blocking file.

---

## Corrected Files

| File | Action | NBSP before | NBSP after |
|------|--------|-------------|------------|
| `project-brain/providers.json` | **Corrected** | 84 | 0 |

**Total files corrected:** 1

---

## Before / After Validation — `project-brain/providers.json`

| Check | Before | After |
|-------|--------|-------|
| U+00A0 count | 84 | 0 |
| File size (bytes) | 749 | 749 |
| `JSON.parse()` | **FAIL** — `Unexpected token ' '` | **PASS** |
| Parsed array length | — | 3 entries |
| `projectBrain.getSnapshot().providers` | Fallback `[]` (parse error caught) | **3 providers loaded** |
| Console error on load | Yes — logged each `getSnapshot()` call | **None** |

### Before (`JSON.parse` error)

```
Unexpected token ' ', "[
  {
    "k"... is not valid JSON
```

### After (`JSON.parse` success)

```json
[
  { "key": "BIBLE_TEXT", "name": "Bible Text API", ... },
  { "key": "FOOD_SCAN", "name": "Food Scan API", ... },
  { "key": "HEALTH_METRICS", "name": "Health Metrics API", ... }
]
```

---

## Repository-Wide U+00A0 Scan (all `*.json` files)

Full recursive scan excluding `node_modules` and `.git`.

| File | U+00A0 count | `JSON.parse()` | Blocker? | Notes |
|------|--------------|----------------|----------|-------|
| `project-brain/providers.json` | 0 (was 84) | **PASS** | Was **YES** — **fixed** | Indentation used NBSP |
| `docs/release-gate/latest-gate-results.json` | 211 | **PASS** | **No** | NBSP embedded inside string values (copied error log output); valid JSON |

All other JSON files in the repository: **0 U+00A0 characters**.

### Other project-brain JSON (unchanged, already valid)

| File | U+00A0 | `JSON.parse()` |
|------|--------|----------------|
| `project-brain/avatars.json` | 0 | PASS |
| `project-brain/competitors.json` | 0 | PASS |
| `project-brain/modules.json` | 0 | PASS |
| `project-brain/phases.json` | 0 | PASS |

---

## What Was NOT Changed

- No runtime logic, routing, doctrine, memory, responders, or companion behavior
- No changes to `services/projectBrain.js` (fallback already handled errors gracefully)
- No changes to `docs/release-gate/latest-gate-results.json` (parses successfully; generated artifact containing error text strings)
- No Sprint work, architecture changes, or pushes

---

## Recommendation (informational only)

If `docs/release-gate/latest-gate-results.json` is regenerated after this fix, NBSP characters in its `outputTail` strings should disappear. No manual edit required unless cosmetic cleanup of historical gate output is desired.

---

**Maintenance fix complete.**
