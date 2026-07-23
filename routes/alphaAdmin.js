const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  createInvite,
  getInviteLink,
  listTesters,
  load,
} = require('../services/alphaTesterManager');
const { readCaptures } = require('../services/alphaConversationCapture');
const { readFeedback } = require('../services/alphaFeedbackCapture');
const { getQueueReport, readHistory } = require('../services/alphaNotificationScheduler');
const { aggregateIssues, writeReports } = require('../services/alphaIssueAggregator');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');

const router = express.Router();

// SECURITY STABILIZATION (Phase 1A) — this file previously defined its own
// checkAdminAuth() that only recognized ALPHA_ADMIN_TOKEN/BETA_REVIEW_TOKEN
// (never BIBLE_AUTHORITY_ADMIN_TOKEN, which is the only one actually
// configured in production) and, like the other admin-auth implementations
// that used to exist, granted OPEN access whenever neither of those two was
// set. This was confirmed live: every route below was reachable with zero
// authentication in production. Now delegates to the shared, fail-closed
// module, which checks BIBLE_AUTHORITY_ADMIN_TOKEN first — closing this gap
// with no production configuration change required. See
// docs/alpha/security-stabilization-*/ for the full validation record.
const { checkAdminAuth } = require('../services/adminAuthMiddleware');

router.get('/summary', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const testers = listTesters();
    const captures = readCaptures({ limit: 5000 });
    const feedback = readFeedback({ limit: 2000 });
    const health = getRuntimeHealthSnapshot();
    const notif = getQueueReport();

    const today = new Date().toISOString().slice(0, 10);
    const capturesToday = captures.filter((c) => String(c.timestamp || '').startsWith(today));
    const topics = {};
    const emotional = {};
    for (const c of captures) {
      const t = c.concept || c.answerLane || 'unknown';
      topics[t] = (topics[t] || 0) + 1;
      if (/overwhelmed|nervous|emotional|comfort/i.test(`${c.userMessagePreview} ${c.intent}`)) {
        emotional[t] = (emotional[t] || 0) + 1;
      }
    }

    const tagCounts = {};
    for (const f of feedback) {
      tagCounts[f.tag] = (tagCounts[f.tag] || 0) + 1;
    }

    res.json({
      ok: true,
      testers: { total: testers.length, active: testers.filter((t) => t.active).length },
      conversations: {
        totalTurns: captures.length,
        today: capturesToday.length,
        averageTurnsPerTester:
          testers.length ? Math.round(captures.length / testers.length) : 0,
      },
      topTopics: Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([topic, count]) => ({ topic, count })),
      topEmotional: Object.entries(emotional)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count })),
      feedbackTags: tagCounts,
      doctrineFlags: tagCounts.wrong_doctrine || 0,
      memoryFlags: feedback.filter((f) => f.tag === 'didnt_listen').length,
      health: {
        rssMB: health.rssMB,
        memoryPressureLevel: health.memoryPressureLevel,
        errors: health.errors,
        fallbackCount: health.fallbackCount,
        averageLatencyMs: health.averageLatencyMs,
        openAiCalls: health.openAiCalls,
        strictDoctrineCalls: health.strictDoctrineCalls,
        alpha: {
          activeTesters: health.alphaActiveTesters,
          sessionsToday: health.alphaSessionsToday,
          feedbackCount: health.alphaFeedbackCount,
          flaggedDoctrine: health.alphaFlaggedDoctrineIssues,
          fallbackCount: health.alphaFallbackCount,
          averageLatency: health.alphaAverageLatency,
          notificationQueue: notif.counts,
        },
      },
      notifications: notif,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/invites', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const invite = createInvite({ label: req.body?.label, createdBy: req.body?.createdBy || 'admin' });
    const link = getInviteLink(invite.inviteToken, req.body?.baseUrl);
    res.json({ ok: true, invite, link });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/testers', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    res.json({ ok: true, testers: listTesters(false) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/captures', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const limit = Number(req.query.limit || 200);
    const testerId = req.query.testerId || null;
    res.json({ ok: true, captures: readCaptures({ limit, testerId }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/feedback', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    res.json({ ok: true, feedback: readFeedback({ limit: Number(req.query.limit || 500) }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/aggregate-issues', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = aggregateIssues();
    const paths = writeReports(result);
    res.json({ ok: true, issueCount: result.issues.length, paths });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/export/:format', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const format = req.params.format || 'json';
    const summary = {
      testers: listTesters(false),
      captures: readCaptures({ limit: 2000 }),
      feedback: readFeedback({ limit: 1000 }),
      health: getRuntimeHealthSnapshot(),
      notificationHistory: readHistory({ limit: 200 }),
    };
    if (format === 'csv') {
      const rows = ['testerId,sessionId,timestamp,tag,userPreview,buddyPreview'];
      for (const c of summary.captures) {
        rows.push(
          [
            c.testerId,
            c.sessionId,
            c.timestamp,
            c.answerLane,
            JSON.stringify(String(c.userMessagePreview || '').slice(0, 100)),
            JSON.stringify(String(c.buddyReplyPreview || '').slice(0, 100)),
          ].join(','),
        );
      }
      res.type('text/csv').send(rows.join('\n'));
    } else if (format === 'md') {
      const md = [
        '# Alpha Export',
        '',
        `Testers: ${summary.testers.length}`,
        `Captures: ${summary.captures.length}`,
        `Feedback: ${summary.feedback.length}`,
        '',
      ].join('\n');
      res.type('text/markdown').send(md);
    } else {
      res.json({ ok: true, ...summary });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
