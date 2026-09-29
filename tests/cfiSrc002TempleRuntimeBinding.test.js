'use strict';

const assert = require('assert');
const { buildTempleEvidenceEnvelope, RAW_CAPTURE_RETENTION_DAYS } = require('../services/templeCheckEvidenceAdapter');
const { buildFoodLabelOcrReviewCandidate } = require('../services/ocrTranscriptPipeline');

const identity = { upc_gtin:'012345678905', product:'Example Food', brand:'Example', market:'US' };
const evidence = (provider, extras = {}) => ({
  source_provider: provider,
  retrieved_at: '2026-09-28T18:30:00-07:00',
  provider_version_or_update: '2026-09-28',
  evidence_id: `${provider}-1`,
  raw_source_ref: `internal://${provider.toLowerCase()}/1`,
  ...extras,
});
const temple = evidence('TEMPLE_LEDGER');
const manufacturer = evidence('CURRENT_LABEL_MANUFACTURER', { current_formula:true });

let checks = 0;
function eq(a,b,msg){ assert.deepStrictEqual(a,b,msg); checks += 1; }
function ok(v,msg){ assert.ok(v,msg); checks += 1; }

let r = buildTempleEvidenceEnvelope({ identity, label_text:'wheat, salt', evidence:[manufacturer,evidence('USDA_FDC'),temple], three_axes:{biblical_status:'CLEAN',processing_quality:'HIGHLY_PROCESSED',health_evidence:'MIXED'} });
eq(r.ok,true); eq(r.three_axes.biblical_status,'CLEAN'); eq(r.three_axes.processing_quality,'HIGHLY_PROCESSED'); eq(r.three_axes.health_evidence,'MIXED');

r = buildTempleEvidenceEnvelope({ identity, label_text:'gelatin', evidence:[evidence('OPEN_FOOD_FACTS',{ambiguous_animal_source:true}),temple], three_axes:{biblical_status:'CLEAN'} });
eq(r.ok,true); eq(r.three_axes.biblical_status,'SOURCE_DEPENDENT__INVESTIGATE'); eq(r.uncertainty.manufacturer_verification_state,'REQUIRED'); eq(r.approved_for_temple_adjudication,false);

r = buildTempleEvidenceEnvelope({ identity, label_text:'current formula', evidence:[manufacturer,evidence('OPEN_FOOD_FACTS'),temple] });
ok(r.uncertainty.conflicts.includes('CURRENT_LABEL_WINS__REVERIFY_CACHE'));

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer,evidence('OPENFDA_CAERS'),temple] });
eq(r.context.caers,'CONTEXT_ONLY__NO_CAUSAL_CLAIM');
r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer,evidence('OPENFDA_CAERS'),temple], health_causal_claim:true });
eq(r.ok,false); eq(r.error,'caers_cannot_support_causal_health_claim');

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer,evidence('OPENFDA_ENFORCEMENT'),temple] });
eq(r.context.recall,'DATED_RECALL_CONTEXT_ONLY');

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[{source_provider:'USDA_FDC'}] });
eq(r.ok,false); eq(r.error,'required_provenance_missing'); ok(r.missing_or_invalid.length >= 4);

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer,temple], three_axes:{biblical_status:'CLEAN',processing_quality:'HIGHLY_PROCESSED',health_evidence:'UNASSESSED'} });
eq(r.three_axes.biblical_status,'CLEAN'); eq(r.three_axes.processing_quality,'HIGHLY_PROCESSED');

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer], three_axes:{biblical_status:'CLEAN'} });
eq(r.ok,false); eq(r.error,'temple_ledger_required_for_biblical_status');

r = buildTempleEvidenceEnvelope({ identity, label_text:'x', evidence:[manufacturer,temple] });
eq(RAW_CAPTURE_RETENTION_DAYS,90); eq(r.retention.raw_capture_retention_days,90); eq(r.retention.retention_expires_at,'2026-12-28T01:30:00.000Z'); ok(r.retention.rule.includes('90_DAYS'));

eq(r.architecture.new_database,false); eq(r.architecture.new_vendor,false); eq(r.architecture.paid_api,false); eq(r.canonical_write_allowed,false); eq(r.human_review_required,true);

const ocrReview = buildFoodLabelOcrReviewCandidate({ identity, ocr_text:'Ingredients: wheat, salt', evidence:[manufacturer,temple], three_axes:{biblical_status:'CLEAN'} });
eq(ocrReview.ok,true); eq(ocrReview.candidate.status,'pending_human_review'); eq(ocrReview.candidate.approved_for_temple_adjudication,false); eq(ocrReview.candidate.canonical_write_allowed,false); eq(ocrReview.ingestion.allowed,false); eq(ocrReview.candidate.temple_evidence.identity.upc_gtin,identity.upc_gtin);

const empty = buildFoodLabelOcrReviewCandidate({ identity, ocr_text:'   ', evidence:[manufacturer,temple] });
eq(empty.ok,false); eq(empty.error,'empty_label_ocr');

console.log(JSON.stringify({ok:true,test:'CFI-SRC-002 Temple runtime binding',assertions:checks,retention_days:RAW_CAPTURE_RETENTION_DAYS,canonical_write_allowed:false,human_review_required:true}));
