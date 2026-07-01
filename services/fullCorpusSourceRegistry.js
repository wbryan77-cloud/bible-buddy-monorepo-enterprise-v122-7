/**
 * Phase 3D — Full IOG / ICOJ master source registry (seed + expansion metadata).
 * Discovery registry only — no scraping or production mutation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');

const IOG_ADDITIONAL_CAMPS = [
  'Alaska', 'Baton Rouge', 'Birmingham', 'Buffalo', 'Cape Girardeau', 'Cleveland',
  'Columbia SC', 'Decatur', 'Fort Lauderdale', 'Jackson MS', 'Kalamazoo', 'Memphis',
  'Minneapolis', 'Montgomery', 'Orlando', 'Phoenix', 'Charlotte', 'Cincinnati',
  'Indianapolis', 'Las Vegas', 'Pine Bluff', 'Richmond', 'San Marcos',
  'Trinidad and Tobago', 'Washington DC', 'United Kingdom', 'Zimbabwe',
];

const ICOJ_ADDITIONAL_CAMPS = [
  'Cincinnati', 'Durham', 'Las Vegas', 'Little Rock', 'Oakland', 'Oklahoma City',
  'Philadelphia', 'Queens', 'Washington DC',
];

function slug(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sourceEntry({
  sourceId,
  sourceName,
  organization,
  camp,
  websiteUrl,
  youtubeChannelUrl = null,
  playlistUrls = [],
  lessonUrls = [],
  qnaUrls = [],
  publicationUrls = [],
  facebookUrl = null,
  instagramUrl = null,
  transcriptAvailable = false,
  processingAllowed = false,
  sourceType,
  estimatedLessons = 0,
  estimatedQaSessions = 0,
  estimatedQuestions = 0,
  discoveryPhase = '3D-seed',
  notes = '',
}) {
  return {
    sourceId,
    sourceName,
    organization,
    camp,
    websiteUrl,
    youtubeChannelUrl,
    playlistUrls,
    lessonUrls,
    qnaUrls,
    publicationUrls,
    facebookUrl,
    instagramUrl,
    transcriptAvailable,
    processingAllowed,
    sourceType,
    estimatedLessons,
    estimatedQaSessions,
    estimatedQuestions,
    loadedQuestions: 0,
    loadedLessons: 0,
    loadedQaSessions: 0,
    discoveryPhase,
    reviewRequired: true,
    copyrightStatus: processingAllowed ? 'admin_licensed' : 'metadata_pending_license',
    notes,
  };
}

function buildIogHqSources() {
  const hq = 'https://theisraelofgod.com';
  return [
    sourceEntry({
      sourceId: 'iog_hq_website',
      sourceName: 'IOG Main Website',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: hq,
      sourceType: 'website',
      estimatedQuestions: 50,
    }),
    sourceEntry({
      sourceId: 'iog_hq_locations',
      sourceName: 'IOG Locations Directory',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: `${hq}/locations`,
      sourceType: 'camp_directory',
      estimatedLessons: 0,
      estimatedQuestions: 0,
      notes: 'Camp discovery seed — all listed locations',
    }),
    sourceEntry({
      sourceId: 'iog_hq_live',
      sourceName: 'IOG Live Stream',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: `${hq}/live`,
      sourceType: 'live_stream',
      transcriptAvailable: true,
      estimatedQaSessions: 100,
      estimatedQuestions: 200,
    }),
    sourceEntry({
      sourceId: 'iog_hq_lessons',
      sourceName: 'IOG HQ Lessons',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: `${hq}/lessons`,
      lessonUrls: [`${hq}/lessons`],
      sourceType: 'lesson_archive',
      estimatedLessons: 200,
      estimatedQuestions: 400,
    }),
    sourceEntry({
      sourceId: 'iog_hq_shows',
      sourceName: 'IOG Shows',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: `${hq}/shows`,
      sourceType: 'show_archive',
      estimatedLessons: 80,
      estimatedQuestions: 160,
    }),
    sourceEntry({
      sourceId: 'iog_hq_publications',
      sourceName: 'IOG Global Publications',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: `${hq}/global-publication`,
      publicationUrls: [`${hq}/global-publication`],
      sourceType: 'publication',
      estimatedQuestions: 100,
    }),
    sourceEntry({
      sourceId: 'iog_bible_tv',
      sourceName: 'IOG Bible TV (VHX)',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: 'https://ioglessons.vhx.tv',
      sourceType: 'video_platform',
      transcriptAvailable: true,
      estimatedLessons: 150,
      estimatedQuestions: 300,
    }),
    sourceEntry({
      sourceId: 'iog_facebook_hq',
      sourceName: 'IOG Facebook Bible Study Class',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: 'https://www.facebook.com/theisraelofgodbiblestudyclass',
      facebookUrl: 'https://www.facebook.com/theisraelofgodbiblestudyclass',
      sourceType: 'social_video',
      estimatedQaSessions: 50,
      estimatedQuestions: 100,
    }),
    sourceEntry({
      sourceId: 'iog_youtube_main',
      sourceName: 'IOG YouTube Main (IOGNEWS9002)',
      organization: 'IOG',
      camp: 'HQ',
      youtubeChannelUrl: 'https://www.youtube.com/user/IOGNEWS9002',
      sourceType: 'youtube_channel',
      transcriptAvailable: true,
      estimatedLessons: 300,
      estimatedQuestions: 600,
    }),
    sourceEntry({
      sourceId: 'iog_youtube_handle',
      sourceName: 'IOG YouTube @theisraelofgod',
      organization: 'IOG',
      camp: 'HQ',
      youtubeChannelUrl: 'https://www.youtube.com/@theisraelofgod',
      playlistUrls: [
        'https://www.youtube.com/@theisraelofgod/videos',
        'https://www.youtube.com/@theisraelofgod/live',
        'https://www.youtube.com/@theisraelofgod/playlists',
      ],
      sourceType: 'youtube_channel',
      transcriptAvailable: true,
      estimatedLessons: 500,
      estimatedQuestions: 1000,
    }),
    sourceEntry({
      sourceId: 'iog_instagram',
      sourceName: 'IOG Instagram',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: 'https://www.instagram.com/theisraelofgod',
      instagramUrl: 'https://www.instagram.com/theisraelofgod',
      sourceType: 'social',
      estimatedQuestions: 30,
    }),
    sourceEntry({
      sourceId: 'iog_x',
      sourceName: 'IOG X (Twitter)',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: 'https://twitter.com/TheIsraelofGod',
      sourceType: 'social',
      estimatedQuestions: 20,
    }),
    sourceEntry({
      sourceId: 'iog_wednesday_qa',
      sourceName: 'IOG Wednesday Night Q&A (IOGIsrael)',
      organization: 'IOG',
      camp: 'HQ',
      youtubeChannelUrl: 'https://www.youtube.com/user/IOGIsrael',
      qnaUrls: [
        'https://www.youtube.com/user/IOGIsrael',
        'https://www.youtube.com/results?search_query=IOG+Wednesday+Night+Q%26A',
      ],
      sourceType: 'qna_archive',
      transcriptAvailable: true,
      estimatedQaSessions: 400,
      estimatedQuestions: 800,
    }),
    sourceEntry({
      sourceId: 'iog_research_committee',
      sourceName: 'IOG Research Committee',
      organization: 'IOG',
      camp: 'HQ',
      websiteUrl: 'https://www.theisraelofgodrc.com',
      sourceType: 'research_publication',
      publicationUrls: ['https://www.theisraelofgodrc.com'],
      estimatedQuestions: 80,
    }),
  ];
}

function buildIogCampSources() {
  const camps = [
    {
      camp: 'Atlanta',
      websiteUrl: null,
      facebookUrl: 'https://www.facebook.com/iogatl',
      instagramUrl: 'https://www.instagram.com/iogatl',
      playlistUrls: ['https://www.youtube.com/playlist?list=PLa_ZSNDY4afi0SfHrW-bXi9OivWBOEZ4Q'],
      address: '4957 Redan Rd, Stone Mountain GA',
      estimatedLessons: 60,
      estimatedQaSessions: 40,
    },
    {
      camp: 'Houston',
      facebookUrl: 'https://www.facebook.com/ioghou',
      playlistUrls: ['https://www.facebook.com/ioghou/videos'],
      address: '5809 Nordling Rd, Houston TX',
      estimatedLessons: 50,
      estimatedQaSessions: 35,
    },
    {
      camp: 'Rialto / Los Angeles',
      facebookUrl: 'https://www.facebook.com/The-Israel-Of-God-Rialto-Los-Angeles-100080309874391',
      address: '224 W Etiwanda Ave, Rialto CA',
      estimatedLessons: 45,
    },
    {
      camp: 'Baltimore',
      websiteUrl: 'https://www.theisraelofgodbmore.com',
      facebookUrl: 'https://www.facebook.com/theisraelofgodbaltimore',
      estimatedLessons: 40,
    },
    {
      camp: 'Dallas',
      websiteUrl: 'https://israelofgoddallas.com',
      facebookUrl: 'https://www.facebook.com/IOGDallas1',
      estimatedLessons: 45,
    },
    {
      camp: 'Detroit',
      facebookUrl: 'https://www.facebook.com/IOGDetroit',
      instagramUrl: 'https://www.instagram.com/iog.detroit',
      estimatedLessons: 40,
    },
    {
      camp: 'St Louis',
      facebookUrl: 'https://www.facebook.com/theiogstl',
      estimatedLessons: 35,
    },
    {
      camp: 'Bay Area',
      facebookUrl: 'https://www.facebook.com/IOGBayArea',
      estimatedLessons: 35,
    },
    {
      camp: 'Raleigh',
      facebookUrl: 'https://www.facebook.com/IOGRALNC',
      estimatedLessons: 30,
    },
    {
      camp: 'New Jersey',
      facebookUrl: 'https://www.facebook.com/groups/559741117509670',
      estimatedLessons: 30,
    },
  ];

  const entries = camps.map((c) => sourceEntry({
    sourceId: `iog_camp_${slug(c.camp)}`,
    sourceName: `IOG ${c.camp}`,
    organization: 'IOG',
    camp: c.camp,
    websiteUrl: c.websiteUrl,
    facebookUrl: c.facebookUrl,
    instagramUrl: c.instagramUrl,
    playlistUrls: c.playlistUrls || [],
    sourceType: 'camp',
    estimatedLessons: c.estimatedLessons || 25,
    estimatedQaSessions: c.estimatedQaSessions || 20,
    estimatedQuestions: (c.estimatedLessons || 25) * 2 + (c.estimatedQaSessions || 20),
    notes: c.address || '',
  }));

  for (const campName of IOG_ADDITIONAL_CAMPS) {
    entries.push(sourceEntry({
      sourceId: `iog_camp_${slug(campName)}`,
      sourceName: `IOG ${campName}`,
      organization: 'IOG',
      camp: campName,
      websiteUrl: 'https://theisraelofgod.com/locations',
      sourceType: 'camp',
      estimatedLessons: 20,
      estimatedQaSessions: 15,
      estimatedQuestions: 55,
      notes: 'Registered from IOG locations directory seed',
    }));
  }

  return entries;
}

function buildIcojSources() {
  const hq = 'https://www.israelthechurchofjesus.net';
  const entries = [
    sourceEntry({
      sourceId: 'icoj_hq_website',
      sourceName: 'ICOJ Main Website',
      organization: 'ICOJ',
      camp: 'HQ',
      websiteUrl: hq,
      sourceType: 'website',
      estimatedQuestions: 40,
    }),
    sourceEntry({
      sourceId: 'icoj_hq_locations',
      sourceName: 'ICOJ Locations Directory',
      organization: 'ICOJ',
      camp: 'HQ',
      websiteUrl: `${hq}/locations`,
      sourceType: 'camp_directory',
      notes: 'Camp discovery seed',
    }),
    sourceEntry({
      sourceId: 'icoj_lesson_handouts',
      sourceName: 'ICOJ Lesson Handouts',
      organization: 'ICOJ',
      camp: 'HQ',
      websiteUrl: `${hq}/lesson-handouts`,
      lessonUrls: [`${hq}/lesson-handouts`],
      sourceType: 'lesson_handout',
      estimatedLessons: 120,
      estimatedQuestions: 240,
    }),
    sourceEntry({
      sourceId: 'icoj_hq_lessons',
      sourceName: 'ICOJ HQ Lessons',
      organization: 'ICOJ',
      camp: 'HQ',
      websiteUrl: `${hq}/lessons`,
      lessonUrls: [`${hq}/lessons`],
      sourceType: 'lesson_archive',
      estimatedLessons: 100,
      estimatedQuestions: 200,
    }),
    sourceEntry({
      sourceId: 'icoj_youtube',
      sourceName: 'ICOJ YouTube IsraelChurchofJesus7',
      organization: 'ICOJ',
      camp: 'HQ',
      youtubeChannelUrl: 'https://www.youtube.com/user/IsraelChurchofJesus7',
      playlistUrls: [
        'https://www.youtube.com/user/IsraelChurchofJesus7/videos',
        'https://www.youtube.com/user/IsraelChurchofJesus7/live',
        'https://www.youtube.com/user/IsraelChurchofJesus7/playlists',
      ],
      sourceType: 'youtube_channel',
      transcriptAvailable: true,
      estimatedLessons: 250,
      estimatedQuestions: 500,
    }),
    sourceEntry({
      sourceId: 'icoj_facebook',
      sourceName: 'ICOJ Facebook thykingdomcome7',
      organization: 'ICOJ',
      camp: 'HQ',
      facebookUrl: 'https://www.facebook.com/thykingdomcome7',
      qnaUrls: [
        'https://www.facebook.com/thykingdomcome7/videos',
        'https://www.facebook.com/thykingdomcome7/videos/qa/1653238386010351',
        'https://www.facebook.com/thykingdomcome7/videos/247-watch/1182783540601065',
      ],
      sourceType: 'social_video',
      estimatedQaSessions: 200,
      estimatedQuestions: 400,
    }),
    sourceEntry({
      sourceId: 'icoj_instagram',
      sourceName: 'ICOJ Instagram elijahisrael12',
      organization: 'ICOJ',
      camp: 'HQ',
      instagramUrl: 'https://www.instagram.com/elijahisrael12',
      sourceType: 'social',
      estimatedQuestions: 25,
    }),
  ];

  const icojCamps = [
    { camp: 'Atlanta', websiteUrl: `${hq}/atlanta-ga`, facebookUrl: 'https://www.facebook.com/103550015921606' },
    { camp: 'Los Angeles', websiteUrl: `${hq}/lessons-los-angeles-ca`, facebookUrl: 'https://www.facebook.com/IsraelTheChurchOfJesus' },
    { camp: 'Dallas', facebookUrl: 'https://www.facebook.com/Israelthechurchofjesusdallas' },
    { camp: 'Jacksonville', facebookUrl: 'https://www.facebook.com/israelthechurchofjesusjacksonville' },
    { camp: 'Toronto', websiteUrl: `${hq}/toronto-ontario`, facebookUrl: 'https://www.facebook.com/israelthechurchofjesustoronto' },
    { camp: 'Houston', estimatedLessons: 35 },
    { camp: 'Indianapolis', estimatedLessons: 30 },
  ];

  for (const c of icojCamps) {
    entries.push(sourceEntry({
      sourceId: `icoj_camp_${slug(c.camp)}`,
      sourceName: `ICOJ ${c.camp}`,
      organization: 'ICOJ',
      camp: c.camp,
      websiteUrl: c.websiteUrl,
      facebookUrl: c.facebookUrl,
      sourceType: 'camp',
      estimatedLessons: c.estimatedLessons || 25,
      estimatedQaSessions: 15,
      estimatedQuestions: (c.estimatedLessons || 25) * 2 + 15,
    }));
  }

  for (const campName of ICOJ_ADDITIONAL_CAMPS) {
    entries.push(sourceEntry({
      sourceId: `icoj_camp_${slug(campName)}`,
      sourceName: `ICOJ ${campName}`,
      organization: 'ICOJ',
      camp: campName,
      websiteUrl: `${hq}/locations`,
      sourceType: 'camp',
      estimatedLessons: 20,
      estimatedQaSessions: 12,
      estimatedQuestions: 52,
      notes: 'Registered from ICOJ locations directory seed',
    }));
  }

  return entries;
}

function buildInternalDiscoverySources() {
  return [
    sourceEntry({
      sourceId: 'internal_bulk_registry',
      sourceName: 'Internal Bulk Discovery Registry',
      organization: 'Internal',
      camp: 'Internal',
      sourceType: 'internal_registry',
      processingAllowed: true,
      estimatedQuestions: 30,
      discoveryPhase: 'legacy',
    }),
    sourceEntry({
      sourceId: 'internal_licensed_transcripts',
      sourceName: 'Licensed Transcript Batch',
      organization: 'Internal',
      camp: 'Internal',
      sourceType: 'licensed_transcript',
      processingAllowed: true,
      transcriptAvailable: true,
      estimatedQaSessions: 12,
      estimatedQuestions: 24,
      discoveryPhase: 'legacy',
    }),
    sourceEntry({
      sourceId: 'internal_stress_phase2i',
      sourceName: 'Phase 2I Stress Test',
      organization: 'Internal',
      camp: 'Internal',
      sourceType: 'stress_test',
      processingAllowed: true,
      estimatedQuestions: 125,
      discoveryPhase: 'legacy',
    }),
    sourceEntry({
      sourceId: 'internal_unified_candidates',
      sourceName: 'Unified Discovery Candidates',
      organization: 'Internal',
      camp: 'Internal',
      sourceType: 'previous_discovery',
      processingAllowed: true,
      estimatedQuestions: 80,
      discoveryPhase: 'legacy',
    }),
  ];
}

function buildFullCorpusSourceRegistry({ writeFile = true } = {}) {
  const seedSources = [
    ...buildIogHqSources(),
    ...buildIogCampSources(),
    ...buildIcojSources(),
    ...buildInternalDiscoverySources(),
  ];

  const seen = new Set();
  const sources = [];
  for (const s of seedSources) {
    if (seen.has(s.sourceId)) continue;
    seen.add(s.sourceId);
    sources.push(s);
  }

  const payload = {
    version: '3D',
    description: 'Full IOG / ICOJ corpus source registry — seed preload + discovery metadata',
    generatedAt: new Date().toISOString(),
    authorityNote: 'Registry metadata only until licensed transcript processing. Scripture remains authority.',
    seedSourceCount: sources.length,
    organizations: ['IOG', 'ICOJ', 'Internal'],
    sources,
    totals: {
      iogSources: sources.filter((s) => s.organization === 'IOG').length,
      icojSources: sources.filter((s) => s.organization === 'ICOJ').length,
      internalSources: sources.filter((s) => s.organization === 'Internal').length,
      camps: new Set(sources.map((s) => `${s.organization}:${s.camp}`)).size,
      estimatedLessons: sources.reduce((n, s) => n + s.estimatedLessons, 0),
      estimatedQaSessions: sources.reduce((n, s) => n + s.estimatedQaSessions, 0),
      estimatedQuestions: sources.reduce((n, s) => n + s.estimatedQuestions, 0),
    },
  };

  if (writeFile) {
    fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  }

  return payload;
}

function updateRegistryLoadCounts(sourceCounts = {}) {
  const registry = buildFullCorpusSourceRegistry({ writeFile: false });
  for (const s of registry.sources) {
    const counts = sourceCounts[s.sourceId];
    if (counts) {
      s.loadedQuestions = counts.questions || 0;
      s.loadedLessons = counts.lessons || 0;
      s.loadedQaSessions = counts.qaSessions || 0;
    }
  }
  registry.totals.loadedQuestions = registry.sources.reduce((n, s) => n + s.loadedQuestions, 0);
  registry.totals.loadedLessons = registry.sources.reduce((n, s) => n + s.loadedLessons, 0);
  registry.totals.loadedQaSessions = registry.sources.reduce((n, s) => n + s.loadedQaSessions, 0);
  registry.generatedAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}

module.exports = {
  buildFullCorpusSourceRegistry,
  updateRegistryLoadCounts,
  REGISTRY_PATH,
  IOG_ADDITIONAL_CAMPS,
  ICOJ_ADDITIONAL_CAMPS,
};
