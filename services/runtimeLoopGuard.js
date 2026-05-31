const BLOCKED_PHRASES = [
  "let's slow this down together",
  'lets slow this down together',
  'one simple next step',
  'name what is weighing on you most',
];

function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

function suppressLoopLanguage(reply = '') {
  let output = String(reply || '');
  BLOCKED_PHRASES.forEach((phrase) => {
    output = output.replace(new RegExp(phrase, 'ig'), '');
  });

  return output
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function hasGenericLoop(reply = '') {
  const lower = normalize(reply);
  return BLOCKED_PHRASES.some((phrase) => lower.includes(phrase));
}

module.exports = {
  suppressLoopLanguage,
  hasGenericLoop,
};
