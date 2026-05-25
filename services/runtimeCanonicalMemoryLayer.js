const CANONICAL_MEMORY_LAYER = {
  activeStudySessions: {},
  continuityHistory: {},
  traversalMemory: {}
};

function storeStudySession({
  sessionId = '',
  category = '',
  traversal = {}
} = {}) {
  CANONICAL_MEMORY_LAYER.activeStudySessions[sessionId] = {
    category,
    traversal,
    createdAt: new Date().toISOString()
  };

  return CANONICAL_MEMORY_LAYER.activeStudySessions[sessionId];
}

function storeContinuityHistory({
  category = '',
  references = []
} = {}) {
  if (!CANONICAL_MEMORY_LAYER.continuityHistory[category]) {
    CANONICAL_MEMORY_LAYER.continuityHistory[category] = [];
  }

  CANONICAL_MEMORY_LAYER.continuityHistory[category].push({
    references,
    storedAt: new Date().toISOString()
  });

  return CANONICAL_MEMORY_LAYER.continuityHistory[category];
}

function storeTraversalMemory({
  category = '',
  traversalStages = {}
} = {}) {
  CANONICAL_MEMORY_LAYER.traversalMemory[category] = traversalStages;

  return CANONICAL_MEMORY_LAYER.traversalMemory[category];
}

module.exports = {
  CANONICAL_MEMORY_LAYER,
  storeStudySession,
  storeContinuityHistory,
  storeTraversalMemory
};
