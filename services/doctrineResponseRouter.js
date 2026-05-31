const { buildSourceGroundedReply } = require('./sourceGroundedResponder');
const { isDoctrineTopic, shouldInterceptDoctrine } = require('./doctrineGuard');

function routeDoctrineResponse(message = '', questionIntent = null) {
  if (!shouldInterceptDoctrine(message, questionIntent)) {
    return null;
  }

  return buildSourceGroundedReply({ message, questionIntent });
}

module.exports = {
  routeDoctrineResponse,
};