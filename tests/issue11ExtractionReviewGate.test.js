'use strict';

const assert = require('assert');
const { buildExtractionReviewCandidate } = require('../services/ocrTranscriptPipeline');

const metadata = {
  title: 'Issue 11 extraction candidate',
  author_or_speaker: 'Test Author',
  summary: 'Non-production extraction test.',
  language: 'en',
  category: 'testing',
  resource_type: 'pdf_documents',
  source_links: ['https://example.invalid/issue11'],
  usage_notes: 'Testing only.',
};

async function run() {
  const missing = await buildExtractionReviewCandidate({ metadata: { title: 'Incomplete' }, buffer: Buffer.from('x') }, {
    pdfParser: async () => ({ text: 'should not run' }),
  });
  assert.strictEqual(missing.ok, false);
  assert.strictEqual(missing.error, 'required_metadata_missing');
  assert.strictEqual(missing.approved_for_knowledge_ingestion, false);

  const unsupported = await buildExtractionReviewCandidate({
    metadata: { ...metadata, resource_type: 'images_of_notes' },
    text: 'image text',
  });
  assert.strictEqual(unsupported.ok, false);
  assert.strictEqual(unsupported.error, 'unsupported_extraction_type');
  assert.strictEqual(unsupported.approved_for_knowledge_ingestion, false);

  const failed = await buildExtractionReviewCandidate({ metadata, buffer: Buffer.from('fake-pdf') }, {
    pdfParser: async () => { throw new Error('parser unavailable'); },
  });
  assert.strictEqual(failed.ok, false);
  assert.strictEqual(failed.error, 'extraction_failed');
  assert.strictEqual(failed.approved_for_knowledge_ingestion, false);

  const empty = await buildExtractionReviewCandidate({ metadata, buffer: Buffer.from('fake-pdf') }, {
    pdfParser: async () => ({ text: '   ' }),
  });
  assert.strictEqual(empty.ok, false);
  assert.strictEqual(empty.error, 'empty_extraction');
  assert.strictEqual(empty.approved_for_knowledge_ingestion, false);

  const pdf = await buildExtractionReviewCandidate({ metadata, buffer: Buffer.from('fake-pdf') }, {
    pdfParser: async () => ({ text: 'Extracted text requiring human review.' }),
  });
  assert.strictEqual(pdf.ok, true);
  assert.strictEqual(pdf.candidate.status, 'pending_human_review');
  assert.strictEqual(pdf.candidate.human_review_required, true);
  assert.strictEqual(pdf.candidate.approved_for_knowledge_ingestion, false);
  assert.strictEqual(pdf.ingestion.allowed, false);
  assert.strictEqual(pdf.candidate.metadata.title, metadata.title);
  assert.strictEqual(pdf.candidate.extracted_text, 'Extracted text requiring human review.');

  const transcript = await buildExtractionReviewCandidate({
    metadata: { ...metadata, resource_type: 'audio_transcripts' },
    transcript: 'Transcript content for review.',
  });
  assert.strictEqual(transcript.ok, true);
  assert.strictEqual(transcript.candidate.extraction_method, 'provided_text_or_transcript');
  assert.strictEqual(transcript.candidate.approved_for_knowledge_ingestion, false);
  assert.strictEqual(transcript.ingestion.allowed, false);

  console.log(JSON.stringify({
    ok: true,
    targetedTest: 'GOAL-BB-ISSUE11 extraction-to-review gate',
    assertions: 21,
    pdfStatus: pdf.candidate.status,
    transcriptStatus: transcript.candidate.status,
    knowledgeIngestionAllowed: false,
  }));
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
