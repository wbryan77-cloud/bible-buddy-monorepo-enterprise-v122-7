function buildResilienceOps(input = {}) {
  const permissions = input.permissions || {};
  const event = input.event || {};

  return {
    enabled: permissions.resilienceOps !== false,
    posture: {
      mode: 'defensive_operations',
      failSafe: true,
      userDataProtection: 'high_priority',
      adminAlerting: true,
    },
    healthChecks: {
      enabled: true,
      checks: [
        'module_import_health',
        'json_parse_health',
        'route_boot_health',
        'required_env_presence',
        'provider_status',
      ],
      actions: [
        'isolate_unhealthy_optional_module',
        'fallback_to_safe_layer',
        'record_error_context',
        'notify_admin_for_review',
        'recommend_rollback_or_patch',
      ],
    },
    safeMode: {
      enabled: true,
      disables: [
        'external_sending',
        'calendar_writes',
        'sensitive_integrations',
        'experimental_agents',
      ],
      keepsAvailable: [
        'read_only_app_boot',
        'basic_buddy_chat_if_available',
        'admin_status_page',
        'static_help_content',
      ],
    },
    dataProtection: {
      principles: [
        'never_log_secrets',
        'minimize_raw_sensitive_storage',
        'protect_tokens_and_keys',
        'require_review_before_restoring_sensitive_features',
      ],
      recommendedNext: [
        'dependency_audit_ci',
        'secret_scan_ci',
        'static_analysis_ci',
        'rate_limits',
        'admin_security_events',
        'backup_restore_plan',
      ],
    },
    eventTriage: {
      reported: !!event.type,
      type: event.type || null,
      severity: event.severity || 'unknown',
      firstSteps: [
        'capture_safe_logs',
        'disable_affected_feature_if_known',
        'review_recent_commits_and_deploys',
        'verify_environment_configuration',
        'open_admin_review_task',
      ],
    },
    rules: [
      'Defensive operations only.',
      'Do not expose secrets in logs or UI.',
      'Do not remove review evidence automatically.',
      'Prefer containment, alerting, rollback, and verified patching.',
    ],
  };
}

module.exports = { buildResilienceOps };
