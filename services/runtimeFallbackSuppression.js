function suppressFallback(response = {}) {
  const blockedFallbacks = [
    'I am here with you',
    'Let us slow this down together',
    'focus on what you are feeling',
    'church tradition says'
  ];

  return {
    ...response,
    blockedFallbacks,
    fallbackMode: 'scripture_runtime_only'
  };
}

module.exports = { suppressFallback };
