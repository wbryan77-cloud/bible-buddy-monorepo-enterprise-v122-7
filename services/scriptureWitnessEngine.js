const { mapDoctrineTopicToRegistryKey } = require('./doctrineSafetyLayer');
const { getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { TIER } = require('./scriptureCertaintyFramework');

const WITNESS_LEVELS = Object.freeze({
  SINGLE: 1,
  MULTI: 2,
  CONTINUITY: 3,
});

function normalizeRef(ref = '') {
  return String(ref?.reference || ref || '')
    .trim()
    .toLowerCase();
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const item of refs) {
    const ref = String(item?.reference || item || '').trim();
    const key = ref.toLowerCase();
    if (!ref || seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function collectWitnessReferences({ doctrineTopic = '', scripture = [], chainMeta = {} }) {
  const fromResponse = uniqueRefs(scripture);
  const fromChain = uniqueRefs(chainMeta.genesisToRevelationPath || []);
  const registryKey = mapDoctrineTopicToRegistryKey(doctrineTopic);
  const registryChain = (getRegistryChain(registryKey) || [])
    .filter((node) => node.tier === TIER.A || node.strongB)
    .map((node) => node.reference);

  const merged = uniqueRefs([...fromResponse, ...fromChain, ...registryChain]);
  return {
    primary: merged[0] || null,
    confirming: merged[1] || null,
    continuity: merged[2] || null,
    all: merged,
  };
}

function determineWitnessLevel({ refs, chainMeta = {} }) {
  const count = refs.all.length;
  const hasChain = !!(chainMeta.genesisToRevelationPath?.length || refs.continuity);
  if (count >= 3 && hasChain) return WITNESS_LEVELS.CONTINUITY;
  if (count >= 2) return WITNESS_LEVELS.MULTI;
  return WITNESS_LEVELS.SINGLE;
}

function buildWitnessConnectionText({ refs, level }) {
  if (level === WITNESS_LEVELS.SINGLE && refs.primary) {
    return `Scripture speaks directly through ${refs.primary}. Where additional passages are available, we build from there line upon line.`;
  }

  if (level >= WITNESS_LEVELS.MULTI && refs.primary && refs.confirming) {
    let text = `${refs.primary} establishes the matter, and ${refs.confirming} confirms it alongside Scripture.`;
    if (level === WITNESS_LEVELS.CONTINUITY && refs.continuity) {
      text += ` ${refs.continuity} carries the theme forward across the biblical witness.`;
    }
    return text;
  }

  return null;
}

function buildScriptureWitnessBlock({ doctrineTopic = '', scripture = [], chainMeta = {} }) {
  const refs = collectWitnessReferences({ doctrineTopic, scripture, chainMeta });
  const level = determineWitnessLevel({ refs, chainMeta });
  const connection = buildWitnessConnectionText({ refs, level });

  const supplementalScripture = refs.all.slice(0, 3).map((reference) => ({
    reference,
    text: '',
    reason: 'supporting witness',
  }));

  const existing = uniqueRefs(scripture);
  const enrichedScripture = uniqueRefs([...existing, ...refs.all]).slice(0, 6).map((reference) => {
    const found = (scripture || []).find((item) => normalizeRef(item) === reference.toLowerCase());
    return found || { reference, text: '', reason: 'supporting witness' };
  });

  const blockParts = [];
  if (connection) blockParts.push(connection);
  if (refs.all.length >= 2) {
    blockParts.push(
      `Witness path: ${refs.all.slice(0, 3).join(' → ')}`
    );
  }

  return {
    level,
    witnessLevelLabel:
      level === WITNESS_LEVELS.CONTINUITY
        ? 'Level 3 — Continuity Chain'
        : level === WITNESS_LEVELS.MULTI
          ? 'Level 2 — Two or more Scriptures'
          : 'Level 1 — Single Scripture',
    refs,
    connection,
    block: blockParts.filter(Boolean).join('\n\n'),
    enrichedScripture,
    supplementalScripture,
    scriptureInterpretsScripture: refs.all.length >= 2,
    conclusionFollowsScripture: true,
  };
}

module.exports = {
  WITNESS_LEVELS,
  collectWitnessReferences,
  buildScriptureWitnessBlock,
};
