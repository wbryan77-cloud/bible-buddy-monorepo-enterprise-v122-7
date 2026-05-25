const { getConversationState } = require('./runtimeConversationStateEngine');
const { getEmotionalContinuity } = require('./runtimeEmotionalContinuityEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');

const SCRIPTURE_MAP = {
  discouraged: ['Psalm 34:17-18', 'Isaiah 41:10', 'Matthew 11:28-30'],
  anxious: ['Philippians 4:6-7', 'Psalm 55:22', '1 Peter 5:7'],
  grieving: ['Psalm 147:3', 'John 14:1-3', 'Revelation 21:4'],
  hopeful: ['Romans 15:13', 'Jeremiah 29:11', 'Hebrews 10:23'],
  peaceful: ['Isaiah 26:3', 'John 14:27', 'Colossians 3:15'],
};

function buildContextualScriptureSuggestions(userId) {
  const emotional = getEmotionalContinuity(userId, 5);
  const state = getConversationState(userId);
  const prayers = getPrayerContinuity(userId, 5);

  const suggestions = new Set();

  emotional.forEach((entry) => {
    const signals = entry.signals || {};

    Object.entries(signals).forEach(([signal, active]) => {
      if (active && SCRIPTURE_MAP[signal]) {
        SCRIPTURE_MAP[signal].forEach((verse) => suggestions.add(verse));
      }
    });
  });

  if (state.currentTopic?.toLowerCase().includes('faith')) {
    suggestions.add('Hebrews 11:1');
    suggestions.add('Romans 10:17');
  }

  if (prayers.length) {
    suggestions.add('James 5:16');
    suggestions.add('Philippians 4:6-7');
  }

  return {
    scriptureFirst: true,
    contextualSuggestionsEnabled: true,
    currentTopic: state.currentTopic,
    suggestedScriptures: [...suggestions],
    continuityEnabled: true,
  };
}

module.exports = {
  buildContextualScriptureSuggestions,
};
