const fs = require('fs');
const path = require('path');
const { SCRIPTURE_CATEGORY_ROADMAP } = require('../data/scriptureCategoryRoadmap');

function buildTemplate(category = 'example') {
  return `const SCRIPTURE_${category.toUpperCase()}_CONTINUITY_ENGINE = {
  ${category}_foundation_continuity: {
    ${category}Nodes: [
      'truth-anchor',
      'wisdom-anchor',
      'covenant-anchor'
    ],
    ${category}References: [
      'Genesis 1:1',
      'Isaiah 1:1',
      'Matthew 1:1',
      'Revelation 1:1'
    ],
    ${category}Mode: 'genesis-to-revelation'
  }
};

module.exports = {
  SCRIPTURE_${category.toUpperCase()}_CONTINUITY_ENGINE
};`;
}

function generateCategory(category = '') {
  const normalized = String(category || '').trim().toLowerCase();

  if (!normalized) {
    throw new Error('Category required.');
  }

  const fileName = `runtimeScripture${normalized
    .split('_')
    .map(v => v.charAt(0).toUpperCase() + v.slice(1))
    .join('')}ContinuityEngine.js`;

  const outputPath = path.join(__dirname, '..', 'services', fileName);

  fs.writeFileSync(outputPath, buildTemplate(normalized));

  return {
    generated: true,
    category: normalized,
    outputPath
  };
}

function generateNextRoadmapCategory() {
  const nextCategory = SCRIPTURE_CATEGORY_ROADMAP.nextCategoryQueue[0];

  if (!nextCategory) {
    return {
      generated: false,
      reason: 'No queued categories.'
    };
  }

  return generateCategory(nextCategory);
}

module.exports = {
  generateCategory,
  generateNextRoadmapCategory
};
