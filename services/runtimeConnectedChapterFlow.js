const CONNECTED_CHAPTER_FLOW = {
  genesis_foundation: {
    chapters: ['Genesis 1', 'Genesis 2', 'Genesis 3'],
    themes: ['creation', 'mankind', 'garden', 'restoration foundation']
  },
  exodus_flow: {
    chapters: ['Exodus 12', 'Exodus 19', 'Exodus 20'],
    themes: ['deliverance', 'covenant', 'commandments']
  },
  prophetic_flow: {
    chapters: ['Isaiah 53', 'Daniel 7', 'Micah 5:2'],
    themes: ['suffering language', 'kingdom language', 'birth-place language']
  },
  gospel_flow: {
    chapters: ['Matthew 1', 'Luke 2', 'John 1'],
    themes: ['birth narrative', 'word language', 'continuity references']
  },
  revelation_flow: {
    chapters: ['Revelation 1', 'Revelation 21', 'Revelation 22'],
    themes: ['revelation', 'restoration', 'new jerusalem']
  }
};

function getConnectedChapterFlow(key = '') {
  return CONNECTED_CHAPTER_FLOW[String(key || '').trim()] || null;
}

function listConnectedChapterFlows() {
  return CONNECTED_CHAPTER_FLOW;
}

module.exports = {
  getConnectedChapterFlow,
  listConnectedChapterFlows,
  CONNECTED_CHAPTER_FLOW
};
