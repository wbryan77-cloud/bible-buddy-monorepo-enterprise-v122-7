/**
 * Support graph candidate queue — admin-review only precept proposals.
 * Never auto-promotes; never alters final answers or approved doctrine.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_PATH = path.join(__dirname, '..', 'data', 'support-graph-candidates.jsonl');

function ensureQueueDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {object} candidate
 * @returns {object} queued record
 */
function enqueueSupportGraphCandidate(candidate = {}) {
  ensureQueueDir();

  const record = {
    id: candidate.id || `sgc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    topic: candidate.topic || null,
    proposedClaim: String(candidate.proposedClaim || candidate.claim || '').trim(),
    scriptures: candidate.scriptures || [],
    scriptureOrder: candidate.scriptureOrder || candidate.scriptures || [],
    relationshipType: candidate.relationshipType || 'unknown',
    reason: String(candidate.reason || '').trim(),
    confidence: candidate.confidence || 'low',
    source: candidate.source || 'support_relationship_engine',
    reviewRequired: true,
    autoApplied: false,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };

  fs.appendFileSync(QUEUE_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

function readSupportGraphCandidates({ limit = 100, status = null } = {}) {
  if (!fs.existsSync(QUEUE_PATH)) return [];

  const lines = fs.readFileSync(QUEUE_PATH, 'utf8').trim().split('\n').filter(Boolean);
  let records = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  if (status) records = records.filter((r) => r.status === status);
  return records.slice(-limit);
}

/**
 * Propose a candidate when support cannot be verified — research only.
 * Does NOT change doctrine or answers.
 */
function proposeCandidateFromUnverifiedClaim({
  claim = '',
  supportingScriptures = [],
  topic = null,
  reason = '',
  source = 'support_relationship_engine',
} = {}) {
  if (!claim || !supportingScriptures.length) return null;

  return enqueueSupportGraphCandidate({
    topic,
    proposedClaim: claim,
    scriptures: supportingScriptures,
    scriptureOrder: supportingScriptures,
    relationshipType: 'unverified_support',
    reason: reason || 'Claim cites Scripture but no approved support edge exists yet.',
    confidence: 'low',
    source,
  });
}

module.exports = {
  QUEUE_PATH,
  enqueueSupportGraphCandidate,
  readSupportGraphCandidates,
  proposeCandidateFromUnverifiedClaim,
};
