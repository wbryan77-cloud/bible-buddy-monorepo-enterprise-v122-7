# Pre-Commit Chat Route Audit

**File:** `public/chat.html`  
**Generated:** 2026-05-31

---

## Endpoint Verification

| Check | Result |
|-------|--------|
| Current endpoint | **`/buddy/chat`** ✅ |
| Old broken endpoint | `/api/ai/chat` — **not present** |
| Production companion route | `POST /buddy/chat` |

---

## Exact File and Line

```254:263:public/chat.html
          const res = await fetch('/buddy/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'chat-html-user',
              mode: 'COMPANION',
              personaKey: 'ADAPTIVE_COMPANION',
              message: text
            })
          });
```

---

## Response Parsing (L269–271)

```javascript
const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
addMessage('assistant', payload.reply || '(no reply)');
```

Matches `public/index.html` contract.

---

## Status

| Item | Value |
|------|-------|
| Mismatch exists? | **No** — already repaired |
| Staged for commit? | ✅ Yes (`public/chat.html` in staged set) |
| Committed on HEAD? | ❌ No (still old version on origin until push) |

---

## Reference UI

`public/index.html` L484 — also uses `/buddy/chat` ✅
