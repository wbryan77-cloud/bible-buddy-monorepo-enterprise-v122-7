/**
 * Browser build of services/alphaOnboardingGate.js (keep in sync).
 */
(function (global) {
  function resolveAlphaOnboardingGate(opts) {
    opts = opts || {};
    var token = String(opts.alphaToken || '').trim();
    var existing = opts.existingTesterId ? String(opts.existingTesterId).trim() : '';
    var invite = opts.invite;

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
      var staleMismatch = !!(existing && (!invite.tester || existing !== invite.tester.testerId));
      return {
        phase: 'onboard_required',
        showOnboarding: true,
        allowProduct: false,
        bindTesterId: null,
        clearStaleTesterId: staleMismatch || !!existing,
      };
    }

    var boundId = invite.tester && invite.tester.testerId ? String(invite.tester.testerId) : '';
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

  global.BibleBuddyAlphaGate = {
    resolveAlphaOnboardingGate: resolveAlphaOnboardingGate,
    shouldBlockAnonymousChat: shouldBlockAnonymousChat,
  };
})(typeof window !== 'undefined' ? window : globalThis);
