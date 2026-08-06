# 03 — Minimal Repair

## Implemented (repository)

- File: `services/adminAuthMiddleware.js` — trim, case-insensitive Bearer, fingerprint helper
- File: `server.js` — health exposes `adminAuthFingerprint`
- SHA: `e528a5a`

## Operational action required

Align probe env secret to Render, or set Render to the probe secret and redeploy — without pasting values into chat — until fingerprints match.
