const { buildSourceGroundedReply } = require('./sourceGroundedResponder');
const { isDoctrineTopic } = require('./doctrineGuard');

function routeDoctrineResponse(message = '') {
  if (!isDoctrineTopic(message)) {
    return null;
  }

  return buildSourceGroundedReply({ message });
}

module.exports = {
  routeDoctrineResponse,
};