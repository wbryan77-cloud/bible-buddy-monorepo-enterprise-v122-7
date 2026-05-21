const DEFAULT_WORKSPACE_PERMISSIONS = {
  documentGeneration: true,
  emailDrafts: false,
  pdfExport: true,
  docxExport: true,
  externalSend: false,
};

function normalizePermissions(permissions = {}) {
  return { ...DEFAULT_WORKSPACE_PERMISSIONS, ...permissions };
}

function buildWorkspaceDocumentAssist(input = {}) {
  const permissions = normalizePermissions(input.permissions || {});
  const request = input.request || {};

  return {
    enabled: !!permissions.documentGeneration,
    request: {
      type: request.type || 'general_document',
      tone: request.tone || 'professional_warm',
      format: request.format || 'pdf_or_docx',
    },
    workflow: [
      'Understand the user goal.',
      'Ask only necessary clarifying questions.',
      'Structure the document clearly.',
      'Think ahead about follow-up needs.',
      'Generate export-ready content.',
    ],
    capabilities: {
      createPdf: !!permissions.pdfExport,
      createDocx: !!permissions.docxExport,
      createEmailDraft: !!permissions.emailDrafts,
      sendExternally: !!permissions.externalSend,
    },
    examples: [
      'Would you like this written in a legal, executive, warm, or concise tone?',
      'I can also create a follow-up email and reminder.',
      'I can export this as PDF or Word.',
    ],
    rules: [
      'Do not send externally without confirmation.',
      'Do not fabricate facts or sources.',
      'Keep outputs organized, calm, and truthful.',
    ],
  };
}

module.exports = {
  buildWorkspaceDocumentAssist,
  DEFAULT_WORKSPACE_PERMISSIONS,
};
