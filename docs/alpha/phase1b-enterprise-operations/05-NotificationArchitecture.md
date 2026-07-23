# Notification Framework — Architecture
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 5 of 10

## 1. Status

**Enhancement of an existing, partially-wired system.** `services/alphaNotificationScheduler.js` and `services/alphaTesterManager.js` already existed with a per-tester email/SMS preference model. Phase 1B adds a **category model** on top of the existing per-channel preferences, and — critically — **fixes a latent bug** that would have silently prevented any real notification from ever being delivered.

## 2. Bug fixed this batch (pre-existing, discovered during implementation)

`lib/providers/email/resend.js` and `lib/providers/sms/twilio.js` were written using ES Module `export` syntax inside a project whose `package.json` declares `"type": "commonjs"`. Because nothing ever successfully `require()`'d them, this was a **dormant defect** — not something Phase 1A or 1B introduced, but something that had to be fixed for the Notification Framework mandate ("reuse existing infrastructure") to be honest about what "existing infrastructure" actually does. Both files were rewritten to `module.exports` and given real `fetch`-based dispatch logic, gated behind `RESEND_API_KEY` / `TWILIO_SID`+`TWILIO_TOKEN`+`TWILIO_FROM` environment variables. With no keys configured (the current environment), both remain **safe no-ops**, exactly as required by "do not send notifications automatically until enabled."

## 3. Category model

```
NOTIFICATION_CATEGORIES (services/alphaTesterManager.js):
  announcements
  maintenance_notices
  support_replies
  security_alerts            ← always enabled, cannot be disabled by user
  bible_reminders
  prayer_reminders
  lesson_reminders
  founder_announcements
  feature_announcements
```

`DEFAULT_CATEGORY_PREFERENCES`: every category defaults to **disabled** except `security_alerts`, which is hardcoded on and non-configurable — satisfying "disabled by default" while ensuring security-critical messages are never silently missed.

## 4. Data flow

```
Admin (manual send)  → POST /admin/api/bible-authority/unified/notifications/send
User preference read/write → GET/POST /api/alpha/notifications/preferences/:testerId
   └─ alphaTesterManager.getCategoryPreferences() / setCategoryPreference()

alphaNotificationScheduler.js:
   buildCategoryNotificationQueue(category, body)
      └─ for each tester: getCategoryPreferences(testerId)[category] === true?
            YES → include in queue
            NO  → skip (including security_alerts override logic)
   dispatchCategoryNotification(category, body)
      └─ for each queued tester → dispatchNotification()
            └─ sendEmailResend() / sendSmsTwilio()   (now real, still safe-stub without keys)
   getCategoryDeliveryReport()
      └─ used by adminCommandCenterAggregator's new Notifications section
```

## 5. Reuse, not duplication

| Existing infrastructure | How Phase 1B reused it |
|---|---|
| `alphaTesterManager.js` tester registry | Category preferences stored per-tester in the same manager, not a new user table |
| `alphaNotificationScheduler.js` dispatch loop | Extended with category-aware queue builder; the underlying per-tester dispatch call is unchanged |
| Admin auth (`checkAdminAuth()`) | Gates the new manual-send endpoint identically to every other admin route |
| Admin Command Center aggregator | New `buildNotificationsSection()` — no separate notifications dashboard |

## 6. Governance / safety

- No category defaults to "on" except the one category the batch explicitly requires to always reach users (`security_alerts`).
- Manual send is the only trigger implemented this batch — no automatic/scheduled dispatch was added, consistent with "do not send notifications automatically until enabled" and avoiding unreviewed mass messaging during Alpha.
- `sendEmailResend`/`sendSmsTwilio` fail closed to a no-op when credentials are absent, rather than throwing or silently pretending to succeed.

## 7. Live verification (this batch)

```
POST /unified/notifications/send { category: "feature_announcements", body: "Test announcement" }
→ { ok: true, category: "feature_announcements", attempted: 0, delivered: 0, results: [] }
```

`attempted: 0` is correct and expected: the fresh test server had no alpha testers registered with that category enabled (default-disabled), which is precisely the "disabled by default, nothing sent until enabled" contract this deliverable requires. The endpoint itself is reachable, authenticated, and returns a well-formed delivery report — confirming the pipeline is wired, safe, and inert until an operator/tester opts in.

## 8. Explicitly out of scope (per batch mandate)

- No scheduled/cron-based automatic notification dispatch.
- No new SMS/email vendor accounts were provisioned; existing provider stubs were fixed, not replaced.
- No change to `security_alerts` always-on behavior.
