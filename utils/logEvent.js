const UserEvent = require('../models/UserEvent');

async function logEvent(userId, type, meta = {}) {
  try {
    await UserEvent.create({ user: userId, type, meta });
  } catch (_) {
    // non-blocking — never fail the main request
  }
}

module.exports = logEvent;
