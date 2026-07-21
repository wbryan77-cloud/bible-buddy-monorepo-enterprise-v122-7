# Founder Readiness Report

**Status:** BLOCKED
**Commit:** 09626367d1fd586b83b807a15c078507fbdd8aa1 (sprint-2c-c3-explicit-scripture-handoff, DIRTY)
**Generated:** 2026-07-19T17:57:33.413Z
**Duration:** 205s
**Server reachable at http://localhost:3000:** false

**Counts:** pass=26 warn=1 fail=3 skip=4

## Categories

- **[FAIL]** REPOSITORY — node_version:PASS, npm_version:PASS, lockfile_present:PASS, required_files_present:PASS, server_syntax_valid:PASS, migrations_not_referenced_in_build:FAIL, commit_and_working_tree_status:PASS
- **[PASS]** SCRIPTURE — scriptureFidelitySmoke:PASS, alphaCoreTruthSmoke:PASS, openAiFirstRegressionTest:PASS, liveRuntimeVerification:PASS
- **[PASS]** ORIGINAL_LANGUAGE — originalLanguageValidation:PASS
- **[PASS]** HISTORY — historical_records_present:PASS, historical_records_approved_and_tiered:PASS
- **[FAIL]** COMPANION — decisionOwnershipSmoke:FAIL, phase5OContinuationRegression:PASS
- **[SKIP_WITH_REASON]** ADMIN — admin_endpoints_reachable:SKIP_WITH_REASON
- **[PASS]** USER_PRODUCT — no_technical_route_leakage_in_ui:PASS, coming_soon_labels_present_for_disabled_toggles:PASS, home_page_reachable:SKIP_WITH_REASON
- **[PASS]** PROVIDERS — openai_configured_or_honest_fallback:PASS, local_kjv_corpus_available:PASS, no_secret_values_in_env_sample:PASS
- **[PASS]** SECURITY_AND_PRIVACY — admin_auth_boundary:SKIP_WITH_REASON, dotenv_gitignored:PASS, no_env_file_committed:PASS
- **[PASS]** PERFORMANCE — governed_doctrine_latency:PASS, concurrent_health_requests:SKIP_WITH_REASON
- **[FAIL]** DEPLOYMENT — render_yaml_present:PASS, render_start_command_present:PASS, render_health_check_path_present:WARN, no_prisma_migrate_in_build:FAIL, env_sample_present:PASS, readme_present:PASS

## Critical failures

- **REPOSITORY / migrations_not_referenced_in_build**: no migrations dir; render.yaml does not invoke prisma migrate (confirmed fixed Phase 6F/6G)
- **COMPANION / decisionOwnershipSmoke**: 13 passed, 1 failed
- **DEPLOYMENT / no_prisma_migrate_in_build**: null

## Warnings (documented, non-blocking)

- **DEPLOYMENT / render_health_check_path_present**: null

## Skipped checks

- **ADMIN / admin_endpoints_reachable**: no server reachable at http://localhost:3000 — start the app and rerun for live Admin checks
- **USER_PRODUCT / home_page_reachable**: no server reachable at http://localhost:3000
- **SECURITY_AND_PRIVACY / admin_auth_boundary**: no server reachable at http://localhost:3000
- **PERFORMANCE / concurrent_health_requests**: no server reachable at http://localhost:3000
