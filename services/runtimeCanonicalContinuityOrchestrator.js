const { SCRIPTURE_CATEGORY_ROADMAP } = require('../data/scriptureCategoryRoadmap');

function buildCanonicalTraversalResponse({
  category = '',
  references = [],
  mode = 'genesis-to-revelation'
} = {}) {
  return {
    category,
    traversalMode: mode,
    traversalStrategy: [
      'foundation',
      'prophetic-expansion',
      'messiah-fulfillment',
      'apostolic-witness',
      'revelation-completion'
    ],
    references,
    continuityGuardrails: SCRIPTURE_CATEGORY_ROADMAP.buildPurpose.guardrails
  };
}

function getCanonicalBuildObjectives() {
  return {
    mission: SCRIPTURE_CATEGORY_ROADMAP.buildPurpose.mission,
    methodology: SCRIPTURE_CATEGORY_ROADMAP.buildPurpose.method,
    completedCategories: SCRIPTURE_CATEGORY_ROADMAP.completedCategories,
    backlogCategories: SCRIPTURE_CATEGORY_ROADMAP.backlogCategories,
    nextCategoryQueue: SCRIPTURE_CATEGORY_ROADMAP.nextCategoryQueue
  };
}

module.exports = {
  buildCanonicalTraversalResponse,
  getCanonicalBuildObjectives
};
