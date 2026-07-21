/**
 * Heuristic conversation-shape breakdown (audit / experiment only).
 * Percentages are approximate and sum to ~100 per reply.
 */

function splitSentences(text = '') {
  return String(text)
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function classifySentence(sentence = '') {
  const s = sentence.trim();
  const lower = s.toLowerCase();

  if (/\?\s*$/.test(s)) {
    if (/would you like|if you('d| would) like|shall we pray|can i help you with a (simple )?prayer/i.test(s)) {
      return 'engaging';
    }
    return 'asking';
  }

  if (
    /^(it sounds like|i hear you|i understand you|i'm sorry|i am sorry|grieving|that must|that can feel|it's completely natural|it's deeply painful|you're facing|you're at an important)/i.test(
      s
    )
  ) {
    return 'reflecting';
  }

  if (
    /\b(you might|consider|it can help|taking time|try |rest your|apply|consult|healthcare|write down|pause briefly|gentle next step|practical)\b/i.test(
      lower
    )
  ) {
    return 'advising';
  }

  if (
    /\b(proverbs|james|psalm|exodus|isaiah|matthew|scripture|the bible|reminds us|encourages us|historically|constantine|laodicea|sabbath|resurrection|worship)\b/i.test(
      lower
    ) ||
    /\b(means that|does not necessarily|in these moments|through difficult seasons)\b/i.test(lower)
  ) {
    return 'explaining';
  }

  if (
    /\b(to be clear|when i use|my intention|i use the term|i often use|i appreciate your|fair point|you're right)\b/i.test(
      lower
    )
  ) {
    return 'answering';
  }

  if (/\b(feeling distant|does not mean|not necessarily mean|your faith|your mom|your friend|job offer|push or wait|roman catholic|wording)\b/i.test(lower)) {
    return 'answering';
  }

  if (/\b(heavy|painful|uncertain|crossroads|separation|disconnected|bothering)\b/i.test(lower)) {
    return 'reflecting';
  }

  return 'answering';
}

function analyzeConversationShape(reply = '') {
  const sentences = splitSentences(reply);
  const counts = { answering: 0, advising: 0, explaining: 0, asking: 0, reflecting: 0, engaging: 0 };

  if (sentences.length === 0) {
    return {
      answering: 0,
      advising: 0,
      explaining: 0,
      asking: 0,
      reflecting: 0,
      engaging: 0,
      sentenceCount: 0,
      hasExploratoryQuestion: false,
      hasTransactionalClose: false,
    };
  }

  for (const sentence of sentences) {
    const bucket = classifySentence(sentence);
    counts[bucket] += 1;
  }

  const total = sentences.length;
  const pct = {};
  for (const [k, v] of Object.entries(counts)) {
    pct[k] = Math.round((v / total) * 1000) / 10;
  }

  const exploratory = sentences.filter(
    (s) =>
      /\?\s*$/.test(s) &&
      !/would you like|if you('d| would) like|shall we pray|help you with a prayer|share some scripture/i.test(s)
  );

  return {
    ...pct,
    sentenceCount: total,
    hasExploratoryQuestion: exploratory.length > 0,
    exploratoryQuestionCount: exploratory.length,
    hasTransactionalClose: /would you like|if you('d| would) like.*prayer|pray together/i.test(reply),
    deliverModePct: Math.round((pct.answering + pct.advising + pct.explaining) * 10) / 10,
    companionModePct: Math.round((pct.asking + pct.reflecting + (pct.engaging || 0)) * 10) / 10,
  };
}

function aggregateShape(turns, replyKey = 'reply') {
  const keys = ['answering', 'advising', 'explaining', 'asking', 'reflecting', 'engaging'];
  const sum = Object.fromEntries(keys.map((k) => [k, 0]));
  let exploratoryTurns = 0;
  let transactionalCloseTurns = 0;

  for (const t of turns) {
    const shape = t.shape || analyzeConversationShape(t[replyKey] || '');
    for (const k of keys) sum[k] += shape[k] || 0;
    if (shape.hasExploratoryQuestion) exploratoryTurns += 1;
    if (shape.hasTransactionalClose) transactionalCloseTurns += 1;
  }

  const n = turns.length || 1;
  const avg = Object.fromEntries(keys.map((k) => [k, Math.round((sum[k] / n) * 10) / 10]));
  return {
    ...avg,
    deliverModePct: Math.round((avg.answering + avg.advising + avg.explaining) * 10) / 10,
    companionModePct: Math.round((avg.asking + avg.reflecting + avg.engaging) * 10) / 10,
    exploratoryQuestionTurns: exploratoryTurns,
    transactionalCloseTurns: transactionalCloseTurns,
  };
}

module.exports = {
  analyzeConversationShape,
  aggregateShape,
  splitSentences,
};
