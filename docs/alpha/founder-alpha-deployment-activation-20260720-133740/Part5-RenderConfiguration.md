# Part 5 — Render Deployment Discovery

## 1. Access Check

- No `RENDER_API_KEY` (or any Render credential) is present in the environment, in `.env`, or in
  any MCP server available to this session (only `cursor-app-control` and `cursor-ide-browser` are
  configured; neither is a Render integration).
- No authenticated browser session to the Render dashboard exists. Per instruction, this batch
  does **not** attempt to guess, request, or fabricate Render login credentials.

**Result: Render API/dashboard access is unavailable to this batch.**
**Status: `RENDER_DASHBOARD_ACTION_REQUIRED`.**

This matches the same finding already recorded in the prior Founder Alpha Deployment Verification
batch — nothing has changed about access availability.

## 2. What Can Be Determined Without Render Access

From repository evidence only (the hardcoded URL referenced in
`scripts/runPhase5OContinuationRegression.js` and previously probed in the Deployment Verification
batch):

- **Public host:** `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com` — reachable,
  `/health` previously returned HTTP 200.
- **Service name (inferred from URL and `render.yaml`):** `bible-buddy` (per `render.yaml`
  `name: bible-buddy`) — the URL slug `bible-buddy-monorepo-enterprise-v122-7` does not exactly
  match `render.yaml`'s declared `name`, which itself is worth flagging: **the live service was
  most likely created directly from the GitHub repo name (auto-generated slug) rather than exactly
  from a `render.yaml` Blueprint sync**, since Render normally uses the `name:` field verbatim (or
  a de-duplicated variant of it) as the service slug when deploying via Blueprint. This is
  circumstantial, not certain, without dashboard access.
- **Tracked branch:** **unknown** — cannot be determined without dashboard/API access. The
  previously-observed live behavior (older code, missing the message-length guard, 404 on the
  Admin path) proves the live service is **not** currently tracking a commit that includes the
  Phase 6F+ work, regardless of which branch it is nominally set to track.
- **Auto-deploy status:** `render.yaml` declares `autoDeploy: true`, but this only takes effect if
  the live service was created via Blueprint sync from this exact file, or if auto-deploy was
  separately enabled in the dashboard for whichever branch it tracks. Unknown without access.
- **Service ID, deployment history, exact env vars present, custom domains, SSL status, runtime
  region, service status:** all **unknown** without dashboard/API access. None of these will be
  guessed.

## 3. Exact Manual Deployment Sequence (for a human with Render dashboard access)

1. **Open the Render dashboard** → the `bible-buddy` (or equivalently-named) web service backing
   `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`.
2. **Settings → Build & Deploy:**
   - Confirm/set **Branch** to `sprint-2c-c3-explicit-scripture-handoff`.
   - Confirm **Build Command** is `npm install` (must **not** contain `prisma migrate`).
   - Confirm **Start Command** is `node server.js`.
   - Confirm **Health Check Path** is `/health`.
   - Confirm **Auto-Deploy** is `Yes` if continuous deployment from this branch is desired, or
     leave `No` and deploy manually per step 4.
3. **Settings → Environment:** confirm the following env vars exist (names only; do not paste
   these instructions with real values into any log or ticket):
   - `NODE_ENV=production`
   - `OPENAI_API_KEY` (secret — required for OpenAI-authored companion responses)
   - `BIBLE_AUTHORITY_ADMIN_TOKEN` (secret — **required before Founder invitations**; currently
     undeclared on the live service per the Deployment Verification batch's finding that Admin
     routes 404/are unprotected on the live host)
   - `BUDDY_RUNTIME=legacy`, `BUDDY_TEMPLATE_PROSE=0`, `BUDDY_DISABLE_STUDY_FALLBACK=1`,
     `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0`, `PHASE_AUTOSTART=1`, `AI_DEPLOYMENT_AGENT=enabled`,
     `TIMEZONE=America/Chicago`, `PERSISTENCE=MEMORY`, `SABBATH_QUIET=true`,
     `SUNDAY_RENEWAL_TIME=08:00`, `QUEUE_RATE_PER_MINUTE=60`, `QUEUE_MAX_RETRIES=5`
   - The remaining declared-but-currently-unused vars (`POSTGRES_PRISMA`, `DATABASE_URL`,
     `REDIS_URL`, `EMAIL_PROVIDER`, `RESEND_API_KEY`, `SMS_PROVIDER`, `TWILIO_*`, `ADMIN_PASSWORD`)
     may be left as-is; none of them affect the currently-shipped Founder Alpha feature set.
4. **Deploy the exact baseline:**
   - If Auto-Deploy is enabled and the branch above is already tracked, push already triggers a
     deploy — confirm the in-progress/most-recent deploy's commit is `6d8a254f9ecef84af66ff70f8b8510d2c6fbf56d`
     (or later, on the same branch) by checking the Deploys tab.
   - If Auto-Deploy is off, or the branch was just changed in step 2, click **Manual Deploy → Deploy
     latest commit** (or select commit `6d8a254f9ecef84af66ff70f8b8510d2c6fbf56d` specifically if a
     commit picker is available).
   - Optionally: to deploy the exact tagged, immutable release point instead of the branch tip,
     point the service at tag `founder-alpha-v1.0.0` (dereferences to commit
     `d34d9f0f95c7cba8300221c4c70b6e89d0f48d18`) — note this predates the Part 4
     `BIBLE_AUTHORITY_ADMIN_TOKEN` render.yaml declaration fix by one commit; deploying the branch
     tip (`6d8a254`) is recommended instead so that fix is included.
5. **Monitor the deploy** in the Render dashboard Logs tab until it reaches `Live`. Watch for the
   startup log lines this codebase emits (`✅ OpenAI client ready`, or equivalent boot confirmation)
   and absence of build errors.
6. **Verify** using the checks in Part 7 of this report against the public host.

## 4. What This Batch Did NOT Do

- Did not guess or fabricate any Render service ID, API key, dashboard login, or env var value.
- Did not claim a deployment occurred. No deploy was triggered by this batch (no access to do so).
- Did not modify any Render-side configuration (only the repository's own `render.yaml`, in Part 4).

**RENDER_DASHBOARD_ACTION_REQUIRED: Yes.** A human with Render dashboard access must perform
the steps in §3 to bring the live service up to the verified Founder Alpha baseline.
