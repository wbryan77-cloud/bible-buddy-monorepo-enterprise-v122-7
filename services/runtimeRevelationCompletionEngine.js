const REVELATION_COMPLETION_ENGINE = {
  kingdomCompletion: {
    continuityPath: [
      'Daniel 7:13-14',
      'Matthew 24:30',
      'Revelation 11:15'
    ],
    completionObjective: 'Track kingdom fulfillment continuity.'
  },
  newJerusalemCompletion: {
    continuityPath: [
      'Isaiah 65:17-19',
      'Hebrews 11:10',
      'Revelation 21:1-5'
    ],
    completionObjective: 'Track New Jerusalem continuity.'
  },
  restorationCompletion: {
    continuityPath: [
      'Isaiah 11:6-9',
      'Acts 3:19-21',
      'Revelation 22:1-5'
    ],
    completionObjective: 'Track restoration completion continuity.'
  }
};

function resolveRevelationCompletion(key = '') {
  return REVELATION_COMPLETION_ENGINE[String(key || '').trim()] || null;
}

function listRevelationCompletionPaths() {
  return REVELATION_COMPLETION_ENGINE;
}

module.exports = {
  REVELATION_COMPLETION_ENGINE,
  resolveRevelationCompletion,
  listRevelationCompletionPaths
};
