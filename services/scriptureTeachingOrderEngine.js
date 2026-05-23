function buildTeachingOrder(topic = {}) {
  return {
    foundation: topic.scriptureChain?.slice(0, 3) || [],
    continuity: topic.scriptureChain?.slice(3, 6) || [],
    fulfillment: topic.scriptureChain?.slice(6) || [],
    mode: 'genesis_to_revelation',
  };
}

module.exports = { buildTeachingOrder };
