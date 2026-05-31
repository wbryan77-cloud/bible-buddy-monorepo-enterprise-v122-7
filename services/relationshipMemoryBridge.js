const { saveRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');

const DOCTRINE_CONCLUSION_MARKERS = [
  /\bmust keep\b/i,
  /\bwas abolished\b/i,
  /\breplaced the sabbath\b/i,
  /\bchanged from saturday\b/i,
  /\bcommanded in scripture to celebrate christmas\b/i,
  /\bdoctrine conclusion\b/i,
];

const HEALTH_PATTERNS = [
  { pattern: /\bknee(s)?\b/i, issue: 'knee pain' },
  { pattern: /\bback pain\b/i, issue: 'back pain' },
  { pattern: /\bblood pressure\b/i, issue: 'blood pressure' },
  { pattern: /\bcholesterol\b/i, issue: 'cholesterol' },
  { pattern: /\bweight goal\b|\blosing weight\b|\bgain weight\b/i, issue: 'weight goals' },
  { pattern: /\bsleep(ing)?\b|\binsomnia\b|\bcan'?t sleep\b/i, issue: 'sleep issues' },
  { pattern: /\bfatigue\b|\btired\b|\bexhausted\b|\bweary\b/i, issue: 'fatigue' },
  { pattern: /\bexercise goal\b|\bworking out\b|\bworkout\b/i, issue: 'exercise goals' },
  { pattern: /\bmedical\b|\bdoctor\b|\bdiagnosis\b|\bprescribed\b/i, issue: 'medical concerns' },
  { pattern: /\bhurt(ing)?\b|\bache\b|\bpain\b|\bsore\b/i, issue: 'physical discomfort' },
];

function looksLikeDoctrineConclusion(text = '') {
  return DOCTRINE_CONCLUSION_MARKERS.some((pattern) => pattern.test(String(text)));
}

function detectHealthConcern(message = '') {
  const text = String(message || '');
  for (const entry of HEALTH_PATTERNS) {
    if (entry.pattern.test(text)) {
      return { issue: entry.issue, detail: text.slice(0, 220) };
    }
  }
  return null;
}

function persistRelationshipMemoryFromInteraction({
  userId,
  message = '',
  runtimeContext = {},
  doctrineTopic = null,
  structured = {},
}) {
  if (!userId || !message) return { saved: 0 };

  const lower = String(message).toLowerCase();
  let saved = 0;

  const save = (category, detail, importance = 'normal', issue = null) => {
    if (!detail || looksLikeDoctrineConclusion(detail)) return;
    saveRelationshipMemory({
      userId,
      category,
      detail: String(detail).slice(0, 220),
      issue,
      importance,
    });
    saved += 1;
  };

  const health = detectHealthConcern(message);
  if (health) {
    save('health_concerns', health.detail, 'high', health.issue);
  }

  if (
    /lost (a |my )?(friend|mother|father|child|spouse|parent|brother|sister|son|daughter|husband|wife)/.test(
      lower
    ) ||
    /passed away|funeral|mourning|grieving/.test(lower)
  ) {
    save('grief_events', message, 'high');
  }

  if (/\b(pray|prayer)\b/.test(lower)) {
    save('prayer_requests', message, 'high');
  }

  if (/\bmy (mom|dad|wife|husband|friend|child|son|daughter|brother|sister|parent|mother|father)\b/.test(lower)) {
    save('important_people', message, 'high');
  }

  if (/tired|exhausted|weary|need rest|burned out|burnout/.test(lower) && !health) {
    save('recurring_struggles', 'carrying weariness and need for rest', 'normal', 'fatigue');
  }

  if (/goal|trying to|working on|hope to|want to grow/.test(lower)) {
    const isMajor = /major|life|career|family|health|house|job|marriage/.test(lower);
    save('ongoing_goals', message, isMajor ? 'high' : 'normal');
  }

  if (/struggle|hard season|difficult time|overwhelmed|anxious|stressed/.test(lower)) {
    save('recurring_struggles', message, 'normal');
  }

  if (/graduated|promotion|new job|milestone|anniversary|birthday/.test(lower)) {
    save('life_milestones', message, 'normal');
  }

  if (doctrineTopic && !looksLikeDoctrineConclusion(message)) {
    save('favorite_study_topics', `studying ${doctrineTopic}`, 'normal', doctrineTopic);
  } else if (
    (runtimeContext?.intent === 'study' || runtimeContext?.intent === 'doctrinal_study') &&
    !['companion', 'general'].includes(runtimeContext?.intent)
  ) {
    const studyHint = message.slice(0, 120);
    if (studyHint && !looksLikeDoctrineConclusion(studyHint)) {
      save('favorite_study_topics', studyHint, 'normal');
    }
  }

  if (structured?.mode === 'prayer' && !/\b(pray|prayer)\b/.test(lower)) {
    save('prayer_requests', message, 'high');
  }

  return { saved };
}

module.exports = {
  persistRelationshipMemoryFromInteraction,
  looksLikeDoctrineConclusion,
  detectHealthConcern,
  HEALTH_PATTERNS,
};
