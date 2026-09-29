'use strict';

const crypto = require('crypto');

const RAW_CAPTURE_RETENTION_DAYS = 90;
const CURRENT_LABEL_MANUFACTURER = 'CURRENT_LABEL_MANUFACTURER';
const TEMPLE_LEDGER = 'TEMPLE_LEDGER';
const ALLOWED_PROVIDERS = new Set([
  CURRENT_LABEL_MANUFACTURER,
  'USDA_FDC',
  'OPEN_FOOD_FACTS',
  'OPENFDA_ENFORCEMENT',
  'OPENFDA_CAERS',
  TEMPLE_LEDGER,
]);

function clean(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeIso(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function plusDays(iso, days) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeIdentity(input = {}) {
  return {
    upc_gtin: clean(input.upc_gtin, 64),
    product: clean(input.product, 300),
    brand: clean(input.brand, 300),
    market: clean(input.market, 120),
    formulation_fingerprint: clean(input.formulation_fingerprint, 256),
  };
}

function normalizeEvidence(item = {}) {
  return {
    source_provider: clean(item.source_provider, 80),
    retrieved_at: normalizeIso(item.retrieved_at),
    provider_version_or_update: clean(item.provider_version_or_update, 200),
    evidence_id: clean(item.evidence_id, 200),
    raw_source_ref: clean(item.raw_source_ref, 1000),
    current_formula: item.current_formula === true,
    ambiguous_animal_source: item.ambiguous_animal_source === true,
  };
}

function buildFingerprint(identity, labelText) {
  if (identity.formulation_fingerprint) return identity.formulation_fingerprint;
  if (!labelText) return '';
  return crypto.createHash('sha256').update(labelText).digest('hex');
}

function validationErrors(identity, evidence) {
  const requiredIdentity = ['upc_gtin', 'product', 'brand', 'market', 'formulation_fingerprint'];
  const errors = requiredIdentity.filter((key) => !identity[key]).map((key) => `identity.${key}`);
  if (!evidence.length) errors.push('evidence');
  evidence.forEach((item, index) => {
    if (!ALLOWED_PROVIDERS.has(item.source_provider)) errors.push(`evidence[${index}].source_provider`);
    if (!item.retrieved_at) errors.push(`evidence[${index}].retrieved_at`);
    if (!item.provider_version_or_update) errors.push(`evidence[${index}].provider_version_or_update`);
    if (!item.evidence_id) errors.push(`evidence[${index}].evidence_id`);
    if (!item.raw_source_ref) errors.push(`evidence[${index}].raw_source_ref`);
  });
  return errors;
}

function buildTempleEvidenceEnvelope(input = {}) {
  const identity = normalizeIdentity(input.identity || input);
  const labelText = clean(input.label_text, 250000);
  identity.formulation_fingerprint = buildFingerprint(identity, labelText);
  const evidence = Array.isArray(input.evidence) ? input.evidence.map(normalizeEvidence) : [];
  const errors = validationErrors(identity, evidence);

  if (errors.length) {
    return {
      ok: false,
      error: 'required_provenance_missing',
      missing_or_invalid: errors,
      approved_for_temple_adjudication: false,
      canonical_write_allowed: false,
    };
  }

  const currentManufacturer = evidence.find((item) =>
    item.source_provider === CURRENT_LABEL_MANUFACTURER && item.current_formula
  );
  const openFoodFacts = evidence.find((item) => item.source_provider === 'OPEN_FOOD_FACTS');
  const templeEvidence = evidence.find((item) => item.source_provider === TEMPLE_LEDGER);
  const caersEvidence = evidence.find((item) => item.source_provider === 'OPENFDA_CAERS');
  const ambiguousAnimal = evidence.some((item) => item.ambiguous_animal_source);
  const requestedAxes = input.three_axes || {};

  if (clean(requestedAxes.biblical_status || 'UNBOUND', 120) !== 'UNBOUND' && !templeEvidence) {
    return {
      ok: false,
      error: 'temple_ledger_required_for_biblical_status',
      approved_for_temple_adjudication: false,
      canonical_write_allowed: false,
    };
  }

  if (caersEvidence && input.health_causal_claim === true) {
    return {
      ok: false,
      error: 'caers_cannot_support_causal_health_claim',
      approved_for_temple_adjudication: false,
      canonical_write_allowed: false,
    };
  }

  let biblicalStatus = clean(requestedAxes.biblical_status || 'UNBOUND', 120);
  const manufacturerVerificationState = ambiguousAnimal && !currentManufacturer
    ? 'REQUIRED'
    : currentManufacturer
      ? 'VERIFIED_CURRENT_FORMULA'
      : 'NOT_REQUIRED_BY_INPUT';
  if (manufacturerVerificationState === 'REQUIRED') {
    biblicalStatus = 'SOURCE_DEPENDENT__INVESTIGATE';
  }

  const primaryRetrievedAt = (currentManufacturer || evidence[0]).retrieved_at;
  const retentionExpiresAt = plusDays(primaryRetrievedAt, RAW_CAPTURE_RETENTION_DAYS);
  const conflicts = [];
  if (currentManufacturer && openFoodFacts) {
    conflicts.push('CURRENT_LABEL_WINS__REVERIFY_CACHE');
  }

  return {
    ok: true,
    architecture: {
      new_database: false,
      new_vendor: false,
      paid_api: false,
      canonical_output: 'existing Temple ledger/BIE governed layer',
    },
    identity,
    provenance: {
      source_provider: evidence.map((item) => item.source_provider),
      retrieved_at: evidence.map((item) => item.retrieved_at),
      provider_version_or_update: evidence.map((item) => item.provider_version_or_update),
      evidence_ids: evidence.map((item) => item.evidence_id),
      raw_source_refs: evidence.map((item) => item.raw_source_ref),
      reverify_after: clean(input.reverify_after, 120) || retentionExpiresAt,
    },
    three_axes: {
      biblical_status: biblicalStatus,
      processing_quality: clean(requestedAxes.processing_quality || 'UNASSESSED', 120),
      health_evidence: clean(requestedAxes.health_evidence || 'UNASSESSED', 120),
    },
    uncertainty: {
      manufacturer_verification_state: manufacturerVerificationState,
      unknowns: Array.isArray(input.unknowns) ? input.unknowns.map((v) => clean(v, 500)).filter(Boolean) : [],
      conflicts,
    },
    context: {
      recall: evidence.some((item) => item.source_provider === 'OPENFDA_ENFORCEMENT')
        ? 'DATED_RECALL_CONTEXT_ONLY'
        : 'NONE',
      caers: caersEvidence ? 'CONTEXT_ONLY__NO_CAUSAL_CLAIM' : 'NONE',
    },
    retention: {
      raw_capture_retention_days: RAW_CAPTURE_RETENTION_DAYS,
      retention_expires_at: retentionExpiresAt,
      rule: 'RAW_BARCODE_OCR_CAPTURE_MAX_90_DAYS_UNLESS_SEPARATE_GOVERNED_HOLD',
    },
    source_policy: {
      current_formula_authority: CURRENT_LABEL_MANUFACTURER,
      open_food_facts_role: 'NONCANONICAL_BARCODE_LABEL_FALLBACK',
      caers_role: 'CONTEXT_ONLY_NO_CAUSAL_INFERENCE',
      recall_role: 'DATED_CONTEXT_ONLY',
      temple_rule_authority: TEMPLE_LEDGER,
    },
    approved_for_temple_adjudication: manufacturerVerificationState !== 'REQUIRED',
    canonical_write_allowed: false,
    human_review_required: true,
  };
}

module.exports = {
  RAW_CAPTURE_RETENTION_DAYS,
  buildTempleEvidenceEnvelope,
};
