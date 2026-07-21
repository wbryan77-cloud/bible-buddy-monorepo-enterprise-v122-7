# OpenAI Client Trace Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Scope:** PART A — `services/openaiClient.js` initialization audit  
**Artifact:** `docs/regression-trace/e2e-doctrine-env-parity-audit.json`

---

## Module source

```1:15:services/openaiClient.js
let openai = null;

try {
  const OpenAI = require("openai");

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log("✅ OpenAI client ready");
} catch (error) {
  console.warn("⚠️ OpenAI not ready yet:", error.message);
}

module.exports = openai;
```

---

## Initialization capture

| Field | Value |
|-------|-------|
| **API key source** | `process.env.OPENAI_API_KEY` at **first `require()`** |
| **dotenv source** | **Not in module** — `server.js` / audit scripts call `require('dotenv').config()` first |
| **Env precedence** | Shell `export` → `dotenv.config()` (default: does not override existing env) |
| **OPENAI_API_KEY present?** | ✅ Yes (proof run) |
| **Masked fingerprint** | prefix `sk-proj`, suffix `…k1YA`, len **164**, sha256_8 **`a38b6209`** |
| **Model** | `gpt-4.1-mini` (`OPENAI_MODEL` unset → default in `callOpenAI`) |
| **Base URL** | `https://api.openai.com/v1` (SDK default; no `OPENAI_BASE_URL`) |
| **Organization** | `null` |
| **Project** | `null` |
| **Timeout** | `600000` ms |
| **Max retries** | `2` |

---

## Module load order (critical)

```
1. require('dotenv').config()     ← MUST run first in entry script
2. require('./services/buddyBrain')  → requires openaiClient at line 3
3. openaiClient.js executes:
     new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
     ← key frozen for process lifetime
4. reasonFirstComposer.callOpenAI uses same singleton
```

**Singleton behavior:** Client is created **once** at module load. Changing `OPENAI_API_KEY` after `require('openaiClient')` does **not** update the client. A polluted key at first require causes persistent 401 until process restart.

---

## Client initialization path

| Runtime | Imports singleton? | Compose API |
|---------|-------------------|-------------|
| `buddyBrain.js` | ✅ line 3 | via `openAiFirstCompanionRuntime` |
| `openAiFirstCompanionRuntime.js` | via `composeReasonFirstReply` | production path |
| `reasonFirstComposer.js` | ✅ line 5 | **`callOpenAI` → `chat.completions.create`** |
| `masterBuddyRuntime.js` | ✅ | alternate |
| `adminBrain.js`, experiments | ✅ | non-production |

**Production path:** `runBuddy` → `openAiFirstCompanionRuntime` → `composeReasonFirstReply` → `callOpenAI` → singleton `chat.completions.create`

**Hard cutover:** `BUDDY_RUNTIME=legacy` in `render.yaml` is **warn-only**; `runBuddy` always uses `openAiFirstCompanionRuntime`.

---

## Proof-run client state

| Check | Result |
|-------|--------|
| Singleton null | **No** |
| `responses.create` | ✅ SUCCESS (1753 ms) |
| `chat.completions.create` (minimal JSON) | ✅ SUCCESS (562 ms) |
| Production-shaped compose | ✅ SUCCESS (6363 ms, 8994 tokens) |
