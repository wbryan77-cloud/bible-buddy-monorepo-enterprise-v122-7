const fs = require('fs');
const path = require('path');
const {
  getRegistryTopic,
  listRegistryTopicKeys,
  TOPIC_REGISTRY,
} = require('./genesisToRevelationContinuityRegistry');

const INVENTORY_PATH = path.join(__dirname, '..', 'data', 'phase2-registry-inventory.json');

let cachedInventory = null;

function loadInventory(forceReload = false) {
  if (cachedInventory && !forceReload) {
    return cachedInventory;
  }

  const raw = fs.readFileSync(INVENTORY_PATH, 'utf8');
  cachedInventory = JSON.parse(raw);
  return cachedInventory;
}

function findExistingChain(topicKey = '') {
  const key = String(topicKey || '').trim();
  const entry = getRegistryTopic(key);
  if (entry?.canonicalChain?.length) {
    return {
      topicKey: key,
      source: 'genesisToRevelationContinuityRegistry',
      chainLength: entry.canonicalChain.length,
    };
  }
  return null;
}

function findExistingEngine(engineName = '') {
  const name = String(engineName || '').trim();
  if (!name) return null;

  for (const [topicKey, entry] of Object.entries(TOPIC_REGISTRY)) {
    if (entry.canonicalEngine === name) {
      return { topicKey, engine: name, source: 'genesisToRevelationContinuityRegistry' };
    }
  }

  const inventory = loadInventory();
  const match = (inventory.engines || []).find((item) => item.name === name);
  return match || null;
}

function findExistingCatalog(catalogRef = '') {
  const ref = String(catalogRef || '').trim();
  if (!ref) return null;

  for (const [topicKey, entry] of Object.entries(TOPIC_REGISTRY)) {
    const sources = entry.sourceCatalogs || [];
    if (sources.includes(ref)) {
      return { topicKey, catalogRef: ref, source: 'genesisToRevelationContinuityRegistry' };
    }
  }

  const inventory = loadInventory();
  const match = (inventory.catalogs || []).find(
    (item) => item.file === ref || item.id === ref
  );
  return match || null;
}

function findDuplicateTopicKeys() {
  const inventory = loadInventory();
  const seen = new Map();
  const duplicates = [];

  for (const topic of inventory.topics || []) {
    const key = topic.topicKey;
    if (seen.has(key)) {
      duplicates.push({ topicKey: key, first: seen.get(key), duplicate: topic });
    } else {
      seen.set(key, topic);
    }
  }

  return duplicates;
}

function assertReuseBeforeCreate({ type = '', name = '', topicKey = '' } = {}) {
  const normalizedType = String(type || '').trim();
  const normalizedName = String(name || '').trim();
  const normalizedTopicKey = String(topicKey || '').trim();

  if (normalizedType === 'topic' && normalizedTopicKey) {
    const existing = getRegistryTopic(normalizedTopicKey);
    if (existing) {
      return {
        allowed: false,
        reason: 'topic_already_registered',
        existing: { topicKey: normalizedTopicKey, title: existing.title },
      };
    }
  }

  if (normalizedType === 'engine' && normalizedName) {
    const existing = findExistingEngine(normalizedName);
    if (existing) {
      return {
        allowed: false,
        reason: 'engine_already_registered',
        existing,
      };
    }
  }

  if (normalizedType === 'catalog' && normalizedName) {
    const existing = findExistingCatalog(normalizedName);
    if (existing) {
      return {
        allowed: false,
        reason: 'catalog_already_mapped',
        existing,
      };
    }
  }

  return { allowed: true, reason: 'reuse_check_passed' };
}

function getGovernanceSummary() {
  const inventory = loadInventory();
  return {
    inventoryVersion: inventory.version,
    sprint: inventory.sprint,
    registryTopicCount: listRegistryTopicKeys().length,
    inventoryTopicCount: (inventory.topics || []).length,
    catalogCount: (inventory.catalogs || []).length,
    engineCount: (inventory.engines || []).length,
    duplicateTopicKeys: findDuplicateTopicKeys(),
  };
}

module.exports = {
  INVENTORY_PATH,
  loadInventory,
  findExistingChain,
  findExistingEngine,
  findExistingCatalog,
  findDuplicateTopicKeys,
  assertReuseBeforeCreate,
  getGovernanceSummary,
};
