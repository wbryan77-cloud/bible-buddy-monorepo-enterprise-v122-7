function buildWorshipContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  return {
    sessionId,
    category,
    question,
    totalDays,
    completionKey,
    prophecyKey,
    verses: Array.isArray(verses) ? verses : [],
    references: Array.isArray(references) ? references : [],
    worshipStructures: [
      'corporate-worship-continuity',
      'personal-devotion-rhythms',
      'sabbath-and-rest-alignment',
      'thanksgiving-and-praise-practice'
    ],
    worshipObjective:
      'Guide Genesis to Revelation worship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildWorshipContinuity
};
