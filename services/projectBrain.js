const fs = require('fs');
const path = require('path');

function readJson(name, fallback) {
  const file = path.join(__dirname, '..', 'project-brain', name);
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    console.error('Error reading project-brain file', name, e.message);
    return fallback || [];
  }
}

function getSnapshot() {
  const modules = readJson('modules.json', []);
  const phases = readJson('phases.json', []);
  const competitors = readJson('competitors.json', []);
  const avatars = readJson('avatars.json', []);
  const providers = readJson('providers.json', []);
  return { modules, phases, competitors, avatars, providers };
}

module.exports = { getSnapshot };
