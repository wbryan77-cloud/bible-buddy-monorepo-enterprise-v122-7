const { generateCanonicalStudy } = require('./runtimeCanonicalStudyGenerator');
const {
  storeStudySession,
  storeTraversalMemory
} = require('./runtimeCanonicalMemoryLayer');

function createDynamicStudySession({
  sessionId = '',
  category = '',
  references = []
} = {}) {
  const study = generateCanonicalStudy({
    category,
    references
  });

  const storedSession = storeStudySession({
    sessionId,
    category,
    traversal: study.studyFlow
  });

  const traversalMemory = storeTraversalMemory({
    category,
    traversalStages: study.studyFlow
  });

  return {
    sessionId,
    category,
    study,
    storedSession,
    traversalMemory,
    sessionObjective:
      'Generate dynamic Genesis to Revelation continuity studies.'
  };
}

module.exports = {
  createDynamicStudySession
};
