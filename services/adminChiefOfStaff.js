/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 4: AI Chief of Staff.
 *
 * A GROUNDED, deterministic decision-support assistant. Every fact in
 * every answer is computed by an existing service (aggregator, decision
 * queue, alert center, briefing generator, Founder Intelligence) BEFORE
 * this module ever touches it. This module only:
 *   1. classifies the admin's free-text question into one of a fixed set
 *      of supported intents,
 *   2. calls the matching existing data builder,
 *   3. shapes the result into the required answer envelope, and
 *   4. OPTIONALLY asks OpenAI to phrase a friendlier one-paragraph
 *      narrative from the ALREADY-COMPUTED facts (never to invent new
 *      facts — the prompt explicitly forbids adding any number or claim
 *      not present in the supplied JSON).
 *
 * If OpenAI is unavailable/unconfigured/errors, the deterministic
 * narrative template is used instead — the Chief of Staff always answers
 * (or gives a stated NO_DATA reason), never depends on AI to function.
 *
 * Hard rules enforced here:
 *   - never auto-approve / never auto-publish / never mutate production
 *     data (this module has no write path at all — read-only).
 *   - every answer states requiredApproval + confidence + sourceSystems.
 */

const { buildAdminCommandCenterSummary } = require('./adminCommandCenterAggregator');
const { listDecisionQueue } = require('./adminDecisionQueue');
const { listAlerts } = require('./adminAlertCenter');
const { buildDailyBriefing, buildWeeklyBriefing } = require('./adminBriefingGenerator');

function envelope({ summary, evidence = [], impact = null, confidence = 'MEDIUM', recommendedAction = null, requiredApproval = true, sourceSystems = [], drillDownLinks = [] }) {
  return { summary, evidence, impact, confidence, recommendedAction, requiredApproval, sourceSystems, drillDownLinks };
}

