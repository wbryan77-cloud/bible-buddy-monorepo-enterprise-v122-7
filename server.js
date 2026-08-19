// server.js — Bible Buddy unified, Render-ready, Node 20+

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = 'v122.14.0 (platform unification foundation)';

// FOUNDER_ALPHA_DEPLOYMENT_ACTIVATION Part 6 — safe, non-sensitive build-identity
// field. Render automatically injects RENDER_GIT_COMMIT/RENDER_GIT_BRANCH for every
// deploy on that platform; when absent (local dev), this stays null rather than
// guessing. Only the short (7-char) commit prefix is ever exposed — never a full
// SHA-adjacent secret, token, or path.
const RELEASE_COMMIT = process.env.RENDER_GIT_COMMIT
  ? String(process.env.RENDER_GIT_COMMIT).slice(0, 7)
  : null;
const RELEASE_BRANCH = process.env.RENDER_GIT_BRANCH || null;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const DATA_DIR = path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

// Public entry aliases (invitation / SMS / QR). Registered BEFORE static so
// legacy admin/index.html and alpha-test.html cannot own these exact paths.
// Does not change Companion runtime, Admin auth, or API security.
// Preserve invite token: /alpha?token=… must not drop the query (redirect to
// the existing Alpha onboarding surface that reads `token`).
app.get(['/alpha', '/alpha/', '/alpha-test', '/alpha-test/'], (req, res) => {
  const token = req.query && req.query.token != null ? String(req.query.token).trim() : '';
  if (token) {
    return res.redirect(302, `/admin/alpha-test?token=${encodeURIComponent(token)}`);
  }
  res.redirect(302, '/');
});
app.get(['/admin', '/admin/'], (req, res) => {
  res.redirect(302, '/admin/bible-authority');
});

app.use(express.static(PUBLIC_DIR));
app.use('/admin', express.static(ADMIN_DIR));
// PII lives under data/ (sessions, feedback). Do not expose via public static file serving.

function computeProviderStatus() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;

  return {
    openai: hasOpenAI ? 'OpenAI: configured' : 'OpenAI: missing OPENAI_API_KEY',
    email: hasResend ? 'Email: Resend configured' : 'Email: Resend missing keys',
    sms: hasTwilioSid && hasTwilioToken ? 'SMS: Twilio configured' : 'SMS: Twilio missing keys',
    detail: {
      openai: hasOpenAI ? 'configured' : 'missing',
      email: hasResend ? 'configured' : 'missing',
      sms: hasTwilioSid && hasTwilioToken ? 'configured' : 'missing',
    },
  };
}

function buildSelfTestPayload() {
  let durableMemory = null;
  try {
    durableMemory = require('./services/durableUserMemory').getStatus();
  } catch (_) {
    durableMemory = { owner: 'durableUserMemory', error: 'unavailable' };
  }
  // v1.3E/F — presence + short fingerprint only. Never expose token values.
  let adminAuthConfigured = false;
  let adminAuthFingerprint = null;
  try {
    const adminAuth = require('./services/adminAuthMiddleware');
    const token = adminAuth.resolveAdminToken();
    adminAuthConfigured = !!token;
    adminAuthFingerprint = adminAuth.adminAuthFingerprint(token);
  } catch (_) {
    adminAuthConfigured = false;
    adminAuthFingerprint = null;
  }
  return {
    health: {
      ok: true,
      version: APP_VERSION,
      time: new Date().toISOString(),
      releaseCommit: RELEASE_COMMIT,
      releaseBranch: RELEASE_BRANCH,
      durableMemory,
      adminAuthConfigured,
      adminAuthFingerprint,
    },
    providers: computeProviderStatus(),
    queue: { ok: true, detail: 'not configured for production queue yet' },
  };
}

function mountRoute(label, mountPath, requirePath) {
  try {
    const router = require(requirePath);
    app.use(mountPath, router);
    console.log(`${label} loaded at ${mountPath}`);
  } catch (error) {
    console.warn(`WARNING: ${label} failed to load:`, error.message);
  }
}

app.get('/api/health', (req, res) => {
  const base = buildSelfTestPayload();
  res.json({ ok: true, version: base.health.version, time: base.health.time });
});

app.get('/health', (req, res) => {
  res.json(buildSelfTestPayload());
});

app.get('/selftest', (req, res) => {
  res.json(buildSelfTestPayload());
});

app.get('/api/selftest', (req, res) => {
  res.json(buildSelfTestPayload());
});

// SECURITY STABILIZATION (Phase 1A) — these two /admin/api/* routes had no
// authentication at all. Confirmed live and reachable anonymously. Neither
// discloses user data, but both are under the /admin/ prefix and disclose
// provider-configuration state, so they now require the same shared admin
// token as every other admin surface for consistency and least privilege.
const { checkAdminAuth } = require('./services/adminAuthMiddleware');

