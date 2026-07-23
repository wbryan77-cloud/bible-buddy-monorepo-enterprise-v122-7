# User Assistance Platform (AI-2 — User Assistance AI) — Design
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 3 of 10

## 1. Status

**Net new**, per the Enterprise Architecture Review (confirmed absent from the codebase prior to this batch). Built by **reusing existing patterns** — the retrieve-from-approved-source / validate-before-answering / escalate-on-low-confidence pattern already proven by Companion AI's Scripture-authority pipeline, and the Admin Decision Queue's existing overlay pattern for escalation — rather than inventing new governance machinery.

## 2. Components

```
services/helpCenterContentStore.js       — sole knowledge source (CRUD over data/help-center-articles.json)
services/userAssistanceEscalationStore.js — append-only escalation log (data/user-assistance-escalations.jsonl)
services/userAssistanceAssistant.js       — AI-2 itself: scoring, answering, escalating, Bible-question redirect
routes/userAssistance.js                  — /api/support/* (public ask/browse, admin-gated CRUD/resolve)
```

## 3. Request flow

```
User (public site or admin) → POST /api/support/ask { question, testerId? }
   └─ userAssistanceAssistant.askUserAssistance()
         ├─ isBibleOrDoctrineQuestion(question)?
         │      YES → redirect to Companion AI's domain; AI-2 does NOT attempt to answer
         │      NO  → continue
         ├─ scoreArticle() against every published Help Center article
         │      (keyword/tag overlap scoring — deterministic, no LLM fact invention)
         ├─ best match score ≥ CONFIDENCE_THRESHOLD?
         │      YES → return the matched article's answer, cite the article id
         │      NO  → enqueueEscalation() into userAssistanceEscalationStore
         │             → visible immediately in the Admin Decision Queue
         │             (category: "Support Escalation")
```

## 4. Hard constraints enforced in code

| Mandate | Enforcement |
|---|---|
| Answer only from curated content | `askUserAssistance()` never calls an LLM to generate the answer body; it only selects and returns the text of an existing `helpCenterContentStore` article |
| Never invent functionality | Same as above — if no article matches with sufficient confidence, the system escalates instead of guessing |
| Never fabricate answers | Escalation path is the fallback, not free-text generation |
| Redirect Bible/doctrine questions | `isBibleOrDoctrineQuestion()` keyword-gate runs before scoring; matched questions are redirected, not answered, preserving Companion AI's sole ownership of Scripture/doctrine (per AI Responsibility Matrix rule 4) |
| Escalate on low confidence | `userAssistanceEscalationStore.enqueueEscalation()` — append-only JSONL, admin-resolvable |

## 5. Capabilities delivered (per batch checklist)

| Capability | Implementation |
|---|---|
| AI Help Assistant | `askUserAssistance()` |
| Contextual Help | Article `tags`/`category` filtering supports context-scoped lookups |
| Help Center | `helpCenterContentStore` CRUD + `GET /api/support/articles` |
| FAQs | Articles tagged `faq`; seeded with 7 starter articles |
| Guided onboarding | Seeded "Getting Started" category articles |
| Troubleshooting | Seeded "Troubleshooting" category articles |
| Feature explanations | Seeded "Features" category articles |
| Navigation assistance | Seeded "Navigation" category articles |
| Account guidance | Seeded "Account" category articles |
| Support escalation | `userAssistanceEscalationStore` + Decision Queue integration |

## 6. Admin surface

`admin/bible-authority.html` Command Center now includes a **User Assistance Platform** card: article authoring form, article stats, and a pending-escalations list with one-click resolve (`POST /admin/api/support/escalations/:id/resolve` — admin-gated by the Phase 1A unified `checkAdminAuth()` middleware).

## 7. Public surface

`public/index.html` gained a lightweight **Help & Support** modal: browse FAQs, ask a question via `askHelpAssistant()`, with a `getOrCreateGuestId()` helper so anonymous users can still have their escalations tracked/resolved without requiring login.

## 8. Live verification (this batch)

A genuinely low-confidence, repeated question ("why is the app so slow today unexpectedly") was submitted three times against the running server:

- First submission: `escalated: true` — no article scored above threshold, correctly queued.
- Two further identical submissions: both `escalated: true`, all three visible in the Decision Queue under `"Support Escalation": 3`.
- This same data was then correctly picked up by the Knowledge Improvement AI (Deliverable 4) as a `RECURRING_SUPPORT_QUESTION` recommendation — proving the two new systems are wired together end-to-end, not just individually functional.

## 9. Explicitly out of scope (per batch mandate)

- No automatic answer generation outside the curated article set.
- No bypassing of Companion AI for Bible/doctrine content.
- No automatic escalation resolution — an administrator must act.
