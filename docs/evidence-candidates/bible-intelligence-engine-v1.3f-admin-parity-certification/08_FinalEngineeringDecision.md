# 08 — Final Engineering Decision

## Certification

`CONFIGURATION_ACTION_REQUIRED`

## Proven root cause

Production fingerprint `9d04dcfc8c6d` ≠ probe fingerprint `17d6bfe05d1b`.

## Exact Founder action (one)

Set the Cursor/agent environment variable `BIBLE_AUTHORITY_ADMIN_TOKEN` to the same value as Render → bible-buddy → Environment → `BIBLE_AUTHORITY_ADMIN_TOKEN`.

Verify without exposing the secret:

```bash
python3 - <<'PY'
import os,hashlib,urllib.request,json
raw=(os.environ.get("BIBLE_AUTHORITY_ADMIN_TOKEN") or "").strip()
probe=hashlib.sha256(raw.encode()).hexdigest()[:12]
h=json.load(urllib.request.urlopen("https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/health"))["health"]
print("probe", probe)
print("prod ", h.get("adminAuthFingerprint"))
print("MATCH" if h.get("adminAuthFingerprint")==probe else "MISMATCH")
PY
```

Reply `CONTINUE` when MATCH. Authorized Admin + Mission Control proof resumes immediately.

## Repo repair shipped

Token trim + Bearer normalization + fingerprint health signal (`e528a5a`).