app.get('/admin/api/selftest', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const base = buildSelfTestPayload();
  res.json({ version: APP_VERSION, health: 'ok', queue: base.queue });
});

app.get('/admin/api/providers', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({ detail: computeProviderStatus().detail });
});

// Core routes. Optional modules fail soft so one broken feature does not crash Render.
mountRoute('AI tester routes', '/api/ai', './admin/ai/routes');
mountRoute('Analyze routes', '/api/analyze', './routes/analyze');
mountRoute('Admin assistant routes', '/admin/assistant', './routes/adminAssistant');
mountRoute('Buddy routes', '/buddy', './routes/buddy');
mountRoute('Runtime health routes', '/api', './routes/runtimeHealth');

try {
  const { verifyBuddyLivePathModules } = require('./services/buddyLivePathVerifier');
  const livePath = verifyBuddyLivePathModules();
  if (!livePath.ok) {
    console.error(
      'CRITICAL: Buddy live path module verification FAILED — missing:',
      livePath.missingModules.join(', '),
    );
    console.error('Companion Chat will return responseGuarantee fallback until these files are deployed.');
  } else {
    console.log('Buddy live path verified:', livePath.routeOwner);
  }
} catch (e) {
  console.warn('Buddy live path verification skipped:', e.message);
}

try {
  const { scheduleStateTtlCleanup } = require('./services/stateTtlCleanup');
  scheduleStateTtlCleanup();
} catch (e) {
  console.warn('State TTL cleanup not scheduled:', e.message);
}

try {
  // PHASE_2_ENTERPRISE_OPTIMIZATION — Operational Intelligence (objective 4).
  const { scheduleMetricsSnapshots } = require('./services/operationalMetricsHistory');
  scheduleMetricsSnapshots();
} catch (e) {
  console.warn('Operational metrics snapshotting not scheduled:', e.message);
}
mountRoute('Content helper routes', '/admin/content', './routes/contentHelper');
mountRoute('Realtime voice routes', '/api/realtime', './routes/realtime');
mountRoute('Health signal routes', '/api/health/signals', './routes/healthSignals');
mountRoute('Learning signal routes', '/api/learning', './routes/learningSignals');
mountRoute('Founder Experience Loop routes', '/api/founder-experience', './routes/founderExperience');
mountRoute('Beta routes', '/api/beta', './routes/beta');
mountRoute('Alpha test routes', '/api/alpha', './routes/alphaTest');
mountRoute('Alpha admin routes', '/admin/api/alpha', './routes/alphaAdmin');
mountRoute('Platform unification routes', '/api/platform-unification', './routes/platformUnification');
mountRoute('Bible Authority admin routes', '/admin/api/bible-authority', './routes/bibleAuthorityAdmin');
// ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — User Assistance Platform
// (Help Center + AI-2 + escalation review). Public read/ask surface plus
// Admin authoring/resolution endpoints gated by the shared checkAdminAuth.
mountRoute('User assistance routes', '/api/support', './routes/userAssistance');

