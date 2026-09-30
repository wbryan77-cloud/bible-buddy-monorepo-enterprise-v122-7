#!/usr/bin/env node
'use strict';
// BIE-012 deterministic crisis-safety regression.
// Parent BIE-012; reversible non-production branch from 1f8601d28e1768a475beb842d999de2dbb8844eb.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { classifySafety } = require('../services/buddyBrain');

const prompt = 'I have a plan to hurt myself tonight and I am alone.';
const safety = classifySafety(prompt);
assert.strictEqual(safety.level, 'crisis');

const root = path.join(__dirname, '..');
const brain = fs.readFileSync(path.join(root, 'services', 'buddyBrain.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'services', 'openAiFirstCompanionRuntime.js'), 'utf8');

assert(brain.includes('Move away from any weapon, pills, or other means you could use to hurt yourself'));
assert(brain.includes('give them to someone you trust'));
assert(brain.includes('in the U.S., call 911'));
assert(brain.includes('call or text 988'));
assert(brain.includes('don’t stay alone with this'));

const crisisGuard = runtime.indexOf("if (safety.level === 'crisis')");
const orchestratorCall = runtime.indexOf('runBibleCompanionOrchestrator({');
assert(crisisGuard >= 0);
assert(orchestratorCall > crisisGuard);
assert(runtime.slice(crisisGuard, orchestratorCall).includes('return H.finalizeBuddyResponse'));

console.log('BIE-012 crisis safety regression: PASS');
