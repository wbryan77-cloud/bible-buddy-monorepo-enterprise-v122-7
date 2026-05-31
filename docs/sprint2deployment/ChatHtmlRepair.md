# Sprint 2.DEPLOYMENT — chat.html Repair

**File:** `public/chat.html`  
**Audited:** 2026-05-31

---

## Mismatch Found

| Item | Before | Production route |
|------|--------|------------------|
| Endpoint | `POST /api/ai/chat` | `POST /buddy/chat` |
| Route exists? | **No** — no handler in server.js | **Yes** — routes/buddy.js |
| Request body | `{ user: text }` | `{ userId, mode, personaKey, message }` |
| Response parse | `data.reply` string | `data.reply.reply` object |

---

## Exact Fix Applied

```javascript
// BEFORE (broken)
const res = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user: text })
});
addMessage('assistant', data.reply || '(no reply)');

// AFTER (parity with index.html)
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
const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
addMessage('assistant', payload.reply || '(no reply)');
```

---

## Status

| Check | Result |
|-------|--------|
| Endpoint corrected | ✅ `/buddy/chat` |
| Payload matches index.html | ✅ |
| Response parsing | ✅ |
| Committed | Pending Sprint 2.DEPLOYMENT commit |
| Deployed | Pending push |

---

## Reference (working UI)

`public/index.html` L484–498 uses the same `/buddy/chat` contract.
