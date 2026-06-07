/**
 * Cap evidence payload size sent to OpenAI — memory stability.
 */

const MAX_MEMORY_SNIPPETS = 3;
const MAX_MEMORY_HITS = 3;
const MAX_HISTORY_TURNS = 4;
const MAX_ASSISTANT_PREVIEW = 180;
const MAX_DISCOVERY_REINFORCEMENT = 4;

function slimMemorySlice(memory = {}) {
  if (!memory || typeof memory !== 'object') return memory;
  const out = { ...memory };
  if (Array.isArray(out.snippets)) out.snippets = out.snippets.slice(0, MAX_MEMORY_SNIPPETS);
  if (Array.isArray(out.hits)) out.hits = out.hits.slice(0, MAX_MEMORY_HITS);
  if (Array.isArray(out.relationshipMemories)) {
    out.relationshipMemories = out.relationshipMemories.slice(0, MAX_MEMORY_SNIPPETS);
  }
  return out;
}

function slimConversationHistory(history = []) {
  return (history || []).slice(-MAX_HISTORY_TURNS).map((t) => ({
    ...t,
    assistant: String(t.assistant || '').slice(0, MAX_ASSISTANT_PREVIEW),
  }));
}

function slimEvidencePackForComposer(evidencePack = {}) {
  return {
    understanding: evidencePack.understanding,
    topic: evidencePack.topic,
    bibleOnlyMode: evidencePack.bibleOnlyMode,
    evidenceAuthority: evidencePack.evidenceAuthority,
    approvedCatalogEvidence: evidencePack.approvedCatalogEvidence,
    threadLocal: evidencePack.threadLocal,
    correctionLedger: evidencePack.correctionLedger,
    memory: slimMemorySlice(evidencePack.memory),
    scripture: evidencePack.scripture,
    history: evidencePack.history,
    doctrine: evidencePack.doctrine,
    evidenceCards: evidencePack.evidenceCards,
    discoveryReinforcement: (evidencePack.discoveryReinforcement || []).slice(0, MAX_DISCOVERY_REINFORCEMENT),
    answerGuidance: evidencePack.answerGuidance,
    currentIntent: evidencePack.currentIntent,
    intentComposerGuidance: evidencePack.intentComposerGuidance,
    historyAllowed: evidencePack.historyAllowed,
  };
}

module.exports = {
  slimEvidencePackForComposer,
  slimMemorySlice,
  slimConversationHistory,
  MAX_MEMORY_SNIPPETS,
};
