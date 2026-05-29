const { routeDoctrineResponse } = require('./doctrineResponseRouter');
const { sanitizeDoctrineResponse } = require('./runtimeResponseSanitizer');
const { validateDoctrineResponse } = require('./runtimeQualityValidator');
const { scoreContinuityPersistence } = require('./continuityPersistenceScoring');
const { buildDoctrineSourceProvenance } = require('./doctrineSourceProvenance');
const { escalateDoctrineConflict } = require('./doctrineConflictEscalationPipeline');
const { runDoctrineHarness } = require('../tests/automatedDoctrineQaHarness');

function detectTopic(message = '') {
  const lower = String(message).toLowerCase();

  if (lower.includes('sabbath')) return 'sabbath';
  if (lower.includes('dietary')) return 'dietaryLaw';
  if (lower.includes('unclean')) return 'dietaryLaw';
  if (
    lower.includes('passover') ||
    lower.includes('unleavened bread') ||
    lower.includes('tabernacles') ||
    lower.includes('pentecost') ||
    lower.includes('feast day') ||
    lower.includes('feast days') ||
    lower.includes('leviticus 23')
  ) {
    return 'feast_days';
  }
  if (lower.includes('christmas')) return 'traditions';
  if (lower.includes('easter')) return 'traditions';
  if (lower.includes('tradition')) return 'traditions';
  if (
    lower.includes('resurrection') ||
    lower.includes('three days and three nights') ||
    lower.includes('matthew 12:40') ||
    lower.includes('resurrection timeline') ||
    lower.includes('first day of the week')
  ) {
    return 'resurrection_timeline';
  }

  return 'general';
}

function runDoctrineRuntimePipeline({ message = '' }) {
  const topic = detectTopic(message);

  const routed = routeDoctrineResponse(message);

  if (!routed) {
    return null;
  }

  const sanitizedReply = sanitizeDoctrineResponse(routed.reply || '');

  const validation = validateDoctrineResponse(sanitizedReply, topic);

  const continuity = scoreContinuityPersistence({
    scriptures: routed.scripture || [],
    reply: sanitizedReply,
  });

  const provenance = buildDoctrineSourceProvenance({
    scriptures: (routed.scripture || []).map((s) => s.reference || s),
    historySources: ['Bible-first continuity engine'],
  });

  const escalation = escalateDoctrineConflict({
    score: continuity.score,
    issues: [...validation.issues, ...continuity.issues],
    reply: sanitizedReply,
  });

  const qa = runDoctrineHarness();

  return {
    intercepted: true,
    topic,
    reply: {
      ...routed,
      reply: sanitizedReply,
      validation,
      continuity,
      provenance,
      escalation,
      qa,
      runtimeMode: 'doctrine_first_intercept',
    },
  };
}

module.exports = {
  runDoctrineRuntimePipeline,
};