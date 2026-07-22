# Admin Guide — Global Admin Search

Where: Admin page → **★ Command Center** tab → search bar at the top.

## What it searches

One search box across five existing sources today:

- Founder Intelligence recommendations
- Review Queue (support-graph evidence candidates)
- Lesson Alignment submissions
- Unified Audit Trail (Admin actions)
- Runtime Health recent errors

Type at least 2 characters and press Enter or click Search.

## Reading results

Each result shows:

- **Source system** — which existing system owns this record.
- **Result type** — recommendation / evidence_candidate /
  lesson_submission / audit_action / error.
- **Title** and a short **context snippet**.
- **When** it was created/last touched.
- A **drill-down link** that jumps to the right tab for full detail.

Results are sorted by most recent first and paginated — the first
request only returns up to 25 results (configurable up to 100 per page);
the total match count is shown so you know if there's more.

## What it will never show

- No secrets, tokens, or credentials.
- No unnecessary personal/private content (session search returns
  aggregate/anonymized signals only, consistent with the existing
  Founder Observation Layer's privacy design — no raw prayer or lesson
  content is indexed).
- Results are always scoped to what your Admin token is authorized to
  see (today: everything, since there is one Admin credential).

## Extending search later

Search is built as a provider list
(`services/adminGlobalSearch.js: PROVIDERS`) — each provider is one small
function that searches one existing source and returns normalized
result rows. Adding a new searchable source (e.g., Scripture Relationship
Graph, Original Language topics) means adding one more provider function;
the route and UI do not need to change.
