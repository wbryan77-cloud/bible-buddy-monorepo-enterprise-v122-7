/**
 * BIE v1.1A — Governed relationship projection (no new graph DB).
 * Projects Topic/Support/Study/Lesson/learning links with provenance.
 * Unapproved edges remain SHADOW / review candidates — never doctrine.
 */

const crypto = require('crypto');
const { listLearningRecords } = require('./learningRecordStore');
const { runDiscoveryPass } = require('./discoveryEngine');
const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');

const RELATION_TYPES = Object.freeze([
  'SUPPORTS',
  'EXPLAINS',
  'CONTRASTS_WITH',
  'FOLLOWS',
  'PRECEDES',
  'FAILED_ON',
  'SUCCEEDED_ON',
  'CORRECTED_BY',
  'RETRIEVED_WITH',
  'NOT_RETRIEVED_WITH',
  'EVALUATED_BY',
  'AFFECTED_BY_RELEASE',
  'REQUIRES_REVIEW',
  'MISUNDERSTOOD_AS',
  'CONFLICTS_WITH',
]);

function edgeId(source, target, relationType) {
  return crypto
    .createHash('sha256')
    .update(`${source}|${target}|${relationType}`)
    .digest('hex')
    .slice(0, 24);
}

function buildRelationshipProjection({ persist = true } = {}) {
  const edges = [];
  const discoveries = runDiscoveryPass({ persist: false }).discoveries || [];
  const learning = listLearningRecords({ limit: 200 });

  for (const d of discoveries) {
    const source = `behavior:${d.behaviorFamily}`;
    const target = `discovery:${d.discoveryType}`;
    edges.push({
      edgeId: edgeId(source, target, d.discoveryType.includes('SUCCESS') ? 'SUCCEEDED_ON' : 'FAILED_ON'),
      sourceNode: source,
      targetNode: target,
      relationType: d.discoveryType.includes('SUCCESS') ? 'SUCCEEDED_ON' : 'FAILED_ON',
      direction: 'directed',
      provenance: 'discoveryEngine',
      confidence: d.confidence,
      governanceStatus: 'SHADOW',
      createdBy: 'relationshipProjection',
      approvedBy: null,
      firstSeen: d.firstSeen,
      lastValidated: d.lastSeen,
      supportingEvidence: (d.supportingEventIds || []).slice(0, 10),
      contradictoryEvidence: d.counterexamples || [],
      active: true,
      version: 'bie-relationship-v1',
      doctrinalAuthority: false,
    });
    if (d.recommendationEligibility) {
      edges.push({
        edgeId: edgeId(source, 'admin:decision_queue', 'REQUIRES_REVIEW'),
        sourceNode: source,
        targetNode: 'admin:decision_queue',
        relationType: 'REQUIRES_REVIEW',
        direction: 'directed',
        provenance: 'discoveryEngine',
        confidence: d.confidence,
        governanceStatus: 'SHADOW',
        createdBy: 'relationshipProjection',
        approvedBy: null,
        firstSeen: d.firstSeen,
        lastValidated: d.lastSeen,
        supportingEvidence: [d.discoveryId],
        contradictoryEvidence: [],
        active: true,
        version: 'bie-relationship-v1',
        doctrinalAuthority: false,
      });
    }
  }

  for (const lr of learning) {
    if (!lr.affectedOwner) continue;
    edges.push({
      edgeId: edgeId(`learning:${lr.learningRecordId}`, `owner:${lr.affectedOwner}`, 'CORRECTED_BY'),
      sourceNode: `learning:${lr.learningRecordId}`,
      targetNode: `owner:${lr.affectedOwner}`,
      relationType: 'CORRECTED_BY',
      direction: 'directed',
      provenance: 'learningRecordStore',
      confidence: lr.confidence || 'medium',
      governanceStatus: lr.adminStatus === 'APPROVED' ? 'APPROVED' : 'SHADOW',
      createdBy: 'relationshipProjection',
      approvedBy: lr.adminStatus === 'APPROVED' ? 'admin' : null,
      firstSeen: lr.createdAt,
      lastValidated: lr.updatedAt || lr.createdAt,
      supportingEvidence: lr.sourceEventIds || [],
      contradictoryEvidence: [],
      active: true,
      version: 'bie-relationship-v1',
      doctrinalAuthority: false,
    });
  }

  // Deterministic Study Chain / Lesson institutional links (projection only)
  edges.push({
    edgeId: edgeId('system:study_chain', 'system:verified_lesson_packet', 'SUPPORTS'),
    sourceNode: 'system:study_chain',
    targetNode: 'system:verified_lesson_packet',
    relationType: 'SUPPORTS',
    direction: 'directed',
    provenance: 'architecture',
    confidence: 'high',
    governanceStatus: 'APPROVED',
    createdBy: 'relationshipProjection',
    approvedBy: 'system',
    firstSeen: new Date().toISOString(),
    lastValidated: new Date().toISOString(),
    supportingEvidence: ['lessonEngine', 'studyChainEvaluation'],
    contradictoryEvidence: [],
    active: true,
    version: 'bie-relationship-v1',
    doctrinalAuthority: false,
  });

  if (persist) {
    for (const e of edges) {
      upsertById(DOC.relationships, 'edgeId', e, MAX.relationships).catch(() => {});
    }
  }

  return {
    ok: true,
    mode: 'SHADOW',
    edgeCount: edges.length,
    unapprovedCount: edges.filter((e) => e.governanceStatus === 'SHADOW').length,
    doctrinalAuthorityEdges: 0,
    edges,
  };
}

module.exports = {
  RELATION_TYPES,
  buildRelationshipProjection,
  edgeId,
};
