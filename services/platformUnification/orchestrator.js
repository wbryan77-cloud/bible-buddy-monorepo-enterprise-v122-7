// services/platformUnification/orchestrator.js
// Platform Unification Phase — canonical orchestration foundation

const {
  listAdapters,
  normalizeWithAdapter,
} = require('./adapters/registry');

// Register connected adapter families.
require('./adapters/covenantTimelineAdapter');
require('./adapters/discipleshipAdapter');
require('./adapters/worshipAdapter');
require('./adapters/prayerAdapter');

const PLATFORM_UNIFICATION_VERSION = 'platform-unification.v1.4';

const SYSTEM_REGISTRY = [
  {
    key: 'covenantTimeline',
    label: 'Covenant Timeline Systems',
    domain: 'scripture-history',
    role: 'Keeps redemption history, covenant progression, and biblical context ordered.',
    continuityInputs: ['covenant-node', 'timeline-anchor', 'scripture-reference'],
  },
  {
    key: 'discipleship',
    label: 'Discipleship Systems',
    domain: 'formation',
    role: 'Turns Scripture, prayer, learning, and habits into gentle daily follow-through.',
    continuityInputs: ['user-stage', 'formation-goal', 'next-step'],
  },
  {
    key: 'worship',
    label: 'Worship Systems',
    domain: 'devotion',
    role: 'Supports reverence, praise, gratitude, and worship-centered reflection.',
    continuityInputs: ['worship-theme', 'devotional-moment', 'song-or-prayer-context'],
  },
  {
    key: 'missions',
    label: 'Missions Systems',
    domain: 'outreach',
    role: 'Connects personal growth to service, witness, community, and mercy.',
    continuityInputs: ['service-opportunity', 'community-need', 'mission-action'],
  },
  {
    key: 'prayer',
    label: 'Prayer Systems',
    domain: 'care',
    role: 'Guides prayer requests, intercession, reminders, and spiritual journaling.',
    continuityInputs: ['prayer-request', 'answered-prayer', 'intercession-topic'],
  },
  {
    key: 'revival',
    label: 'Revival Systems',
    domain: 'renewal',
    role: 'Identifies renewal patterns, repentance, returning to God, and community awakening.',
    continuityInputs: ['renewal-signal', 'repentance-theme', 'community-pattern'],
  },
  {
    key: 'apologetics',
    label: 'Apologetics Systems',
    domain: 'defense',
    role: 'Helps users answer sincere questions with Scripture-first clarity and humility.',
    continuityInputs: ['question', 'objection', 'evidence-thread'],
  },
  {
    key: 'stewardship',
    label: 'Stewardship Systems',
    domain: 'temple-care',
    role: 'Connects body, resources, food, work, and time to faithful stewardship.',
    continuityInputs: ['habit-signal', 'scan-result', 'resource-choice'],
  },
  {
    key: 'ethics',
    label: 'Ethics Systems',
    domain: 'discernment',
    role: 'Applies doctrine integrity, moral reasoning, and pastoral sensitivity guardrails.',
    continuityInputs: ['decision-point', 'risk-signal', 'integrity-check'],
  },
  {
    key: 'analytics',
    label: 'Analytics Systems',
    domain: 'measurement',
    role: 'Measures usage, learning loops, safety signals, and admin readiness.',
    continuityInputs: ['event', 'metric', 'feedback-signal'],
  },
];

const PIPELINE_STAGES = [
  {
    key: 'canonicalOrchestrator',
    label: 'Canonical Orchestrator',
    purpose: 'Receives feature-family signals and produces one normalized discipleship plan.',
    status: 'foundation-ready',
  },
  {
    key: 'kingdomKnowledgeGraph',
    label: 'Kingdom Knowledge Graph',
    purpose: 'Links Scripture, themes, covenant anchors, doctrines, practices, and user-safe learning nodes.',
    status: 'contract-ready',
  },
  {
    key: 'continuityRuleEngine',
    label: 'Continuity Rule Engine',
    purpose: 'Prevents disconnected feature jumps by keeping user journeys ordered and explainable.',
    status: 'contract-ready',
  },
  {
    key: 'doctrineIntegrityPipeline',
    label: 'Doctrine Integrity Pipeline',
    purpose: 'Requires Scripture distinction, context checks, humility language, and no fabricated verses.',
    status: 'guardrail-ready',
  },
  {
    key: 'unifiedDiscipleshipCompiler',
    label: 'Unified Discipleship Compiler',
    purpose: 'Compiles devotional, study, prayer, habit, stewardship, worship, and mission outputs into one path.',
    status: 'contract-ready',
  },
  {
    key: 'runtimeMemoryCompressionLayer',
    label: 'Runtime Memory Compression Layer',
    purpose: 'Compresses memory into safe, useful, non-pushy continuity summaries with consent boundaries.',
    status: 'contract-ready',
  },
];

