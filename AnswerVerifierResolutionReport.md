# AnswerVerifier Resolution Report

**Date:** 2026-06-06  
**Deploy commit (Render):** `57b3f96` — *Deploy OpenAI-first hard cutover and Bible learning evidence stack*  
**Render error:** `Cannot find module './answerVerifier'`  
**Require stack:** `doctrineBoundaryValidator.js` → `reasonFirstComposer.js` → `openAiFirstCompanionRuntime.js` → `buddyBrain.js` → `routes/buddy.js`

**Investigation only — no code changes, deploy, or push.**

---

## ROOT CAUSE

**`services/doctrineBoundaryValidator.js` was committed in `57b3f96` with `require('./answerVerifier')`, but `services/answerVerifier.js` was never added to git.**

The file exists on the local filesystem as an **untracked** file (`git status: ??`). Render clones only committed files, so `services/answerVerifier.js` is **absent** on the server. Node module resolution fails at load time when `doctrineBoundaryValidator.js` is first required.

This is a **deploy parity / missing dependency file** failure — not a wrong relative path and not a case-sensitivity mismatch.

---

## Summary table

| Field | Value |
|-------|-------|
| **ROOT CAUSE** | Committed importer; **uncommitted** `answerVerifier.js` |
| **FILE (failing require)** | `services/doctrineBoundaryValidator.js` |
| **LINE** | **6** |
| **EXPECTED PATH** | `services/answerVerifier.js` (from `./answerVerifier` in `services/`) |
| **ACTUAL PATH ON RENDER** | **File does not exist** in checkout at `57b3f96` |
| **LOCAL EXISTS** | **Yes** — `services/answerVerifier.js` (6998 bytes, untracked) |
| **GIT EXISTS** | **No** — `git ls-files \| grep answerVerifier` returns empty |
| **IN COMMIT 57b3f96** | **No** |
| **RENDER SHOULD LOAD FROM** | `/opt/render/project/src/services/answerVerifier.js` (or equivalent app root + `services/answerVerifier.js`) — **missing from deploy tree** |

---

## 1. All `require` matches for `answerVerifier`

| # | File | Line | Require statement | Caller chain to Render crash |
|---|------|------|-------------------|------------------------------|
| 1 | `services/doctrineBoundaryValidator.js` | **6** | `require('./answerVerifier')` | **`routes/buddy.js`** → `buddyBrain.runBuddy` → **`openAiFirstCompanionRuntime`** → **`reasonFirstComposer`** (line 8: `require('./doctrineBoundaryValidator')`) → **line 6: `require('./answerVerifier')` CRASH** |
| 2 | `services/companionPostureValidator.js` | 9 | `require('./answerVerifier')` | Not on `openAiFirst` hot path; file also **untracked** |
| 3 | `services/answerMatchGate.js` | 11 | `require('./answerVerifier')` | `masterBuddyRuntime` / shadow paths only; file also **untracked** |
| 4 | `scripts/sprint2FinalCReasoningFirstHttp.js` | 12 | `require('../services/answerVerifier')` | Script only; not server boot |

**Render stack matches row 1 exactly** — crash at module load when `reasonFirstComposer` pulls in `doctrineBoundaryValidator`.

### Hot-path chain (committed files only)

```
POST /buddy/chat
  routes/buddy.js
    require('../services/buddyBrain')
      buddyBrain.js → runOpenAiFirstCompanionRuntime
        openAiFirstCompanionRuntime.js
          require('./reasonFirstComposer')          [line 8]
            reasonFirstComposer.js
              require('./doctrineBoundaryValidator') [line 8]
                doctrineBoundaryValidator.js
                  require('./answerVerifier')        [line 6]  ← MODULE_NOT_FOUND
```

Crash occurs **before** `validateReasonFirstReply()` runs — at **first `require()`** of `doctrineBoundaryValidator` during process startup / first route load.

---

## 2. File existence — local

```bash
$ ls -la services/answerVerifier.js
-rw-r--r--  6998  services/answerVerifier.js
```

**Present locally.**

---

## 3. File existence — git

```bash
$ git ls-files | grep answerVerifier
(no output)

$ git status --short services/answerVerifier.js
?? services/answerVerifier.js

$ git show 57b3f96:services/answerVerifier.js
fatal: path 'services/answerVerifier.js' exists on disk, but not in '57b3f96'
```

**Not tracked. Not in deploy commit.**

### Related untracked dependents (not in `57b3f96`)

| File | Tracked | In `57b3f96` | Notes |
|------|---------|--------------|-------|
| `services/answerVerifier.js` | No | No | **Direct missing module** |
| `services/answerMatchGate.js` | No | No | Also requires `answerVerifier` |
| `services/companionPostureValidator.js` | No | No | Also requires `answerVerifier` |
| `services/metaAnswerResponder.js` | No | No | Required by `answerVerifier.js` if it were added |
| `services/doctrineBoundaryValidator.js` | **Yes** | **Yes** | **Requires missing `answerVerifier`** |

---

## 4. Case sensitivity

| Path checked | Present locally |
|--------------|-----------------|
| `services/answerVerifier.js` | **Yes** (only match) |
| `services/AnswerVerifier.js` | No |
| `services/answerverifier.js` | No |

Importer uses:

```javascript
require('./answerVerifier');
```

Casing matches the local filename. **Not a case-sensitivity issue** — the file is simply missing from the Render checkout.

---

## 5. `doctrineBoundaryValidator.js` — exact require

```6:6:services/doctrineBoundaryValidator.js
const { countHistoryTemplateMarkers } = require('./answerVerifier');
```

| Check | Result |
|-------|--------|
| Relative path correct? | **Yes** — resolves to `services/answerVerifier.js` when cwd is `services/` |
| Path typo? | **No** |
| File on Render? | **No** |

**Usage in same file (line 72):**

```javascript
if (countHistoryTemplateMarkers(reply) >= 2) {
```

Export exists locally in `answerVerifier.js` line 215: `countHistoryTemplateMarkers`.

---

## 6. Why local regression can pass

Local workspace has `services/answerVerifier.js` on disk (untracked). `require('./answerVerifier')` succeeds. Render checkout at `57b3f96` does not include that file → **MODULE_NOT_FOUND**.

This also explains the Companion UI mask symptom on Render:

1. Request hits `/buddy/chat`
2. `runBuddy` throws during module load / first compose require
3. `routes/buddy.js` catch → **500** `{ ok: false, error: "Cannot find module './answerVerifier'" }`
4. `index.html` ignores `data.ok` → `payload.reply` **undefined** → client mask *"I'm here with you. Tell me a little more."*

---

## 7. Render resolution path

On Render (Linux, case-sensitive), Node resolves:

```
<appRoot>/services/doctrineBoundaryValidator.js
  require('./answerVerifier')
    → <appRoot>/services/answerVerifier.js   ← NOT PRESENT at 57b3f96
```

**RENDER SHOULD LOAD FROM:** `services/answerVerifier.js` relative to repository root — file must be **committed and deployed** for resolution to succeed.

---

## 8. `git ls-files | grep answerVerifier`

```
(empty — no tracked files matching answerVerifier)
```

---

**STOP — report only. No code changes. No deploy. No push.**

**End of report.**
