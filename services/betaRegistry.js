const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, '..', 'data', 'beta-testers.json');

function readRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return { cohorts: {}, testers: [] };
    }
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')) || { testers: [] };
  } catch (_) {
    return { testers: [] };
  }
}

function getActiveTesters({ cohort = null } = {}) {
  const registry = readRegistry();
  let testers = (registry.testers || []).filter((t) => t.active !== false);
  if (cohort) {
    testers = testers.filter((t) => t.cohort === cohort);
  }
  return testers.map((t) => ({
    testerId: t.testerId,
    displayName: t.displayName,
    cohort: t.cohort,
  }));
}

function getTester(testerId) {
  const registry = readRegistry();
  return (registry.testers || []).find((t) => t.testerId === testerId) || null;
}

function isActiveTester(testerId) {
  const tester = getTester(testerId);
  return !!(tester && tester.active !== false);
}

function resolveCohortLabel(cohortKey) {
  const registry = readRegistry();
  return registry.cohorts?.[cohortKey] || cohortKey || null;
}

module.exports = {
  readRegistry,
  getActiveTesters,
  getTester,
  isActiveTester,
  resolveCohortLabel,
  REGISTRY_FILE,
};
