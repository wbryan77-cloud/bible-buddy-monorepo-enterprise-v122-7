function buildDoctrineSourceProvenance({ scriptures = [], historySources = [] }) {
  return {
    scriptures,
    historySources,
    generatedAt: new Date().toISOString(),
    provenanceMode: 'scripture_first',
  };
}

module.exports = {
  buildDoctrineSourceProvenance,
};