const INTENTS = [
  {
    id: 'attention_today',
    test: /attention today|need(s)? my attention|what should i (do|focus)/i,
    handle: () => {
      const daily = buildDailyBriefing();
      return envelope({
        summary: daily.recommendedActionsToday.join(' '),
        evidence: [
          `${daily.pendingDecisions} item(s) in the Decision Queue.`,
          `${(daily.securityIssues || []).length} security alert(s).`,
        ],
        impact: 'Determines where Admin time is best spent today.',
        confidence: 'HIGH',
        recommendedAction: daily.recommendedActionsToday[0],
        requiredApproval: true,
        sourceSystems: ['adminBriefingGenerator', 'adminAlertCenter', 'adminDecisionQueue'],
        drillDownLinks: ['#decisions', '#alerts'],
      });
    },
  },
  {
    id: 'changed_since_yesterday',
    test: /changed since yesterday|since yesterday/i,
    handle: () => {
      const daily = buildDailyBriefing();
      const d = daily.windowDeltaSinceYesterday;
      if (d.status !== 'COMPUTED') {
        return envelope({
          summary: 'BASELINE_ESTABLISHING — not enough runtime-health history yet to compute a real yesterday-to-today comparison.',
          confidence: 'LOW',
          requiredApproval: false,
          sourceSystems: ['adminBriefingGenerator'],
        });
      }
      return envelope({
        summary: `Since yesterday: ${d.requestsDelta} request(s), ${d.errorsDelta} error(s), ${d.timeoutsDelta} timeout(s).`,
        evidence: [JSON.stringify(d.observationDelta)],
        confidence: 'HIGH',
        requiredApproval: false,
        sourceSystems: ['runtimeHealthMonitor'],
        drillDownLinks: ['#operations'],
      });
    },
  },
  {
    id: 'summarize_24h',
    test: /last 24 hours|summarize (the )?(last )?day|daily briefing/i,
    handle: () => {
      const daily = buildDailyBriefing();
      return envelope({
        summary: `System: ${daily.systemHealth.liveStatus}. ${daily.systemHealth.totalRequests} total requests, ${daily.systemHealth.errors} error(s). ${daily.pendingDecisions} pending decision(s).`,
        evidence: [`Fallbacks: ${daily.responseQualityConcerns.fallbackCount}`, `Knowledge opportunities: ${daily.knowledgeOpportunities}`],
        confidence: 'HIGH',
        recommendedAction: daily.recommendedActionsToday[0],
        requiredApproval: false,
        sourceSystems: ['adminBriefingGenerator'],
        drillDownLinks: ['#executive'],
      });
    },
  },
  {
    id: 'summarize_week',
    test: /summarize this week|weekly (briefing|summary|review)/i,
    handle: () => {
      const weekly = buildWeeklyBriefing();
      return envelope({
        summary: `Governance: ${weekly.governanceActivity.decisionsThisWeek} decision(s) this week (of ${weekly.governanceActivity.totalDecisionsAllTime} all-time). Approval rate: ${weekly.recommendationAcceptance.approvalRate ?? weekly.recommendationAcceptance.approvalRateNote}.`,
        evidence: [JSON.stringify(weekly.recommendationAcceptance.byStatus)],
        confidence: 'MEDIUM',
        recommendedAction: (weekly.prioritiesForNextWeek || [])[0] || null,
        requiredApproval: false,
        sourceSystems: ['adminBriefingGenerator', 'founderIntelligenceRecommendationStore'],
        drillDownLinks: ['#intelligence'],
      });
    },
  },
  {
    id: 'problems_affecting_users',
    test: /problems affecting users|users? (are|is) (having|encountering)|user difficulties/i,
    handle: () => {
      const summary = buildAdminCommandCenterSummary();
      const health = summary.systemHealth.data;
      const quality = summary.experienceQuality.data;
      return envelope({
        summary: health ? `${health.failedRequests} failed request(s), ${health.fallbackCount} fallback response(s) out of ${health.totalRequests} total.` : 'System health data unavailable this request.',
        evidence: quality ? (quality.recentFallbacks || []).slice(0, 3).map((f) => JSON.stringify(f)) : [],
        confidence: health ? 'HIGH' : 'LOW',
        recommendedAction: 'Review Operations & Health for recurring error/fallback signatures.',
        requiredApproval: false,
        sourceSystems: ['runtimeHealthMonitor'],
        drillDownLinks: ['#operations'],
      });
    },
  },
  {
    id: 'repetitive_bland',
    test: /repetitive|bland/i,
    handle: () => {
      const alerts = listAlerts({ category: 'Repeated Bland/Fallback Response' });
      return envelope({
        summary: alerts.total > 0 ? `${alerts.total} bland/fallback-response alert(s) detected.` : 'No bland/fallback-response alert threshold has been crossed.',
        evidence: alerts.alerts.map((a) => a.summary),
        confidence: alerts.total > 0 ? 'HIGH' : 'MEDIUM',
        recommendedAction: alerts.total > 0 ? 'Open Alerts to inspect the affected route(s).' : null,
        requiredApproval: false,
        sourceSystems: ['adminAlertCenter'],
        drillDownLinks: ['#alerts'],
      });
    },
  },
  {
    id: 'top_scripture_topics',
    test: /scripture topics|most frequently|recurring (topics|doctrine)/i,
    handle: () => {
      const summary = buildAdminCommandCenterSummary();
      const topics = summary.scriptureAndKnowledge.data?.recurringScriptureTopics || [];
      return envelope({
        summary: topics.length ? `Top topics: ${topics.slice(0, 5).map((t) => `${t.category} (${t.count})`).join(', ')}.` : 'No recurring-topic data recorded yet.',
        evidence: topics.slice(0, 8),
        confidence: topics.length ? 'MEDIUM' : 'LOW',
        requiredApproval: false,
        sourceSystems: ['runtimeHealthMonitor.observation'],
        drillDownLinks: ['#scripture-review'],
      });
    },
  },
  {
    id: 'approved_evidence_check',
    test: /already have approved evidence|existing (approved )?evidence/i,
    handle: () => {
      const summary = buildAdminCommandCenterSummary();
      const fi = summary.founderIntelligence.data;
      return envelope({
        summary: fi ? `${fi.possibleExistingSolutions} reference(s) already matched to approved knowledge this run; ${fi.knowledgeOpportunities} genuine gap(s) found.` : 'Founder Intelligence data unavailable this request.',
        confidence: fi ? 'HIGH' : 'LOW',
        recommendedAction: 'Review Founder Intelligence > possibleExistingSolutions before proposing new evidence.',
        requiredApproval: false,
        sourceSystems: ['founderOperationalIntelligenceEngine'],
        drillDownLinks: ['#intelligence'],
      });
    },
  },
  {
    id: 'knowledge_gaps',
    test: /knowledge gaps|genuine gap/i,
    handle: () => {
      const summary = buildAdminCommandCenterSummary();
      const fi = summary.founderIntelligence.data;
      return envelope({
        summary: fi ? `${fi.knowledgeOpportunities} genuine knowledge gap(s) identified by recurring-pattern analysis this run.` : 'Unavailable this request.',
        confidence: fi ? 'MEDIUM' : 'LOW',
        recommendedAction: 'Review Decision Queue filtered by category = Scripture Coverage / Doctrine Coverage.',
        requiredApproval: true,
        sourceSystems: ['founderOperationalIntelligenceEngine'],
        drillDownLinks: ['#intelligence', '#decisions'],
      });
    },
  },
  {
    id: 'safest_recommendations',
    test: /safest to approve|safe(st)? recommendation/i,
    handle: () => {
      const queue = listDecisionQueue({ limit: 200 });
      const safe = queue.items.filter((i) => i.confidence === 'HIGH' && i.severity === 'Low' && i.status === 'New');
      return envelope({
        summary: `${safe.length} High-confidence, Low-severity, not-yet-decided item(s) are the safest candidates to review first.`,
        evidence: safe.slice(0, 5).map((i) => i.title),
        confidence: 'MEDIUM',
        recommendedAction: safe.length ? 'Open the Decision Queue filtered by confidence=HIGH, severity=Low.' : 'No clearly "safe" items currently pending.',
        requiredApproval: true,
        sourceSystems: ['adminDecisionQueue'],
        drillDownLinks: ['#decisions'],
      });
    },
  },
  {
    id: 'bugs_vs_content_gaps',
    test: /bugs? versus content|bugs? vs\.? content|bug or (a )?content gap/i,
    handle: () => {
      const queue = listDecisionQueue({ limit: 500 });
      const bugs = queue.items.filter((i) => i.category === 'Runtime Bug' || i.category === 'Security');
      const contentGaps = queue.items.filter((i) => i.category === 'Scripture Coverage' || i.category === 'Doctrine Coverage' || i.category === 'Evidence Candidate');
      return envelope({
        summary: `${bugs.length} runtime/security item(s) vs ${contentGaps.length} content/coverage item(s) currently in the Decision Queue.`,
        confidence: 'MEDIUM',
        recommendedAction: null,
        requiredApproval: false,
        sourceSystems: ['adminDecisionQueue'],
        drillDownLinks: ['#decisions'],
      });
    },
  },
  {
    id: 'failing_features',
    test: /features?.*failing most|which features are failing/i,
    handle: () => {
      const summary = buildAdminCommandCenterSummary();
      const health = summary.systemHealth.data;
      const errors = health ? (health.recentErrors || []) : [];
      const byRoute = errors.reduce((acc, e) => { const r = e.route || 'unknown'; acc[r] = (acc[r] || 0) + 1; return acc; }, {});
      const ranked = Object.entries(byRoute).sort((a, b) => b[1] - a[1]);
      return envelope({
        summary: ranked.length ? `Most-failing route(s): ${ranked.slice(0, 3).map(([r, c]) => `${r} (${c})`).join(', ')}.` : 'No recent errors recorded.',
        evidence: errors.slice(-5),
        confidence: ranked.length ? 'MEDIUM' : 'LOW',
        requiredApproval: false,
        sourceSystems: ['runtimeHealthMonitor'],
        drillDownLinks: ['#operations'],
      });
    },
  },
  {
    id: 'priorities_before_closed_beta',
    test: /before closed beta|prioritiz(e|ed)/i,
    handle: () => {
      const alerts = listAlerts({});
      const queue = listDecisionQueue({ limit: 10, severity: 'High' });
      const items = [
        ...(alerts.counts.Critical ? [`Resolve ${alerts.counts.Critical} Critical alert(s).`] : []),
        ...(queue.total ? [`Review ${queue.total} High-severity Decision Queue item(s).`] : []),
        'Confirm Founder feedback/lesson-alignment self-serve UI before wider rollout (documented gap).',
      ];
      return envelope({
        summary: items.join(' '),
        confidence: 'MEDIUM',
        recommendedAction: items[0] || null,
        requiredApproval: true,
        sourceSystems: ['adminAlertCenter', 'adminDecisionQueue'],
        drillDownLinks: ['#alerts', '#decisions'],
      });
    },
  },
  // ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — AI Chief of Staff (AI-3)
  // new responsibilities: documentation recommendations + administrative
  // insight into the new User Assistance / Notification surfaces. Both
  // intents follow the exact same grounded pattern as every intent above:
  // call an existing data builder, never invent a fact.
  {
    id: 'documentation_recommendations',
    test: /documentation (gap|recommendation)|missing (docs|documentation)|help center gap/i,
    handle: () => {
      const { buildKnowledgeImprovementReport } = require('./knowledgeImprovementAdvisor');
      const report = buildKnowledgeImprovementReport();
      const docGaps = report.recommendations.filter((r) => r.type === 'DOCUMENTATION_GAP' || r.type === 'RECURRING_SUPPORT_QUESTION');
      return envelope({
        summary: docGaps.length ? `${docGaps.length} documentation gap/improvement recommendation(s) identified from recurring, unanswered support questions.` : 'No documentation gaps identified from current escalation data.',
        evidence: docGaps.slice(0, 5).map((r) => r.title),
        confidence: docGaps.length ? 'MEDIUM' : 'LOW',
        recommendedAction: docGaps.length ? 'Review Decision Queue filtered by category = Knowledge Improvement.' : null,
        requiredApproval: true,
        sourceSystems: ['knowledgeImprovementAdvisor'],
        drillDownLinks: ['#command-center'],
      });
    },
  },
  {
    id: 'user_assistance_status',
    test: /user assistance|help center status|support escalations|ai support/i,
    handle: () => {
      const { getStats: getEscalationStats } = require('./userAssistanceEscalationStore');
      const { getStats: getHelpCenterStats } = require('./helpCenterContentStore');
      const escalations = getEscalationStats();
      const helpCenter = getHelpCenterStats();
      return envelope({
        summary: `${helpCenter.total} Help Center article(s) published (${helpCenter.faqCount} tagged FAQ). ${escalations.pending} question(s) awaiting a reply from the User Assistance escalation queue.`,
        evidence: [`Resolved: ${escalations.resolved}`, `Dismissed: ${escalations.dismissed}`],
        confidence: 'HIGH',
        recommendedAction: escalations.pending > 0 ? 'Review pending User Assistance escalations in the Decision Queue.' : null,
        requiredApproval: false,
        sourceSystems: ['helpCenterContentStore', 'userAssistanceEscalationStore'],
        drillDownLinks: ['#command-center'],
      });
    },
  },
  {
    id: 'critical_only',
    test: /only critical|critical issues only|show.*critical/i,
    handle: () => {
      const alerts = listAlerts({ severity: 'Critical' });
      const queue = listDecisionQueue({ severity: 'Critical', limit: 20 });
      return envelope({
        summary: `${alerts.total} Critical alert(s), ${queue.total} Critical Decision Queue item(s).`,
        evidence: alerts.alerts.map((a) => a.summary),
        confidence: 'HIGH',
        requiredApproval: true,
        sourceSystems: ['adminAlertCenter', 'adminDecisionQueue'],
        drillDownLinks: ['#alerts', '#decisions'],
      });
    },
  },
];

