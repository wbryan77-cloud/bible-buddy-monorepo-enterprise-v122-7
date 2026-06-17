/**
 * Phase 5J — Rule-based issue aggregation from captures and feedback (no external AI).
 */

const fs = require('fs');
const path = require('path');
const { readCaptures } = require('./alphaConversationCapture');
const { readFeedback } = require('./alphaFeedbackCapture');

const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'alpha');

const ISSUE_RULES = [
  {
    id: 'doctrine_drift',
    re: /interpretations vary|primarily|some christians believe/i,
    severity: 'high',
    files: ['services/directAnswerFormatter.js', 'services/companionStyleGuard.js'],
  },
  {
    id: 'wrong_scripture',
    tag: 'wrong_doctrine',
    re: /wrong scripture|incorrect verse/i,
    severity: 'high',
    files: ['services/bibleWideReasoningEngine.js', 'services/strictDoctrineGate.js'],
  },
  {
    id: 'insufficient_witnesses',
    re: /witness<2|only one verse/i,
    severity: 'medium',
    files: ['services/twoWitnessStandard.js', 'services/scriptureReasoningPlanner.js'],
  },
  {
    id: 'stale_topic_hijack',
    re: /acts\s*10.*pork|stale topic/i,
    severity: 'medium',
    files: ['services/followUpContextResolver.js', 'services/companionIntentIntelligence.js'],
  },
  {
    id: 'didnt_listen',
    tag: 'didnt_listen',
    severity: 'medium',
    files: ['services/companionIntentIntelligence.js', 'services/relationshipContextModel.js'],
  },
  {
    id: 'memory_failure',
    tag: 'not_helpful',
    re: /false memory|what do you remember/i,
    severity: 'medium',
    files: ['services/companionMemoryManager.js'],
  },
  {
    id: 'prayer_didnt_pray',
    re: /can you pray|pray with me/i,
    notRe: /\b(father|lord|jesus|amen)\b/i,
    severity: 'high',
    files: ['services/companionResponseBuilder.js', 'services/practicalGuidanceEngine.js'],
  },
  {
    id: 'too_robotic',
    tag: 'too_robotic',
    severity: 'low',
    files: ['services/companionResponseBuilder.js', 'services/companionStyleGuard.js'],
  },
  {
    id: 'emotional_support_weak',
    tag: 'not_helpful',
    re: /overwhelmed|bad day|nervous/i,
    severity: 'medium',
    files: ['services/companionResponseBuilder.js'],
  },
  {
    id: 'core_connection_error',
    re: /core_connection_error|trouble retrieving/i,
    severity: 'critical',
    files: ['services/responseGuarantee.js', 'services/doctrineErrorFirewall.js'],
  },
  {
    id: 'fallback_triggered',
    field: 'fallbackUsed',
    severity: 'medium',
    files: ['services/responseGuarantee.js'],
  },
  {
    id: 'openai_overused',
    field: 'openAiCalled',
    severity: 'low',
    files: ['services/bibleCompanionOrchestrator.js'],
  },
  {
    id: 'bug_glitch',
    tag: 'bug_glitch',
    severity: 'high',
    files: ['services/bibleCompanionOrchestrator.js'],
  },
];

function aggregateIssues({ captureLimit = 2000, feedbackLimit = 500 } = {}) {
  const captures = readCaptures({ limit: captureLimit });
  const feedback = readFeedback({ limit: feedbackLimit });
  const sessionIds = new Set(captures.map((c) => c.sessionId));
  const totalSessions = sessionIds.size || 1;

  const issues = [];

  for (const rule of ISSUE_RULES) {
    let matches = [];

    if (rule.tag) {
      matches = feedback.filter((f) => f.tag === rule.tag);
    }

    for (const c of captures) {
      const user = c.userMessagePreview || '';
      const buddy = c.buddyReplyPreview || '';
      const combined = `${user} ${buddy}`;

      if (rule.field === 'fallbackUsed' && c.fallbackUsed) matches.push(c);
      if (rule.field === 'openAiCalled' && c.openAiCalled) matches.push(c);
      if (rule.re && rule.re.test(combined)) {
        if (rule.notRe && rule.notRe.test(buddy)) matches.push(c);
        else if (!rule.notRe) matches.push(c);
      }
      if (rule.re && rule.notRe && rule.re.test(user) && !rule.notRe.test(buddy)) matches.push(c);
    }

    if (matches.length === 0) continue;

    const example = matches[0];
    const sessionSet = new Set(matches.map((m) => m.sessionId || m.testerId));
    issues.push({
      id: rule.id,
      severity: rule.severity,
      frequency: matches.length,
      percentOfSessions: Math.round((sessionSet.size / totalSessions) * 1000) / 10,
      examplePreview: String(example.buddyReplyPreview || example.optionalComment || '').slice(0, 200),
      likelyRootCause: `Heuristic match for ${rule.id}`,
      suggestedFix: `Review ${(rule.files || []).join(', ')}`,
      affectedFiles: rule.files || [],
      regressionTestToAdd: `scripts/runPhase5JConversationEvalPack.js — ${rule.id}`,
    });
  }

  issues.sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 };
    return (sev[b.severity] || 0) - (sev[a.severity] || 0) || b.frequency - a.frequency;
  });

  return { issues, totalCaptures: captures.length, totalFeedback: feedback.length, totalSessions };
}

function writeReports(result = {}) {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const summaryMd = [
    '# Alpha Issue Summary',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Captures:** ${result.totalCaptures} | **Feedback:** ${result.totalFeedback} | **Sessions:** ${result.totalSessions}`,
    '',
    ...result.issues.map(
      (i) =>
        `- **${i.id}** (${i.severity}) — ${i.frequency} hits, ~${i.percentOfSessions}% sessions\n  ${i.examplePreview}`,
    ),
    '',
  ].join('\n');

  fs.writeFileSync(path.join(REPORTS_DIR, 'AlphaIssueSummary.md'), summaryMd, 'utf8');
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'AlphaIssueDetails.json'),
    JSON.stringify(result, null, 2),
    'utf8',
  );

  const fixMd = [
    '# Alpha Cursor Fix Recommendations',
    '',
    ...result.issues.map(
      (i) =>
        `## ${i.id}\n- Severity: ${i.severity}\n- Fix: ${i.suggestedFix}\n- Regression: ${i.regressionTestToAdd}\n`,
    ),
  ].join('\n');
  fs.writeFileSync(path.join(REPORTS_DIR, 'AlphaCursorFixRecommendations.md'), fixMd, 'utf8');

  return {
    summaryPath: path.join(REPORTS_DIR, 'AlphaIssueSummary.md'),
    detailsPath: path.join(REPORTS_DIR, 'AlphaIssueDetails.json'),
    fixPath: path.join(REPORTS_DIR, 'AlphaCursorFixRecommendations.md'),
  };
}

module.exports = {
  aggregateIssues,
  writeReports,
  ISSUE_RULES,
};
