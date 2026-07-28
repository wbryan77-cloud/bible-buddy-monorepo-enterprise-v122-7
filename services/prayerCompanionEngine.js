/**
 * Phase 5K/5L — Prayer responses (drafts).
 * Phase 7A/7B — Person/burden focus; short / no-explanation modes; no vague confabulation.
 */

const {
  extractPrayerSubjectFromMessage,
  selectRelationshipContext,
  isVaguePriorPrayerAsk,
} = require('./relationshipContextSelector');

function resolvePrayerFocus({ message = '', anchor = {}, relationshipContext = null, userId = '' } = {}) {
  const m = String(message || '');
  const ctx =
    relationshipContext ||
    (userId ? selectRelationshipContext({ userId, message: m }) : null);
  const fromMessage = extractPrayerSubjectFromMessage(m);
  const againLike = /\b(pray(?:\s+with\s+me)?\s+again|pray again|can we pray again)\b/i.test(m);
  const fromPrior =
    !fromMessage &&
    againLike &&
    extractPrayerSubjectFromMessage(ctx?.prayerContext?.lastRequest || '');
  const person =
    fromMessage?.person ||
    fromPrior?.person ||
    ctx?.importantPeople?.[0]?.label ||
    null;

  const burdenRaw =
    (ctx?.activeBurdens || [])
      .map((b) => b.text)
      .find((t) => t && !/^emotional context:/i.test(t)) ||
    (/\bhospital|sick|ill|cancer|surgery|scared|afraid|worried|anxious\b/i.test(m)
      ? m.match(/\b(?:hospital|sick|ill|surgery|scared|afraid|worried|anxious)[^.?!]{0,40}/i)?.[0]
      : null);
  const burden = burdenRaw ? String(burdenRaw).replace(/\s+/g, ' ').trim().slice(0, 70) : null;

  // Vague prior ask without a recoverable person → ask once, do not invent
  if (isVaguePriorPrayerAsk(m) && !person) {
    return {
      focus: null,
      person: null,
      personalized: false,
      needsClarification: true,
    };
  }

  const personPhrase = (() => {
    if (!person) return null;
    const p = String(person);
    if (/^(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)$/i.test(p)) {
      return `my ${p.toLowerCase()}`;
    }
    return p;
  })();

  if (personPhrase && burden) {
    return {
      focus: `be near as I pray for ${personPhrase}. Please bring comfort and Your peace concerning ${burden}`,
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
  const shortAsk = /\b(short prayer|brief prayer|just a (short |quick )?prayer|quick prayer)\b/i.test(m);
  const noAdvice = /\b(no explanation|just pray|only pray|prayer only|no advice)\b/i.test(m);
  const scriptureOnly = /\b(scripture only|using scripture only|pray using scripture)\b/i.test(m);
  const resolved = resolvePrayerFocus({ message: m, anchor, relationshipContext, userId });

  if (resolved.needsClarification) {
    return {
      reply:
        "I’d like to pray with you — can you name who or what you’d like us to bring before God? I don’t want to guess.",
      scripture: [],
      masterRoute: 'phase7b_prayer_clarifier',
      personalized: false,
      prayerPerson: null,
    };
  }

  let prayer;
  if (shortAsk || noAdvice) {
    const who = resolved.person
      ? /^(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)$/i.test(resolved.person)
        ? `my ${String(resolved.person).toLowerCase()}`
        : resolved.person
      : 'this need';
    prayer = `Father, please be near ${who}. Give peace and wisdom. In Jesus' name, amen.`;
  } else if (deeper) {
    const near = resolved.person
      ? `Please be near ${/^(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)$/i.test(resolved.person) ? `my ${String(resolved.person).toLowerCase()}` : resolved.person} and give me peace as I wait on You.`
      : 'Please steady my heart and quiet my mind.';
    prayer = `Father, thank You that You are near. ${near} Give me wisdom for every word, courage for hard moments, and gentleness when I feel afraid. Help me trust You more than my circumstances. Guard my thoughts, my speech, and my steps today. In Jesus' name, amen.`;
  } else {
    prayer = `Father, please ${resolved.focus}. Give me wisdom, peace, courage, and gentleness. Help me walk in truth with love and not fear. In Jesus' name, amen.`;
  }

  let reply = `Yes, I'll pray with you.\n\n${prayer}`;
  const scripture = [];

  if (!noAdvice && !shortAsk) {
    if (scriptureOnly) {
      reply += '\n\nPhilippians 4:6-7.';
      scripture.push({ reference: 'Philippians 4:6-7', theme: 'prayer' });
    } else {
      reply += '\n\nPhilippians 4:6-7 and James 1:5 are good Scriptures to hold onto.';
      scripture.push(
        { reference: 'Philippians 4:6-7', theme: 'prayer' },
        { reference: 'James 1:5', theme: 'prayer' },
      );
    }
  }

  if (/\bverse\b/i.test(m) && !noAdvice && (anchor.currentRelationshipContext === 'family' || resolved.person)) {
    reply += ' For courage in a hard moment, Joshua 1:9 can steady the heart.';
    scripture.push({ reference: 'Joshua 1:9', theme: 'courage' });
  }

  return {
    reply,
    scripture,
    masterRoute: deeper ? 'phase5l_prayer_deeper' : shortAsk || noAdvice ? 'phase7b_prayer_concise' : 'phase5k_prayer_companion',
    personalized: !!resolved.personalized,
    prayerPerson: resolved.person || null,
  };
}

module.exports = {
  buildPrayerCompanionResponse,
  resolvePrayerFocus,
};
