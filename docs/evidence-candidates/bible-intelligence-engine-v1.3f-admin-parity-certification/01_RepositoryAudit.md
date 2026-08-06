# 01 — Repository Audit

| Item | Finding |
|---|---|
| Auth owner | `services/adminAuthMiddleware.js` — sole production Admin gate |
| Variable precedence | BIBLE_AUTHORITY → ALPHA → BETA |
| Fail-closed | YES when unset or mismatch |
| Query `?token=` | Designed and retained |
| Health signals | `adminAuthConfigured`, `adminAuthFingerprint` (v1.3E/F) |
| Probe performer | Cursor agent shell issuing HTTPS to Render |
