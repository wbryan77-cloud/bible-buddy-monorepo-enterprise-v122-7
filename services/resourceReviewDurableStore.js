'use strict';

const path = require('path');
const { getStorageAdapter } = require('./persistence/storageAdapter');

const DOC_PATH = path.join(__dirname, '..', 'data', 'resource-review', 'queue-durable.json');
const MAX_ITEMS = 4000;

function emptyDoc() {
  return { schemaVersion: 'issue11-resource-review-v1', items: [], updatedAt: null };
}

function trimItems(items) {
  return items.length > MAX_ITEMS ? items.slice(items.length - MAX_ITEMS) : items;
}

async function appendResourceReviewEvent(event) {
  const adapter = getStorageAdapter();
  const mutator = (current) => {
    const base = current && typeof current === 'object' ? current : emptyDoc();
    const items = Array.isArray(base.items) ? base.items.slice() : [];
    items.push(event);
    return {
      schemaVersion: 'issue11-resource-review-v1',
      items: trimItems(items),
      updatedAt: new Date().toISOString(),
      backend: adapter.kind || 'UNKNOWN',
    };
  };

  if (typeof adapter.updateJsonDocument !== 'function') {
    throw new Error('Resource review durable storage adapter does not support updateJsonDocument');
  }
  return Promise.resolve(adapter.updateJsonDocument(DOC_PATH, mutator, emptyDoc()));
}

async function readResourceReviewEvents() {
  const adapter = getStorageAdapter();
  if (typeof adapter.readJsonDocument !== 'function') {
    throw new Error('Resource review durable storage adapter does not support readJsonDocument');
  }
  const doc = await Promise.resolve(adapter.readJsonDocument(DOC_PATH, emptyDoc()));
  return Array.isArray(doc && doc.items) ? doc.items : [];
}

module.exports = {
  DOC_PATH,
  MAX_ITEMS,
  appendResourceReviewEvent,
  readResourceReviewEvents,
};
