const DEFAULT_EMAIL_MEETING_PERMISSIONS = {
  emailRead: false,
  emailDraft: false,
  meetingSummaries: false,
  transcription: false,
};

function normalizePermissions(permissions = {}) {
  return { ...DEFAULT_EMAIL_MEETING_PERMISSIONS, ...permissions };
}

function buildEmailMeetingAssist(input = {}) {
  const permissions = normalizePermissions(input.permissions || {});

  return {
    email: {
      enabled: !!permissions.emailRead,
      capabilities: {
        summarizeThreads: true,
        extractActionItems: true,
        draftReplies: !!permissions.emailDraft,
      },
      workflow: [
        'Read only connected and permissioned email.',
        'Summarize clearly and briefly.',
        'Highlight urgent items and action steps.',
        'Draft replies for approval only.',
      ],
    },
    meetings: {
      enabled: !!permissions.meetingSummaries,
      transcriptionEnabled: !!permissions.transcription,
      capabilities: [
        'meeting_summary',
        'action_items',
        'decision_tracking',
        'report_generation',
      ],
      workflow: [
        'Clearly indicate when transcription is active.',
        'Summarize the meeting into concise notes.',
        'Extract follow-up tasks and deadlines.',
        'Offer export to PDF or Word.',
      ],
    },
    boundaries: [
      'Never secretly record meetings or calls.',
      'Respect consent and recording laws.',
      'Do not send emails without confirmation.',
      'Minimize stored raw content where possible.',
    ],
  };
}

module.exports = {
  buildEmailMeetingAssist,
  DEFAULT_EMAIL_MEETING_PERMISSIONS,
};
