const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GOVERNANCE_FILE = path.join(DATA_DIR, 'runtime-scripture-language-governance.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const REPLACEMENT_RULES = {
  'mosaic covenant': 'the covenant given to Moses by God at Sinai',
  'moses law': 'the law given to Moses by God',
  'law of moses': 'the law given through Moses by God',
  'abrahamic covenant': 'the covenant given to Abraham by God',
  'davidic covenant': 'the covenant concerning David and the throne',
  'old testament law': 'the commandments and laws spoken by God',
  'ceremonial law': 'instructions and ordinances spoken by God',
  'levitical law': 'instructions given concerning the priesthood and service',
  'jewish holidays': 'appointed times spoken of in Scripture',
  'biblical holidays': 'appointed times spoken of in Scripture'
};

function readStore() {
  try {
    if (!fs.existsSync(GOVERNANCE_FILE)) return {};
    return JSON.parse(fs.readFileSync(GOVERNANCE_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Scripture governance write failed:', error.message);
  }
}

function normalizeScriptureLanguage(text = '') {
  let normalized = String(text || '');

  Object.entries(REPLACEMENT_RULES).forEach(([phrase, replacement]) => {
    const regex = new RegExp(phrase, 'gi');
    normalized = normalized.replace(regex, replacement);
  });

  return normalized;
}

function saveGovernanceCorrection({
  userId,
  original,
  corrected,
  category = 'scripture-language'
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    original,
    corrected,
    category,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);
}

function buildScriptureGovernanceContext() {
  return {
    scriptureFirst: true,
    governanceEnabled: true,
    replacementRules: REPLACEMENT_RULES,
    guidance: {
      avoidDenominationalLabels: true,
      preserveScriptureFirstLanguage: true,
      preserveDirectBiblicalPhrasing: true,
      avoidTheologicalSystemPackaging: true,
      preserveGenesisToRevelationContinuity: true,
      preserveLineUponLineStructure: true,
    },
  };
}

module.exports = {
  normalizeScriptureLanguage,
  saveGovernanceCorrection,
  buildScriptureGovernanceContext,
};
