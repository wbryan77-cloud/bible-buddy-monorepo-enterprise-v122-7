'use strict';

const { buildResourceIngestionReview } = require('./resourceIngestionReview');

function clean(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeMetadata(input = {}) {
  return {
    title: clean(input.title, 500),
    author_or_speaker: clean(input.author_or_speaker, 500),
    summary: clean(input.summary),
    language: clean(input.language, 80),
    category: clean(input.category, 160),
    resource_type: clean(input.resource_type, 160),
    source_links: Array.isArray(input.source_links)
      ? input.source_links.map((v) => clean(v, 2000)).filter(Boolean).slice(0, 20)
      : [],
    usage_notes: clean(input.usage_notes),
  };
}

function validateMetadata(metadata) {
  const review = buildResourceIngestionReview();
  const missing = review.requiredMetadata.filter((key) => !metadata[key]);
  return { ok: missing.length === 0, missing, review };
}

async function extractPdf(buffer, parser) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error('PDF buffer is required');
    error.code = 'INVALID_PDF_INPUT';
    throw error;
  }
  const parse = parser || require('pdf-parse');
  const result = await parse(buffer);
  return clean(result && result.text, 250000);
}

async function buildExtractionReviewCandidate(input = {}, options = {}) {
  const metadata = normalizeMetadata(input.metadata || input);
  const validation = validateMetadata(metadata);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'required_metadata_missing',
      missing: validation.missing,
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
    };
  }

  let extractedText = '';
  let extractionMethod = null;
  const type = metadata.resource_type;

  try {
    if (type === 'pdf_documents' || type === 'scanned_documents') {
      extractedText = await extractPdf(input.buffer, options.pdfParser);
      extractionMethod = options.pdfParser ? 'pdf_parser_injected' : 'pdf-parse';
    } else if (type === 'audio_transcripts' || type === 'sermon_notes' || type === 'study_notes' || type === 'lesson_materials') {
      extractedText = clean(input.transcript || input.text, 250000);
      extractionMethod = 'provided_text_or_transcript';
    } else {
      return {
        ok: false,
        error: 'unsupported_extraction_type',
        resource_type: type,
        human_review_required: true,
        approved_for_knowledge_ingestion: false,
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: 'extraction_failed',
      detail: clean(error && error.message, 500),
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
    };
  }

  if (!extractedText) {
    return {
      ok: false,
      error: 'empty_extraction',
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
    };
  }

  return {
    ok: true,
    candidate: {
      metadata,
      extracted_text: extractedText,
      extraction_method: extractionMethod,
      status: 'pending_human_review',
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
    },
    ingestion: {
      allowed: false,
      reason: 'Human approval required before knowledge ingestion',
    },
  };
}

module.exports = {
  normalizeMetadata,
  validateMetadata,
  extractPdf,
  buildExtractionReviewCandidate,
};
