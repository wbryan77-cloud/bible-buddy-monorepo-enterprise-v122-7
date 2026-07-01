/**
 * Experiment-only: classify which layer produced a Buddy reply.
 * Used by BibleBuddy Lite baseline — does not modify production routing.
 */

const TEMPLATE_ROUTES = new Set([
  'sabbath_history',
  'historical_evidence',
  'historical_follow_up',
  'meta_about_previous_answer',
  'sabbath_definition',
  'doctrine_general',
  'continue_study',
  'registry_study',
]);

const RESPONDER_ROUTES = new Set([
  'health_support',
  'grief_support',
  'rest_support',
  'prayer',
  'job_discernment',
  'memory_recall',
  'study_connection',
  'open_life',
]);

const TEMPLATE_MARKERS = [
  /Source-grounded answer/i,
  /historical development of Sunday/i,
  /Constantine|Council of Laodicea|Edict of Milan/i,
  /I use (the phrase|shorthand|term) "Roman church"/i,
  /wording choice/i,
  /Genesis-to-Revelation path/i,
  /Would you like to continue studying/i,
  /continue your study journey/i,
  /Feast Days \(Leviticus 23\)/i,
  /presenter:\s*sabbathHistoryDeepResponder/i,
  /Scripture identifies the seventh day/i,
];

const FALLBACK_MARKERS = [
  /slow this down together/i,
  /tell me a little more/i,
  /I'm here with you/i,
  /Could you share a bit more/i,
  /walk through this step by step/i,
];

const OPENAI_MARKERS = [
  /"confidence"\s*:/,
  /masterRoute.*open_general/,
];

function classifyReplySource(structured = {}) {
  const route = structured?.runtime?.masterRoute || structured?.runtime?.intent || 'unknown';
  const reply = String(structured?.reply || structured?.message || '');
  const presenter = structured?.runtime?.presenter || structured?.runtime?.companionPresentation?.presenter || '';

  if (route === 'open_general' && !FALLBACK_MARKERS.some((p) => p.test(reply))) {
    return { layer: 'openai', route, method: 'masterRoute' };
  }

  if (route === 'crisis') {
    return { layer: 'fallback', route, method: 'crisis_route' };
  }

  if (TEMPLATE_ROUTES.has(route) || presenter.includes('sabbathHistoryDeepResponder') || presenter.includes('metaAnswer')) {
    return { layer: 'template', route, method: 'route_owner' };
  }

  if (RESPONDER_ROUTES.has(route)) {
    return { layer: 'responder', route, method: 'route_owner' };
  }

  if (structured?.runtime?.answerMatchFallback || structured?.runtime?.answerMatchRegenerated) {
    return { layer: 'template', route: route || 'meta_regen', method: 'answer_match_gate' };
  }

  if (TEMPLATE_MARKERS.some((p) => p.test(reply))) {
    return { layer: 'template', route, method: 'text_signature' };
  }

  if (FALLBACK_MARKERS.some((p) => p.test(reply))) {
    return { layer: 'fallback', route, method: 'text_signature' };
  }

  if (/Here is what I have stored from our recent conversations/i.test(reply)) {
    return { layer: 'responder', route: 'memory_recall', method: 'text_signature' };
  }

  if (OPENAI_MARKERS.some((p) => p.test(JSON.stringify(structured)))) {
    return { layer: 'openai', route, method: 'structured_signature' };
  }

  if (reply.length > 0) {
    return { layer: 'responder', route, method: 'default_responder' };
  }

  return { layer: 'fallback', route, method: 'empty' };
}

function aggregateSourcePercentages(classifications = []) {
  const counts = { template: 0, responder: 0, fallback: 0, openai: 0 };
  for (const c of classifications) {
    const key = c.layer;
    if (counts[key] !== undefined) counts[key] += 1;
  }
  const total = classifications.length || 1;
  return {
    counts,
    total,
    percentages: {
      template: Math.round((counts.template / total) * 1000) / 10,
      responder: Math.round((counts.responder / total) * 1000) / 10,
      fallback: Math.round((counts.fallback / total) * 1000) / 10,
      openai: Math.round((counts.openai / total) * 1000) / 10,
    },
  };
}

module.exports = {
  TEMPLATE_ROUTES,
  RESPONDER_ROUTES,
  classifyReplySource,
  aggregateSourcePercentages,
};
