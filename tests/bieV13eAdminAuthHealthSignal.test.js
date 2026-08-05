/**
 * BIE v1.3E — health exposes adminAuthConfigured boolean only
 * Run: node --test tests/bieV13eAdminAuthHealthSignal.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('BIE v1.3E admin auth health signal', () => {
  it('1. health builder reports adminAuthConfigured without token values', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.match(src, /adminAuthConfigured/);
    assert.match(src, /resolveAdminToken/);
    assert.doesNotMatch(src, /adminAuthConfigured:\s*process\.env\.BIBLE_AUTHORITY_ADMIN_TOKEN/);
  });
});
