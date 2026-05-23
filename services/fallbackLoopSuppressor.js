function suppressFallbackLoops(reply = '') {
  const lower = String(reply).toLowerCase();

  const blockedPatterns = [
    'let’s slow this down together',
    'would you like to explore',
    'tell me what is weighing on you',
    'name what is weighing on you most'
  ];

  for (const pattern of blockedPatterns) {
    if (lower.includes(pattern)) {
      return {
        suppressed: true,
        replacement:
          'Let us return to the biblical text directly and continue line upon line and precept upon precept from Scripture first.',
        blocked: pattern,
      };
    }
  }

  return {
    suppressed: false,
    replacement: reply,
    blocked: null,
  };
}

module.exports = {
  suppressFallbackLoops,
};