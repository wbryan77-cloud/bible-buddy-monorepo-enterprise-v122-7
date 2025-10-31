
export const PHASE_SCRIPTS = {
  1: [
    { topic:'Onboarding', question:'Was the First-Run Checklist clear? What should be simplified?', followup:'Any confusing labels in Admin?' },
    { topic:'Scripture Alignment', question:'Which passages felt off-context this week?', followup:'Suggest a better passage with reason.' }
  ],
  2: [
    { topic:'Engagement', question:'Are renewal nudges helpful? What cadence is best?', followup:'Prefer tone: gentle / direct / playful?' },
    { topic:'Scanning', question:'Did the Temple Care scan feel fast and accurate?', followup:'Name one ingredient to add to rules.' }
  ],
    3: [
    { topic:'Doctrine Review', question:'Any verses to move between themes (peace, gratitude, discipline, hope, faith)?', followup:'List ref → theme and why.' },
    { topic:'Providers', question:'Ready to enable email/SMS to a small group?', followup:'Pick 10 recipients for a pilot.' }
  ],
  4: [
    { topic:'Release Readiness', question:'Any final guardrails (rate limits, quiet hours)?', followup:'Any audit/report you want weekly?' },
    { topic:'Community', question:'Invite Brothers/Sisters to gentle weekly reflections?', followup:'Pick a start date.' }
  ]
};
