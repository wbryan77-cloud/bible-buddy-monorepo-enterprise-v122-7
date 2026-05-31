const INTERNAL_LINE_PATTERNS = [
  /^Source-grounded answer:\s*$/gim,
  /^Validation:\s*$/gim,
  /^Continuity generated:\s*$/gim,
  /^Runtime metadata:\s*$/gim,
  /^Internal study continuity[^:\n]*:\s*$/gim,
  /^Continuity Study Path\s*$/gim,
];

const INTERNAL_BODY_PATTERNS = [
  /^The app should not[^\n]*$/gim,
  /^If history is discussed[^\n]*$/gim,
  /^Later holidays should not be presented[^\n]*$/gim,
  /^Therefore Acts 10 should not be presented[^\n]*$/gim,
  /^Historical origins may be discussed[^\n]*$/gim,
  /^This chronology is presented as a Scripture-first reading[^\n]*$/gim,
];

function stripInternalRuntimeLabels(text = '') {
  let cleaned = String(text || '');

  for (const pattern of INTERNAL_LINE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  for (const pattern of INTERNAL_BODY_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned
    .replace(/^Line upon line:\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

function containsInternalRuntimeLabels(text = '') {
  const lower = String(text || '').toLowerCase();
  return (
    /source-grounded answer:/i.test(text) ||
    /the app should not/i.test(text) ||
    /validation:/i.test(text) ||
    /continuity generated:/i.test(text) ||
    lower.includes('slow this down together')
  );
}

module.exports = {
  stripInternalRuntimeLabels,
  containsInternalRuntimeLabels,
  INTERNAL_LINE_PATTERNS,
  INTERNAL_BODY_PATTERNS,
};