function classifyIntent(question) {
  const q = String(question || '').trim();
  for (const intent of INTENTS) {
    if (intent.test.test(q)) return intent;
  }
  return null;
}

function deterministicFallback() {
  const summary = buildAdminCommandCenterSummary();
  const es = summary.executiveSummary;
  return envelope({
    summary: `Overall status: ${es.overallStatus}. ${es.answers.decisionsRequiringAttention} ${es.answers.recommendedActionToday}`,
    evidence: [es.answers.usersEncounteringProblems, es.answers.responsesAccurateAndAligned],
    confidence: 'MEDIUM',
    recommendedAction: es.answers.recommendedActionToday,
    requiredApproval: false,
    sourceSystems: ['adminCommandCenterAggregator'],
    drillDownLinks: ['#executive'],
  });
}

/**
 * OPTIONAL narrative phrasing pass. Never adds facts — only rephrases the
 * already-computed envelope. Safe no-op (returns the original envelope)
 * if OpenAI is unavailable, unconfigured, or errors.
 */
async function tryNarrativePhrasing(ans, question) {
  try {
    const openai = require('./openaiClient');
    if (!openai) return ans;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You rephrase Admin dashboard facts into one short, plain-language paragraph for a non-technical business owner. You must use ONLY the facts given in the JSON. Never add a number, claim, or recommendation that is not already present in the JSON. Do not use technical jargon.',
        },
        { role: 'user', content: `Admin question: ${question}\n\nFacts JSON:\n${JSON.stringify(ans)}` },
      ],
    });
    const narrative = completion.choices?.[0]?.message?.content;
    if (narrative) return { ...ans, narrative };
    return ans;
  } catch (e) {
    return { ...ans, aiPhrasingUnavailable: true, aiPhrasingError: e.message };
  }
}

async function askChiefOfStaff(question) {
  const intent = classifyIntent(question);
  const answer = intent ? intent.handle() : deterministicFallback();
  const finalAnswer = await tryNarrativePhrasing(answer, question);
  return {
    ok: true,
    question: question || null,
    matchedIntent: intent ? intent.id : 'GENERAL_EXECUTIVE_SUMMARY',
    ...finalAnswer,
  };
}

const SUPPORTED_EXAMPLE_QUESTIONS = INTENTS.map((i) => i.id);

module.exports = { askChiefOfStaff, classifyIntent, SUPPORTED_EXAMPLE_QUESTIONS };
