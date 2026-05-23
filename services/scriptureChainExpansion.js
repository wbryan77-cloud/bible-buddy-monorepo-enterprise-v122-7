const SCRIPTURE_CHAINS = {
  sabbath: [
    'Genesis 2:2-3',
    'Exodus 20:8-11',
    'Isaiah 58:13-14',
    'Luke 4:16',
    'Acts 13:42-44',
    'Acts 17:2',
    'Hebrews 4:9'
  ],
  dietaryLaw: [
    'Leviticus 11',
    'Deuteronomy 14',
    'Daniel 1',
    'Acts 10:14',
    'Acts 10:28',
    'Acts 11:1-18',
    'Isaiah 66:17'
  ],
  feastDays: [
    'Leviticus 23',
    'Zechariah 14:16',
    'Acts 2',
    '1 Corinthians 5:7-8'
  ],
  traditions: [
    'Jeremiah 10:1-4',
    'Mark 7:6-13',
    'Colossians 2:8'
  ],
  resurrection: [
    'Matthew 12:40',
    'Matthew 28:1-6',
    'Mark 16:1-6',
    'Luke 24:1-6',
    'John 20:1-8'
  ]
};

function getScriptureChain(topic = '') {
  return SCRIPTURE_CHAINS[topic] || [];
}

module.exports = {
  SCRIPTURE_CHAINS,
  getScriptureChain,
};