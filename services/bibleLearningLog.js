/**
 * Continuous learning log — records discovery/reinforcement; does NOT override live answers.
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'data', 'bible-learning-events.jsonl');

function appendLearningEvent(event = {}) {
  const row = {
    ts: new Date().toISOString(),
    ...event,
    liveAnswerOverridden: false,
  };

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(row)}\n`);
  return row;
}

function logEvidencePackUsage({
  userId = 'anonymous',
  message = '',
  topic = null,
  evidenceCardsUsed = [],
  reinforcement = [],
  answerQuality = {},
  userCorrection = null,
  doctrineConflictDetected = false,
  suggestedCardUpdate = null,
} = {}) {
  if (suggestedCardUpdate?.autoApplied) {
    throw new Error('Learning log: suggested card updates may not be auto-applied');
  }

  return appendLearningEvent({
    userId,
    message: String(message).slice(0, 500),
    topic,
    evidenceCardsUsed: evidenceCardsUsed.map((c) => c.cardId || c.topic),
    scripturesCited: evidenceCardsUsed.flatMap((c) => [
      ...(c.primaryScriptures || c.references?.primary || []),
      ...(c.supportingScriptures || c.references?.supporting || []),
    ]),
    reinforcementSummary: reinforcement.map((r) => ({
      topic: r.topic,
      reviewRequired: r.reviewRequired,
      confidenceScore: r.confidenceScore,
      supportingCount: (r.supportingScripturesFound || []).length,
    })),
    answerQuality,
    missedScriptures: [],
    userCorrection,
    doctrineConflictDetected,
    suggestedCardUpdate: suggestedCardUpdate
      ? { ...suggestedCardUpdate, reviewRequired: true, autoApplied: false }
      : null,
  });
}

module.exports = {
  appendLearningEvent,
  logEvidencePackUsage,
  LOG_PATH,
};
