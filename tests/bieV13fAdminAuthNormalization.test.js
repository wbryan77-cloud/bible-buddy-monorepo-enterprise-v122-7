/**
 * BIE v1.3F — Admin auth secret normalization + fingerprint
 * Run: node --test tests/bieV13fAdminAuthNormalization.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSecret,
  resolveAdminToken,
  extractProvidedToken,
  checkAdminAuth,
  adminAuthFingerprint,
} = require('../services/adminAuthMiddleware');

describe('BIE v1.3F admin auth normalization', () => {
  const prev = {
    bible: process.env.BIBLE_AUTHORITY_ADMIN_TOKEN,
    alpha: process.env.ALPHA_ADMIN_TOKEN,
    beta: process.env.BETA_REVIEW_TOKEN,
  };

  before(() => {
    process.env.BIBLE_AUTHORITY_ADMIN_TOKEN = '  secret-value  \n';
    delete process.env.ALPHA_ADMIN_TOKEN;
    delete process.env.BETA_REVIEW_TOKEN;
  });

  after(() => {
    if (prev.bible === undefined) delete process.env.BIBLE_AUTHORITY_ADMIN_TOKEN;
    else process.env.BIBLE_AUTHORITY_ADMIN_TOKEN = prev.bible;
    if (prev.alpha === undefined) delete process.env.ALPHA_ADMIN_TOKEN;
    else process.env.ALPHA_ADMIN_TOKEN = prev.alpha;
    if (prev.beta === undefined) delete process.env.BETA_REVIEW_TOKEN;
    else process.env.BETA_REVIEW_TOKEN = prev.beta;
  });

  it('1. normalizeSecret trims whitespace and newlines', () => {
    assert.equal(normalizeSecret('  abc\n'), 'abc');
    assert.equal(resolveAdminToken(), 'secret-value');
  });

  it('2. Bearer parse is case-insensitive and trims provided token', () => {
    assert.equal(
      extractProvidedToken({ headers: { authorization: 'bearer secret-value' }, query: {} }),
      'secret-value',
    );
    assert.equal(
      extractProvidedToken({ headers: { authorization: 'Bearer   secret-value  ' }, query: {} }),
      'secret-value',
    );
  });

  it('3. checkAdminAuth accepts trimmed match', () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    const ok = checkAdminAuth(
      { headers: { authorization: 'Bearer secret-value' }, query: {} },
      res,
    );
    assert.equal(ok, true);
    assert.equal(res.statusCode, null);
  });

  it('4. fingerprint is stable and non-empty when configured', () => {
    const fp = adminAuthFingerprint();
    assert.equal(typeof fp, 'string');
    assert.equal(fp.length, 12);
    assert.equal(fp, adminAuthFingerprint('secret-value'));
    assert.notEqual(fp, adminAuthFingerprint('other'));
  });
});
