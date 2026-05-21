const DEFAULT_CALENDAR_PERMISSIONS = {
  calendarRead: false,
  calendarWrite: false,
  reminders: false,
  location: false,
  trafficEta: false,
};

function normalizePermissions(permissions = {}) {
  return { ...DEFAULT_CALENDAR_PERMISSIONS, ...permissions };
}

function buildCalendarTravelAssist(input = {}) {
  const permissions = normalizePermissions(input.permissions || {});
  const event = input.event || {};
  const traffic = input.traffic || {};

  if (!permissions.calendarRead) {
    return {
      enabled: false,
      reason: 'Calendar access is off until the user opts in.',
      requiredPermission: 'calendarRead',
    };
  }

  const etaMinutes = permissions.trafficEta ? traffic.etaMinutes || null : null;
  const minutesUntilEvent = Number.isFinite(input.minutesUntilEvent) ? input.minutesUntilEvent : null;
  const reminders = [];

  if (minutesUntilEvent !== null && minutesUntilEvent <= 30) {
    reminders.push({
      type: 'appointment_notice',
      message: `You have ${event.title || 'an appointment'} in ${minutesUntilEvent} minutes.`,
    });
  }

  if (etaMinutes && minutesUntilEvent !== null && etaMinutes >= minutesUntilEvent - 5) {
    reminders.push({
      type: 'leave_now',
      message: `Traffic may take about ${etaMinutes} minutes. You may want to start heading out soon.`,
    });
  }

  return {
    enabled: true,
    event: {
      title: event.title || null,
      startTime: event.startTime || null,
      location: event.location || null,
    },
    travel: {
      etaMinutes,
      locationUsed: !!permissions.location,
      trafficUsed: !!permissions.trafficEta,
    },
    reminders,
    actions: {
      canCreateReminder: !!permissions.reminders,
      canCreateOrChangeCalendarEvent: !!permissions.calendarWrite,
      requiresConfirmation: true,
    },
    boundaries: [
      'Do not read calendar without permission.',
      'Do not use location without permission.',
      'Do not create, change, or delete events without confirmation.',
      'Use calm, helpful, non-shaming language.',
    ],
  };
}

module.exports = {
  buildCalendarTravelAssist,
  DEFAULT_CALENDAR_PERMISSIONS,
};