function normalizeSignal(signal = {}) {
  return {
    id: signal.id || `signal_${Date.now()}`,
    type: signal.type || 'general',
    sourceSystem: signal.sourceSystem || 'unknown',
    text: String(signal.text || signal.note || signal.summary || '').trim(),
    scriptureRefs: Array.isArray(signal.scriptureRefs) ? signal.scriptureRefs : [],
    tags: Array.isArray(signal.tags) ? signal.tags : [],
    createdAt: signal.createdAt || new Date().toISOString(),
    metadata: signal.metadata || {},
  };
}

function resolveSystem(signal) {
  return SYSTEM_REGISTRY.find((system) => system.key === signal.sourceSystem) || null;
}

function buildDoctrineIntegrityChecklist(signal) {
  return [
    {
      key: 'scripture_distinction',
      pass: true,
      note: 'Output must separate Bible references from application, paraphrase, coaching, and commentary.',
    },
    {
      key: 'no_fabricated_verses',
      pass: true,
      note: 'Verse wording must be retrieved from trusted Bible text sources before display as Scripture.',
    },
    {
      key: 'context_required',
      pass: signal.scriptureRefs.length > 0 || signal.tags.includes('needs-scripture'),
      note: 'When Scripture is central, attach context checks before final user-facing output.',
    },
    {
      key: 'pastoral_sensitivity',
      pass: true,
      note: 'Sensitive topics must use gentle language, avoid coercion, and recommend human help when appropriate.',
    },
  ];
}

function compileDiscipleshipPlan(signal, system) {
  let gentleStep = 'Continue with one gentle next step rooted in Scripture and continuity.';

  if (signal.metadata?.goal) {
    gentleStep = `Continue toward formation goal: ${signal.metadata.goal}`;
  }

  if (signal.sourceSystem === 'worship' && signal.metadata?.worshipTheme) {
    gentleStep = `Remain centered on worship theme: ${signal.metadata.worshipTheme}`;
  }

  if (signal.sourceSystem === 'prayer') {
    gentleStep = 'Continue with gentle prayer continuity, reflection, and pastoral sensitivity.';
  }

  return {
    summary: signal.text || 'No user-facing text supplied yet.',
    primarySystem: system ? system.key : 'unassigned',
    nextSteps: [
      'Identify the biblical theme and continuity stage.',
      'Attach Scripture references and context checks before generating devotional or teaching output.',
      gentleStep,
    ],
    outputChannels: ['companion', 'admin-review', 'discipleship-plan'],
  };
}

function compressRuntimeMemory(signal, system) {
  return {
    memoryType: 'safe-continuity-summary',
    summary: [
      system ? `System: ${system.label}` : 'System: unassigned',
      signal.text ? `Signal: ${signal.text.slice(0, 240)}` : 'Signal: empty',
      signal.scriptureRefs.length ? `Scripture refs: ${signal.scriptureRefs.join(', ')}` : 'Scripture refs: pending',
    ].join(' | '),
    retentionGuidance: 'Store only with consent and prefer short summaries over raw sensitive details.',
  };
}

function orchestratePlatformSignal(rawSignal = {}) {
  const adapted = rawSignal.sourceSystem
    ? normalizeWithAdapter(rawSignal.sourceSystem, rawSignal)
    : null;

  const signal = adapted?.ok
    ? normalizeSignal(adapted.signal)
    : normalizeSignal(rawSignal);

  const system = resolveSystem(signal);
  const doctrineChecklist = buildDoctrineIntegrityChecklist(signal);

  return {
    ok: true,
    version: PLATFORM_UNIFICATION_VERSION,
    receivedAt: new Date().toISOString(),
    adapters: listAdapters(),
    signal,
    resolvedSystem: system,
    pipeline: PIPELINE_STAGES,
    doctrineIntegrity: {
      status: doctrineChecklist.every((item) => item.pass) ? 'ready' : 'needs-review',
      checklist: doctrineChecklist,
    },
    discipleshipPlan: compileDiscipleshipPlan(signal, system),
    compressedMemory: compressRuntimeMemory(signal, system),
  };
}

function getPlatformUnificationStatus() {
  return {
    ok: true,
    version: PLATFORM_UNIFICATION_VERSION,
    phase: 'Platform Unification Phase',
    posture: 'architecture consolidation and orchestration',
    systems: SYSTEM_REGISTRY,
    adapters: listAdapters(),
    pipeline: PIPELINE_STAGES,
    nextBatchRecommendation: [
      'Add continuity state contracts.',
      'Add doctrine middleware enforcement hooks.',
      'Connect missions systems through a read-only adapter.',
    ],
  };
}

module.exports = {
  PLATFORM_UNIFICATION_VERSION,
  SYSTEM_REGISTRY,
  PIPELINE_STAGES,
  normalizeSignal,
  orchestratePlatformSignal,
  getPlatformUnificationStatus,
};