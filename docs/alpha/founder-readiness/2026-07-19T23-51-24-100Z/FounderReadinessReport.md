# Founder Readiness Report

**Status:** BLOCKED
**Commit:** 09626367d1fd586b83b807a15c078507fbdd8aa1 (sprint-2c-c3-explicit-scripture-handoff, DIRTY)
**Generated:** 2026-07-19T23:52:16.068Z
**Duration:** 52s
**Server reachable at http://localhost:3000:** true

**Counts:** pass=35 warn=2 fail=2 skip=0

## Categories

- **[PASS]** REPOSITORY — node_version:PASS, npm_version:PASS, lockfile_present:PASS, required_files_present:PASS, server_syntax_valid:PASS, migrations_not_referenced_in_build:PASS, commit_and_working_tree_status:PASS
- **[FAIL]** SCRIPTURE — scriptureFidelitySmoke:PASS, alphaCoreTruthSmoke:PASS, openAiFirstRegressionTest:FAIL, liveRuntimeVerification:PASS
- **[PASS]** ORIGINAL_LANGUAGE — originalLanguageValidation:PASS
- **[PASS]** HISTORY — historical_records_present:PASS, historical_records_approved_and_tiered:PASS
- **[FAIL]** COMPANION — decisionOwnershipSmoke:PASS, phase5OContinuationRegression:FAIL
- **[PASS]** ADMIN — admin_/admin/api/bible-authority/command-center:PASS, admin_/admin/api/bible-authority/review-queue:PASS, admin_/admin/api/bible-authority/knowledge-coverage-dashboard:PASS, admin_/admin/api/bible-authority/founder-console:PASS, admin_/admin/api/bible-authority/provider-health:PASS
- **[PASS]** USER_PRODUCT — no_technical_route_leakage_in_ui:PASS, coming_soon_labels_present_for_disabled_toggles:PASS, home_page_reachable:PASS
- **[PASS]** PROVIDERS — openai_configured_or_honest_fallback:PASS, local_kjv_corpus_available:PASS, no_secret_values_in_env_sample:PASS
- **[WARN]** SECURITY_AND_PRIVACY — admin_auth_boundary:WARN, dotenv_gitignored:PASS, no_env_file_committed:PASS
- **[WARN]** PERFORMANCE — governed_doctrine_latency:PASS, concurrent_health_requests:PASS, admin_dashboard_latency:WARN
- **[PASS]** DEPLOYMENT — render_yaml_present:PASS, render_start_command_present:PASS, render_health_check_path_present:PASS, no_prisma_migrate_in_build:PASS, env_sample_present:PASS, readme_present:PASS

## Critical failures

- **SCRIPTURE / openAiFirstRegressionTest**: 1 passed, 9 failed
- **COMPANION / phase5OContinuationRegression**: Command failed: /opt/homebrew/Cellar/node/26.0.0/bin/node -r dotenv/config /Users/william/Documents/bible-buddy-monorepo-enterprise-v122-7/scripts/runPhase5OContinuationRegression.js
node:internal/process/promises:332
    triggerUncaughtException(err, true /* fromPromise */);
    ^

[TypeError: fetch failed] {
  [cause]: Error: getaddrinfo ENOTFOUND bible-buddy-monorepo-enterprise-v122-7.onrender.com
      at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:121:26) {
    errno: -3008,
    code: 'ENOTFOUND',
    syscall: 'getaddrinfo',
    hostname: 'bible-buddy-monorepo-enterprise-v122-7.onrender.com'
  }
}

Node.js v26.0.0


## Warnings (documented, non-blocking)

- **SECURITY_AND_PRIVACY / admin_auth_boundary**: no admin token env var configured — Admin routes are open in this environment (expected for local Founder testing, must be set before any shared/public deployment)
- **PERFORMANCE / admin_dashboard_latency**: command-center in 6124ms (offline-precomputed snapshot aggregation; not on the live chat hot path)

## Skipped checks
_None._
