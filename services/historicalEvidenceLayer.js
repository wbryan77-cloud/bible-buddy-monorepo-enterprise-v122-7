function buildHistoricalEvidence(topicKey = '') {
  const evidence = {
    sabbath: [
      'Roman imperial Sunday legislation references',
      'Historical Sabbath observance records',
    ],
    feastDaysHighSabbaths: [
      'Ancient Israel feast observance references',
      'Second Temple feast records',
    ],
    traditionsOfMen: [
      'Historical winter festival references',
      'Historical spring fertility festival references',
    ],
  };

  return {
    topicKey,
    evidence: evidence[topicKey] || [],
    separatedFromScripture: true,
  };
}

module.exports = { buildHistoricalEvidence };
