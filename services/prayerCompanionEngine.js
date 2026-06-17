/**
 * Phase 5K/5L — Actual prayer responses (drafts only).
 */

function buildPrayerCompanionResponse({ message = '', anchor = {} } = {}) {
  const m = String(message || '');
  const familyCtx = anchor.currentRelationshipContext === 'family';
  const deeper = /\bdeeper prayer\b/i.test(m);

  const focus = familyCtx ? 'steady my heart as I talk with family' : 'steady my heart';
  let prayer = `Father, please ${focus}. Give me wisdom, peace, courage, and gentleness. Help me walk in truth with love and not fear. In Jesus' name, amen.`;

  if (deeper) {
    prayer = `Father, thank You that You are near. Please steady my heart and quiet my mind. Give me wisdom for every word, courage for hard conversations, and gentleness when I feel afraid. Help me trust You more than my circumstances, and help me love others without compromising what You have shown me in Scripture. Guard my thoughts, my speech, and my steps today. In Jesus' name, amen.`;
  }

  let reply = `Yes, I'll pray with you.\n\n${prayer}\n\nPhilippians 4:6-7 and James 1:5 are good Scriptures to hold onto.`;
  const scripture = [
    { reference: 'Philippians 4:6-7', theme: 'prayer' },
    { reference: 'James 1:5', theme: 'prayer' },
  ];

  if (/\bverse\b/i.test(m) && familyCtx) {
    reply += ' For courage in a hard conversation, Joshua 1:9 can steady the heart.';
    scripture.push({ reference: 'Joshua 1:9', theme: 'courage' });
  }

  return {
    reply,
    scripture,
    masterRoute: deeper ? 'phase5l_prayer_deeper' : 'phase5k_prayer_companion',
  };
}

module.exports = {
  buildPrayerCompanionResponse,
};
