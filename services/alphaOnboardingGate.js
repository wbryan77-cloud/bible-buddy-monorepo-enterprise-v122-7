/**
 * Alpha onboarding client/server gate decisions (pure).
 * Shared by tests and documented as the identity contract for invite entry.
 */

/**
 * @param {object} args
 * @param {string} [args.alphaToken]
 * @param {string|null} [args.existingTesterId] localStorage bb_alpha_tester_id
 * @param {null|'pending'|object} [args.invite] null=no fetch yet; 'pending'; or API JSON
 */
function resolveAlphaOnboardingGate({
  alphaToken = '',
  existingTesterId = null,
  invite = null,
} = {}) {
  const token = String(alphaToken || '').trim();
  const existing = existingTesterId ? String(existingTesterId).trim() : '';

  if (!token) {
    if (existing) {
      return {
        phase: 'returning_local',
        showOnboarding: false,
        allowProduct: true,
        bindTesterId: existing,
        clearStaleTesterId: false,
      };
    }
    return {
      phase: 'anonymous_no_invite',
      showOnboarding: false,
      allowProduct: true,
      bindTesterId: null,
      clearStaleTesterId: false,
    };
  }

  // Invite token present — never allow anonymous product until resolved.
  if (invite == null || invite === 'pending') {
    return {
      phase: 'validating',
      showOnboarding: true,
      allowProduct: false,
      bindTesterId: null,
      clearStaleTesterId: false,
    };
  }

  if (!invite.ok) {
    return {
      phase: 'invalid_invite',
      showOnboarding: true,
      allowProduct: false,
      bindTesterId: null,
      clearStaleTesterId: true,
      error: invite.error || 'Invalid invite link.',
    };
  }

  if (!invite.used) {
    const staleMismatch = !!(existing && (!invite.tester || existing !== invite.tester.testerId));
    return {
      phase: 'onboard_required',
      showOnboarding: true,
      allowProduct: false,
      bindTesterId: null,
      clearStaleTesterId: staleMismatch || !!existing,
    };
  }

  // Used + bound on server
  const boundId = invite.tester && invite.tester.testerId ? String(invite.tester.testerId) : '';
  if (!boundId) {
    return {
      phase: 'invalid_invite',
      showOnboarding: true,
      allowProduct: false,
      bindTesterId: null,
      clearStaleTesterId: true,
      error: 'Invite is marked used but has no tester binding.',
    };
  }

  if (existing && existing === boundId) {
    return {
      phase: 'returning_bound',
      showOnboarding: false,
      allowProduct: true,
      bindTesterId: boundId,
      clearStaleTesterId: false,
    };
  }

  // Clean device (or stale other tester) opening a consumed invite:
  // bind to the invite's tester — not anonymous guest — without re-forcing full intake
  // when the server already has onboardedAt / name. Preferred-name was captured at bind time.
  return {
    phase: 'returning_invite',
    showOnboarding: false,
    allowProduct: true,
    bindTesterId: boundId,
    clearStaleTesterId: !!(existing && existing !== boundId),
    testerName: invite.tester && invite.tester.name ? invite.tester.name : null,
  };
}

function shouldBlockAnonymousChat(gate) {
  return !!(gate && gate.allowProduct === false);
}

module.exports = {
  resolveAlphaOnboardingGate,
  shouldBlockAnonymousChat,
};
