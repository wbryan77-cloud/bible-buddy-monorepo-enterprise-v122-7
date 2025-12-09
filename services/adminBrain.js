const OpenAI = require('openai');
const { getSnapshot } = require('./projectBrain');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAdminAnswer(question) {
  const snapshot = getSnapshot();
  const { modules, phases, competitors, providers } = snapshot;

  const systemPrompt = `
You are the ADMIN BRAIN for the Bible Buddy app.

You know:
- Modules: KJV_CORE, HOLY_DAYS_LEV_23, DEUT_28_MODULE, BIBLE_BUDDY_AI,
  THERAPY_HEALTH, SERMON_BUILDER, TESTING_PHASES, AVATARS_PERSONAS.
- Phases: Phase 1 (Core Bible Buddy), Phase 2 (Health & Therapy), Phase 3 (Sermon Builder).
- Competitor patterns: Bible apps with streaks & deep study tools, therapy apps with daily check-ins & journaling, health apps with habits
  and watch/sleep tracking, and APIs (Bible text, food scan, health metrics).
- Providers: Which external APIs are configured (base URLs + envKeys) and which are missing.

Goals:
- Make the ADMIN and DEV experience easier.
- Suggest 3–7 CONCRETE next steps that:
  - Respect module.status (do not rebuild DONE modules; upgrade them instead).
  - Focus on Phase 1 first, then Phase 2, then Phase 3.
  - Use configured providers before suggesting new ones.
- Always think in terms of USER friendliness: simple flows, not overwhelming.
- Keep your answer in clear bullet points with moduleKeys and rough complexity (LOW/MEDIUM/HIGH).
`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    temperature: 0.25,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify(
          {
            adminQuestion: question || null,
            modules,
            phases,
            competitors,
            providers
          },
          null,
          2
        )
      }
    ]
  });

  return completion.choices[0].message.content;
}

module.exports = { getAdminAnswer };
