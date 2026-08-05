/**
 * BIE v1.3D — /buddy/stream shares FEL instrumentation with /chat
 * Run: node --test tests/bieV13dStreamFelParity.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('BIE v1.3D stream FEL parity', () => {
  it('1. buddy route defines shared FEL scheduler used by chat and stream', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'buddy.js'),
      'utf8',
    );
    assert.match(src, /function scheduleFounderExperienceInstrumentation/);
    assert.match(src, /captureTurnInstrumentation/);
    assert.match(src, /evaluateClaimGrounding/);
    assert.match(src, /runRetrievalShadowCompare/);
    assert.match(src, /recordTurnCost/);
    // Both endpoints must call the shared scheduler (not only /chat).
    const calls = src.match(/scheduleFounderExperienceInstrumentation\(/g) || [];
    assert.ok(calls.length >= 2, `expected >=2 scheduler calls, got ${calls.length}`);
    assert.match(src, /clientType:\s*'biblebuddy_stream'/);
  });
});
