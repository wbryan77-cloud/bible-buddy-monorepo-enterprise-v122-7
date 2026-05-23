function sanitizeDoctrineResponse(reply = '') {
  let output = String(reply);

  const replacements = [
    {
      from: /dietary laws were abolished/gi,
      to: 'the dietary law discussion should be studied line upon line through Scripture continuity',
    },
    {
      from: /sunday replaced the sabbath/gi,
      to: 'the seventh-day Sabbath should be studied directly from Scripture continuity',
    },
    {
      from: /the law changed/gi,
      to: 'the continuity of the law should be studied directly through Scripture',
    },
  ];

  for (const replacement of replacements) {
    output = output.replace(replacement.from, replacement.to);
  }

  return output;
}

module.exports = {
  sanitizeDoctrineResponse,
};