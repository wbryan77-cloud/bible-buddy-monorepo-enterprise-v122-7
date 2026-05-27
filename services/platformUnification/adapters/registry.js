// services/platformUnification/adapters/registry.js
// Thin, read-only adapter registry for Platform Unification.
//
// Rule for this phase:
// - adapters describe existing system families
// - adapters do not replace, rename, or rewrite existing modules
// - adapters normalize signals for the canonical orchestrator

const ADAPTER_VERSION = 'platform-adapters.v1';

const adapterRegistry = new Map();

function defineAdapter(config) {
  if (!config || !config.key) {
    throw new Error('Platform adapter requires a key.');
  }

  const adapter = {
    key: config.key,
    label: config.label || config.key,
    family: config.family || 'unassigned',
    status: config.status || 'registered',
    mode: config.mode || 'read-only',
    sourcePaths: Array.isArray(config.sourcePaths) ? config.sourcePaths : [],
    accepts: Array.isArray(config.accepts) ? config.accepts : [],
    emits: Array.isArray(config.emits) ? config.emits : [],
    normalize:
      typeof config.normalize === 'function'
        ? config.normalize
        : (input = {}) => ({
            sourceSystem: config.key,
            type: input.type || 'adapter-signal',
            text: input.text || input.note || input.summary || '',
            scriptureRefs: Array.isArray(input.scriptureRefs) ? input.scriptureRefs : [],
            tags: Array.isArray(input.tags) ? input.tags : [],
          }),
  };

  adapterRegistry.set(adapter.key, adapter);
  return adapter;
}

function registerAdapter(config) {
  return defineAdapter(config);
}

function getAdapter(key) {
  return adapterRegistry.get(key) || null;
}

function listAdapters() {
  return Array.from(adapterRegistry.values()).map((adapter) => ({
    key: adapter.key,
    label: adapter.label,
    family: adapter.family,
    status: adapter.status,
    mode: adapter.mode,
    sourcePaths: adapter.sourcePaths,
    accepts: adapter.accepts,
    emits: adapter.emits,
  }));
}

function normalizeWithAdapter(key, input = {}) {
  const adapter = getAdapter(key);
  if (!adapter) {
    return {
      ok: false,
      error: 'adapter_not_registered',
      key,
    };
  }

  return {
    ok: true,
    adapter: {
      key: adapter.key,
      label: adapter.label,
      family: adapter.family,
      mode: adapter.mode,
    },
    signal: adapter.normalize(input),
  };
}

module.exports = {
  ADAPTER_VERSION,
  registerAdapter,
  getAdapter,
  listAdapters,
  normalizeWithAdapter,
};