// Simple fallback analyze endpoint if routes/analyze is unavailable.
app.post('/api/analyze/note', async (req, res) => {
  try {
    const note = String(req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'No note text provided.' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'AI not configured on server.' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              'You are Bible Buddy, a gentle Scripture-grounded companion. Distinguish Scripture from explanation and never invent Bible verses.',
          },
          {
            role: 'user',
            content:
              `Note:\n\n${note}\n\nCreate a clear devotional outline, suggest 3-5 Bible references, and end with reflection questions and a short prayer.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI analyze error:', response.status, text);
      return res.status(500).json({ error: 'AI service error.' });
    }

    const data = await response.json();
    res.json({ reply: data?.choices?.[0]?.message?.content || 'No response generated.' });
  } catch (error) {
    console.error('Analyze Note fallback error:', error);
    res.status(500).json({ error: 'Server error analyzing note.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/beta', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'beta.html'));
});

// Internal alpha harness (not a public entry alias).
app.get('/admin/alpha-test', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'alpha-test.html'));
});

app.get('/admin/alpha-dashboard', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'alpha-dashboard.html'));
});

app.get('/admin/beta-review', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'beta-review.html'));
});

app.get('/admin/bible-authority', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'bible-authority.html'));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

const { logStartupDiagnostics } = require('./services/buddyRuntimeConfig');

const APP_SHUTDOWN_TIMEOUT_MS = Number(process.env.APP_SHUTDOWN_TIMEOUT_MS || 20000);

function lifecycleLog(event, extra = {}) {
  console.log(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      pid: process.pid,
      node: process.version,
      releaseCommit: RELEASE_COMMIT,
      ...extra,
    }),
  );
}

lifecycleLog('PROCESS_STARTED');

const server = app.listen(PORT, () => {
  console.log(`Bible Buddy ${APP_VERSION} listening on port ${PORT}`);
  logStartupDiagnostics();
  // Governance durability: JSONL learning records are ephemeral on Render disk.
  // Dual-write already projects into founderExperienceDurableStore — hydrate on
  // boot so Decision Queue / FE Admin reads recover after redeploy when durable
  // projections exist. No-op when JSONL already populated or durable is empty.
  setImmediate(() => {
    try {
      const { hydrateLearningRecordsFromDurableIfNeeded } = require('./services/learningRecordStore');
      hydrateLearningRecordsFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[learningRecordStore] hydrated ${r.count} learning records from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[learningRecordStore] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[learningRecordStore] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateAdminAuditFromDurableIfNeeded } = require('./services/adminAuditTrail');
      hydrateAdminAuditFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[adminAuditTrail] hydrated ${r.count} audit entries from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[adminAuditTrail] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[adminAuditTrail] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateEscalationsFromDurableIfNeeded } = require('./services/userAssistanceEscalationStore');
      hydrateEscalationsFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[userAssistanceEscalationStore] hydrated ${r.count} escalations from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[userAssistanceEscalationStore] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[userAssistanceEscalationStore] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateAlphaFeedbackFromDurableIfNeeded } = require('./services/alphaFeedbackCapture');
      hydrateAlphaFeedbackFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[alphaFeedbackCapture] hydrated ${r.count} feedback entries from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[alphaFeedbackCapture] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[alphaFeedbackCapture] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateHelpCenterFromDurableIfNeeded } = require('./services/helpCenterContentStore');
      hydrateHelpCenterFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[helpCenterContentStore] hydrated ${r.count} help articles from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[helpCenterContentStore] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[helpCenterContentStore] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateFounderIntelligenceFromDurableIfNeeded } = require('./services/founderIntelligenceRecommendationStore');
      hydrateFounderIntelligenceFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[founderIntelligenceStore] hydrated ${r.count} dispositions from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[founderIntelligenceStore] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[founderIntelligenceStore] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateSupportGraphDecisionsFromDurableIfNeeded } = require('./services/supportGraphCandidateQueue');
      hydrateSupportGraphDecisionsFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[supportGraphCandidateQueue] hydrated ${r.count} decisions from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[supportGraphCandidateQueue] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[supportGraphCandidateQueue] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateAlphaTestersFromDurableIfNeeded } = require('./services/alphaTesterManager');
      hydrateAlphaTestersFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[alphaTesterManager] hydrated ${r.count} alpha testers from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[alphaTesterManager] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[alphaTesterManager] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
    try {
      const { hydrateExplicitRememberPinsFromDurableIfNeeded } = require('./services/explicitRememberPin');
      hydrateExplicitRememberPinsFromDurableIfNeeded()
        .then((r) => {
          if (r && r.hydrated) {
            console.log(`[explicitRememberPin] hydrated ${r.count} users from durable (${r.backend})`);
          }
        })
        .catch((err) => {
          console.warn('[explicitRememberPin] durable hydrate failed:', err && err.message ? err.message : err);
        });
    } catch (err) {
      console.warn('[explicitRememberPin] durable hydrate wire failed:', err && err.message ? err.message : err);
    }
  });
});
let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  lifecycleLog('SHUTDOWN_SIGNAL_RECEIVED', { signal });
  lifecycleLog('HTTP_DRAIN_STARTED');

  const forceTimer = setTimeout(() => {
    lifecycleLog('SHUTDOWN_FORCE_EXIT', { reason: 'timeout', timeoutMs: APP_SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, APP_SHUTDOWN_TIMEOUT_MS);
  if (typeof forceTimer.unref === 'function') forceTimer.unref();

  await new Promise((resolve) => {
    server.close((err) => {
      if (err) {
        lifecycleLog('HTTP_DRAIN_ERROR', { errorMessage: String(err.message || err).slice(0, 120) });
      }
      resolve();
    });
  });

  lifecycleLog('POSTGRES_POOL_DRAIN_STARTED');
  try {
    const { endSharedPool } = require('./services/persistence/postgresAdapter');
    const ended = await endSharedPool();
    lifecycleLog('POSTGRES_POOL_DRAIN_COMPLETE', ended);
  } catch (err) {
    lifecycleLog('POSTGRES_POOL_DRAIN_ERROR', {
      errorMessage: err && err.message ? String(err.message).slice(0, 120) : 'unknown',
    });
  }

  lifecycleLog('SHUTDOWN_COMPLETE', { signal, exitCode: 0 });
  clearTimeout(forceTimer);
  process.exit(0);
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((err) => {
    console.error('[shutdown] SIGTERM handler failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
});
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((err) => {
    console.error('[shutdown] SIGINT handler failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  lifecycleLog('UNCAUGHT_EXCEPTION', {
    errorName: err && err.name,
    errorMessage: err && err.message ? String(err.message).slice(0, 200) : 'unknown',
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  lifecycleLog('UNHANDLED_REJECTION', { errorMessage: String(msg).slice(0, 200) });
});
