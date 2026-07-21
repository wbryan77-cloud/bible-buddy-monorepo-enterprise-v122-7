/**
 * Conversation-behavior rules for companion experiment (test-only).
 * No retrieval, memory, or doctrine changes.
 */

const EXPLORE_SYSTEM_RULES = `
CONVERSATION BEHAVIOR (experiment — companion pacing):

Before giving advice or a long explanation, when the user shares uncertainty, emotional weight,
discernment, grief, health struggle, caregiving, relationship pain, or spiritual dryness:

- You MAY include ONE genuine exploratory question in your reply (not required).
- The question should use specific thread details from conversationHistory or userMessage.
- Do not stack multiple questions. Do not use a question as a substitute for answering when they asked a direct question.
- After a sincere question, keep the rest of the reply shorter than a full sermon — brief reflection is enough unless they asked for teaching.

Do NOT include an exploratory question when:
- They asked for a direct factual or historical answer (doctrine/history "why" questions).
- They are correcting your wording or saying you are not listening — answer directly first in plain language.
- A single clear answer is obviously what they need.

Do not force empathy openers ("It sounds like") on every turn.
Do not end every turn with "Would you like to pray" unless they invited spiritual practice.

Examples of good exploratory questions (adapt to their words):
- Job/discernment: "Is the biggest weight the distance itself, or whether you're trying to discern God's timing?"
- Alzheimer's/caregiver: "Has something changed recently that made this feel heavier than before?"
- Distant from God: "When you say distant, do you mean you're praying less, or that prayer feels empty even when you show up?"
`.trim();

const DIRECT_SYSTEM_RULES = `
CONVERSATION BEHAVIOR (experiment — direct mode):

The user needs a direct answer. Lead with the answer in plain language.
Keep the reply focused; avoid a long advice checklist unless they asked for steps.
On correction/meta turns: state what you will do differently (e.g. use their preferred term) without re-explaining unrelated history.
`.trim();

function isDirectFactualOrMetaRequest(message = '', evidencePack = {}) {
  const understanding = evidencePack.understanding || {};
  const msg = String(message).trim();

  if (understanding.strictAnswerMode || understanding.isCorrection || understanding.isFrustrated) {
    return true;
  }

  if (evidencePack.history?.included && !evidencePack.companionThreadContext?.companionTopic) {
    return true;
  }

  if (
    /^why should we keep sunday/i.test(msg) ||
    /^why do you call it/i.test(msg) ||
    /^why are you using the term/i.test(msg) ||
    /^why are you not answering/i.test(msg) ||
    /not asking about the shift|not asking about history|are you not listening/i.test(msg)
  ) {
    return true;
  }

  if (/^why |^how did |^when did |^what year /i.test(msg) && !/my mom|my faith|my job|i feel/i.test(msg)) {
    return true;
  }

  return false;
}

function isCompanionExploreContext(message = '', evidencePack = {}) {
  if (isDirectFactualOrMetaRequest(message, evidencePack)) return false;

  const topic = evidencePack.companionThreadContext?.companionTopic;
  const exploreTopics = new Set(['grief', 'discernment', 'caregiver', 'health', 'distant_from_god', 'prayer']);
  if (topic && exploreTopics.has(topic)) return true;

  const ctx = evidencePack.companionContext || {};
  if (ctx.grief || ctx.discernment || ctx.health || ctx.prayer) return true;

  const msg = String(message).toLowerCase();
  if (
    /\bnot sure\b|uncertain|whether to push|whether to wait|feel distant|feels empty|faith is failing|lost a friend|still bothering|knee|hurting again|alzheimer|doesn't remember|grieving who she used to be|job opportunity|far away from home\b/i.test(
      msg
    )
  ) {
    return true;
  }

  if (/\bi have a job\b/i.test(msg) && !/\?/.test(msg)) return true;

  return false;
}

function shouldAllowExploratoryQuestion({ message, evidencePack }) {
  return isCompanionExploreContext(message, evidencePack);
}

function buildTopicExamples(topic, message = '') {
  const msg = String(message).toLowerCase();
  if (topic === 'discernment' || /\bjob|offer|far away|push or wait\b/i.test(msg)) {
    return [
      'Job: "You mentioned the opportunity is far from home — is the biggest concern the distance itself, or discerning God\'s timing on the offer?"',
    ];
  }
  if (topic === 'caregiver' || /alzheimer|mom|remember who/i.test(msg)) {
    return [
      'Alzheimer\'s: "Has something changed recently that made this feel heavier than before?"',
    ];
  }
  if (topic === 'distant_from_god' || /distant|empty|faith is failing/i.test(msg)) {
    return [
      'Distant from God: "When you say distant, do you mean you\'re praying less, or that prayer feels empty even when you pray?"',
    ];
  }
  if (topic === 'grief' || /lost a friend|bothering me/i.test(msg)) {
    return ['Grief: "What part of this week has been hardest since Wednesday?"'];
  }
  if (topic === 'health' || /knee|hurt/i.test(msg)) {
    return ['Health: "Is it the pain itself today, or the frustration of it coming back again?"'];
  }
  return [];
}

function buildConversationBehaviorPayload({ message, evidencePack }) {
  const allow = shouldAllowExploratoryQuestion({ message, evidencePack });
  const topic = evidencePack.companionThreadContext?.companionTopic || null;
  const examples = allow ? buildTopicExamples(topic, message) : [];

  return {
    allowExploratoryQuestion: allow,
    systemRules: allow ? EXPLORE_SYSTEM_RULES : DIRECT_SYSTEM_RULES,
    payload: {
      mode: allow ? 'explore_before_advise' : 'direct_answer',
      maxExploratoryQuestions: allow ? 1 : 0,
      allowExploratoryQuestion: allow,
      topic,
      exampleQuestions: examples,
      note: allow
        ? 'Include at most one exploratory question when it genuinely helps; otherwise respond without forcing a question.'
        : 'Answer directly; no exploratory question on this turn.',
    },
  };
}

module.exports = {
  shouldAllowExploratoryQuestion,
  isCompanionExploreContext,
  isDirectFactualOrMetaRequest,
  buildConversationBehaviorPayload,
  EXPLORE_SYSTEM_RULES,
  DIRECT_SYSTEM_RULES,
};
