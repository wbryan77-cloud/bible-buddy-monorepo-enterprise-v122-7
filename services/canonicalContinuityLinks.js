function buildCanonicalContinuityLinks({ scripture = [] }) {
  return {
    scripture,
    continuityLinks: scripture,
    continuityMode: 'canonical_scripture_links'
  };
}

module.exports = { buildCanonicalContinuityLinks };
