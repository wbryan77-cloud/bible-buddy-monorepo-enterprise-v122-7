# Admin Guide — AI Chief of Staff

Where: Admin page → **★ Command Center** tab → "AI Chief of Staff" panel.

## What it is

A decision-support assistant, not an autonomous editor. It answers
questions about the current state of BibleBuddy's Admin data — it never
approves, rejects, publishes, or changes anything in production on its
own, no matter how the question is phrased.

## What you can ask

Type a question in plain English, or click one of the example chips:

- "What needs my attention today?"
- "What changed since yesterday?"
- "Summarize the last 24 hours."
- "What problems are affecting users?"
- "Are users receiving repetitive or bland responses?"
- "Which Scripture topics are appearing most frequently?"
- "What knowledge gaps appear genuine?"
- "What recommendations are safest to approve?"
- "Which issues are bugs versus content gaps?"
- "Show only critical issues."
- "Summarize this week for me."

If your question doesn't match a known intent, it falls back to a
general "what's most important right now" summary built from the same
live Executive Overview data — you always get a grounded answer, never
an empty response.

## How to read an answer

Every answer has the same structure:

- **Summary** — a plain-language explanation of the situation.
- **Evidence** — the specific counts/facts the summary is based on.
- **Impact** — why this matters for the business right now.
- **Confidence** — HIGH / MEDIUM / LOW, based on how directly the
  underlying data supports the answer.
- **Recommended action** — a suggested next step (not performed
  automatically).
- **Approval required** — whether taking that action would require
  Admin approval through the existing Governance/Approval workflow.
- **Source systems** — exactly which existing services the answer was
  built from (e.g., `adminBriefingGenerator`, `adminAlertCenter`,
  `founderOperationalIntelligenceEngine`).
- **Drill-down links** — one-click jumps to the relevant tab/section for
  more detail.

## Governance guarantees

- The assistant retrieves data only from the same authorized Admin
  services every other Command Center panel uses — it has no separate
  or broader data access.
- It always states facts and recommendations separately; it never
  presents a recommendation as if it were already-approved fact.
- It never auto-approves or auto-publishes anything. Even when asked to
  "approve everything," it responds with the safest current items to
  *review*, and explicitly states approval is still required from you.
- It never alters Scripture, doctrine, or any governed knowledge record.

## When OpenAI is unavailable

The assistant is deterministic underneath: every fact in the Evidence
section comes from the same aggregator, decision queue, alert center,
and briefing generator the rest of the Command Center uses. OpenAI (when
configured) is used only to phrase that computed answer more naturally —
it is never asked to invent numbers. If OpenAI is not configured or is
unreachable, the assistant automatically falls back to the same
deterministic, plain-language summary text without the extra narrative
polish. You will never see an empty or broken response because the AI
service is down — this was verified in testing (see
`UnifiedAdminCommandCenterAcceptance.md`, "AI Chief of Staff" row).
