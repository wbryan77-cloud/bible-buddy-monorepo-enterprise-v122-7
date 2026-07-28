/**
 * Phase 5K/5L — Prayer responses (drafts).
 * Phase 7A — Use stated person/burden from message + shared relationship context.
 */

const { extractPrayerSubjectFromMessage, selectRelationshipContext } = require('./relationshipContextSelector');

function resolvePrayerFocus({ message = '', anchor = {}, relationshipContext = null, userId = '' } = {}) {
  const m = String(message || '');
  const ctx =
    relationshipContext ||
    (userId ? selectRelationshipContext({ userId, message: m }) : null);
  const fromMessage = extractPrayerSubjectFromMessage(m);
  const fromPrior =
    !fromMessage &&
    /\b(pray(?:\s+with\s+me)?\s+again|pray again)\b/i.test(m) &&
    extractPrayerSubjectFromMessage(ctx?.prayerContext?.lastRequest || '');
  const person =
    fromMessage?.person ||
    fromPrior?.person ||
    ctx?.importantPeople?.[0]?.label ||
    null;
  const burdenRaw =
    (ctx?.activeBurdens || [])
      .map((b) => b.text)
      .find((t) => t && !/^emotional context:/i.test(t) && !/^hi[, ]/i.test(t)) ||
    (/\bhospital|sick|ill|cancer|surgery|scared|afraid|worried|anxious\b/i.test(m)
      ? m.match(/\b(hospital|sick|ill|scared|afraid|worried|anxious)[^.?!]{0,40}/i)?.[0]
      : null);
  const burden = burdenRaw ? String(burdenRaw).replace(/\s+/g, ' ').trim().slice(0, 70) : null;

  const personPhrase = (() => {
    if (!person) return null;
    const p = String(person);
    // Kinship already includes "my" sense; named people do not.
    if (/^(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)$/i.test(p)) {
      return `my ${p.toLowerCase()}`;
    }
    return p;
  })();

  if (personPhrase && burden) {
    return {
      focus: `be near as I pray for ${personPhrase}. Please bring comfort and Your peace in this — ${String(burden).slice(0, 80)}`,
      person,
      personalized: true,
    };
  }
  if (personPhrase) {
    return {
      focus: `be near as I pray for ${personPhrase}. Please give comfort, wisdom, and peace`,
      person,
      personalized: true,
    };
  }
  if (anchor.currentRelationshipContext === 'family') {
    return { focus: 'steady my heart as I talk with family', person: null, personalized: false };
  }
  return { focus: 'steady my heart', person: null, personalized: false };
}

function buildPrayerCompanionResponse({
  message = '',
  anchor = {},
  relationshipContext = null,
  userId = '',
} = {}) {
  const m = String(message || '');
  const deeper = /\bdeeper prayer\b/i.test(m);
  const resolved = resolvePrayerFocus({ message: m, anchor, relationshipContext, userId });

  let prayer = `Father, please ${resolved.focus}. Give me wisdom, peace, courage, and gentleness. Help me walk in truth with love and not fear. In Jesus' name, amen.`;

  if (deeper) {
    const near = resolved.person
      ? `Please be near ${/^(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)$/i.test(resolved.person) ? `my ${String(resolved.person).toLowerCase()}` : resolved.person} and give me peace as I wait on You.`
      : 'Please steady my heart and quiet my mind.';
    prayer = `Father, thank You that You are near. ${near} Give me wisdom for every word, courage for hard moments, and gentleness when I feel afraid. Help me trust You more than my circumstances. Guard my thoughts, my speech, and my steps today. In Jesus' name, amen.`;
  }

  let reply = `Yes, I'll pray with you.\n\n${prayer}\n\nPhilippians 4:6-7 and James 1:5 are good Scriptures to hold onto.`;
  const scripture = [
    { reference: 'Philippians 4:6-7', theme: 'prayer' },
    { reference: 'James 1:5', theme: 'prayer' },
  ];

  if (/\bverse\b/i.test(m) && (anchor.currentRelationshipContext === 'family' || resolved.person)) {
    reply += ' For courage in a hard moment, Joshua 1:9 can steady the heart.';
    scripture.push({ reference: 'Joshua 1:9', theme: 'courage' });
  }

  return {
    reply,
    scripture,
    masterRoute: deeper ? 'phase5l_prayer_deeper' : 'phase5k_prayer_companion',
    personalized: !!resolved.personalized,
    prayerPerson: resolved.person || null,
  };
}

module.exports = {
  buildPrayerCompanionResponse,
  resolvePrayerFocus,
};
