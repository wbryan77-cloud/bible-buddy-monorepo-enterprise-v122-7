const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
const { mapDoctrineTopicToRegistryKey } = require('./doctrineSafetyLayer');
const { getRegistryChain, getRegistryTopic } = require('./genesisToRevelationContinuityRegistry');

function normalizeTopic(topic = '') {
  return String(topic || '').toLowerCase().replace(/_/g, '');
}

function isRelatedTopic(current = '', other = '') {
  const a = normalizeTopic(current);
  const b = normalizeTopic(other);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const STEP_SIGNIFICANCE = {
  'Genesis 2:2-3': 'the Sabbath begins at creation, where God rested and blessed the seventh day',
  'Exodus 20:8-11': 'the fourth commandment anchors Sabbath in creation and redemption',
  'Leviticus 23:1-3': 'Sabbath sits at the center of Yahweh\'s appointed times',
  'Isaiah 58:13-14': 'the Sabbath is connected to delight and blessing',
  'Luke 4:16': 'Yeshua kept the Sabbath as His custom in the synagogue',
  'Acts 13:42-44': 'believers continued gathering on the Sabbath after the resurrection',
  'Hebrews 4:9': 'a Sabbath rest remains for the people of God',
  'Daniel 2:44': 'the Kingdom of God is established and will not pass away',
  'Isaiah 9:6-7': 'the government and peace of the Messiah are foretold',
  'Micah 4:1-3': 'many nations come to the mountain of the LORD in the last days',
  'Revelation 11:15': 'the kingdoms of this world become the Kingdom of our God',
  'Leviticus 23:4-8': 'Passover opens the cycle of Yahweh\'s appointed feasts',
};

function getStepSignificance(ref = '') {
  const norm = normalizeRef(ref);
  for (const [key, value] of Object.entries(STEP_SIGNIFICANCE)) {
    const keyNorm = normalizeRef(key);
    if (norm === keyNorm || norm.startsWith(keyNorm) || keyNorm.startsWith(norm)) {
      return value;
    }
  }
  return 'Scripture builds this theme line upon line';
}

function buildContinueJourneyReply({ label, lastRef, nextRef }) {
  const why = getStepSignificance(nextRef);
  return `Last time we were looking at ${lastRef} in our ${label} study. The next step is ${nextRef}, where ${why}. Would you like to walk through that passage together?`;
}

function normalizeRef(ref = '') {
  return String(ref).toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseRef(ref = '') {
  const match = String(ref).match(/^(\d?\s*[A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!match) return { book: String(ref).trim(), chapter: 0, ref };
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    ref: String(ref).trim(),
  };
}

function findLastStudiedReference(sessions = [], doctrineTopic = '') {
  const related = sessions.filter((session) =>
    isRelatedTopic(doctrineTopic, session.topic)
  );

  for (let i = related.length - 1; i >= 0; i -= 1) {
    const refs = related[i].references || [];
    if (refs.length) return refs[refs.length - 1];
    if (related[i].studyStep) return related[i].studyStep;
  }

  return null;
}

function findNextInRegistryChain(lastRef, registryKey) {
  const chain = getRegistryChain(registryKey) || [];
  const refs = chain.map((node) => node.reference);
  const lastNorm = normalizeRef(lastRef);

  const idx = refs.findIndex((ref) => {
    const norm = normalizeRef(ref);
    return norm === lastNorm || norm.startsWith(lastNorm) || lastNorm.startsWith(norm);
  });

  if (idx >= 0 && idx < refs.length - 1) {
    return {
      lastRef: refs[idx],
      nextRef: refs[idx + 1],
      chainPosition: idx + 1,
      chainLength: refs.length,
    };
  }

  return null;
}

function buildContinueStudyOffer({ userId, doctrineTopic = '' }) {
  const registryKey = mapDoctrineTopicToRegistryKey(doctrineTopic) || doctrineTopic;
  const entry = getRegistryTopic(registryKey);
  const sessions = getRecentStudySessions(userId, 25);
  const lastRef = findLastStudiedReference(sessions, doctrineTopic);
  const chainStep = lastRef ? findNextInRegistryChain(lastRef, registryKey) : null;

  if (chainStep?.nextRef) {
    const lastParsed = parseRef(chainStep.lastRef);
    const nextParsed = parseRef(chainStep.nextRef);
    const phrase =
      lastParsed.book && nextParsed.book
        ? `You stopped after ${lastParsed.book} ${lastParsed.chapter}. Would you like to continue into ${nextParsed.book} ${nextParsed.chapter}?`
        : `You stopped after ${chainStep.lastRef}. Would you like to continue into ${chainStep.nextRef}?`;

    return {
      enabled: true,
      resumeStudy: true,
      resumeVersePath: true,
      resumeContinuityChain: true,
      lastReference: chainStep.lastRef,
      nextReference: chainStep.nextRef,
      phrase,
      registryKey,
      title: entry?.title || doctrineTopic,
      chainPosition: chainStep.chainPosition,
      chainLength: chainStep.chainLength,
    };
  }

  const related = sessions.filter((session) =>
    isRelatedTopic(doctrineTopic, session.topic)
  );

  if (related.length) {
    const last = related[related.length - 1];
    const refs = (last.references || []).slice(-2).join(', ');
    return {
      enabled: true,
      resumeStudy: true,
      resumeVersePath: false,
      resumeContinuityChain: true,
      lastReference: lastRef || refs || null,
      nextReference: null,
      phrase: refs
        ? `Last time we studied ${last.topic} around ${refs}. Would you like to pick up there?`
        : `Would you like to pick up where we left off studying ${last.topic || 'this topic'}?`,
      registryKey,
      title: entry?.title || doctrineTopic,
    };
  }

  const chain = getRegistryChain(registryKey) || [];
  const firstRef = chain[0]?.reference || null;

  return {
    enabled: !!entry,
    resumeStudy: false,
    resumeVersePath: false,
    resumeContinuityChain: false,
    lastReference: null,
    nextReference: firstRef,
    phrase: firstRef
      ? `We can begin a Genesis-to-Revelation path starting at ${firstRef}. Would you like to continue?`
      : 'Would you like to continue studying this topic together?',
    registryKey,
    title: entry?.title || doctrineTopic,
  };
}

module.exports = {
  buildContinueStudyOffer,
  findLastStudiedReference,
  findNextInRegistryChain,
  parseRef,
  getStepSignificance,
  buildContinueJourneyReply,
};
