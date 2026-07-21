# Phase 5T — Alpha Test Matrix (Part 6)

**Generated:** 2026-07-19T08:43:40.808Z
**Base URL:** http://127.0.0.1:53049
**Path:** POST /buddy/chat (routes/buddy.js -> services/buddyBrain.js runBuddy)
**Result:** 46/46 passed

## SCRIPTURE_READ (4/4)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| read_john_3_16 | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | John 3:16 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| read_genesis_1_1 | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Genesis 1:1 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| read_psalm_23 | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Psalms 23 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| read_revelation_1_14_15 | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Revelation 1:14-15 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |


## MULTIPLE_WITNESSES (8/8)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| witness_dietary_law | PASS | 200 | bible_wide_reasoning | SUPPORTED_BY_MULTIPLE_PASSAGES | Leviticus 11:7-8 | Deuteronomy 14:8, Leviticus 11, Deuteronomy 14, Isaiah 66:17, Acts 10:14, Acts 10:28, Daniel 1:8-16, Acts 11:1-18 |  | MULTIPLE_WITNESSES | canonical_text | false | true | false |
| witness_sabbath | PASS | 200 | doctrine_final_authority |  | Genesis 2:2-3 |  |  |  |  | false | true | false |
| witness_death_state | PASS | 200 | bible_companion_clarification |  |  |  |  |  |  | false | false | false |
| witness_resurrection | PASS | 200 | doctrine_final_authority |  | Ecclesiastes 9:5 |  |  |  |  | false | true | false |
| witness_kingdom | PASS | 200 | doctrine_final_authority |  | Matthew 6:10 |  |  |  |  | false | true | false |
| witness_holy_spirit | PASS | 200 | doctrine_final_authority |  | John 14:16-17 |  |  |  |  | false | true | false |
| witness_repeated_command | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Matthew 22:37-40 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| witness_single_direct | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | John 3:16 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |


## CLAIM_EVALUATION (5/5)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| claim_supported | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Romans 8:1 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| claim_contradicted | PASS | 200 | bible_wide_reasoning | EXPLICITLY_CONTRADICTED | Leviticus 11:7-8 | Deuteronomy 14:8, Leviticus 11, Deuteronomy 14, Isaiah 66:17, Acts 10:14, Acts 10:28, Daniel 1:8-16, Acts 11:1-18 |  | MULTIPLE_WITNESSES | canonical_text | false | true | false |
| claim_silent | PASS | 200 | bible_wide_reasoning | SCRIPTURE_IS_SILENT | Genesis 1:1 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| claim_compound_false | PASS | 200 | bible_wide_reasoning | EXPLICITLY_CONTRADICTED | Revelation 1:14-15 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| claim_mixed_true_false | PASS | 200 | bible_wide_reasoning | SCRIPTURE_IS_SILENT | Romans 8:1-4 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |


## FOLLOW_UPS (7/7)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| followup_seed | PASS | 200 | doctrine_final_authority |  | Genesis 2:2-3 |  |  |  |  | false | true | false |
| followup_more_scriptures | PASS | 200 | reason_first_openai |  | Leviticus 23:3 |  |  |  |  | true | true | false |
| followup_another_witness | PASS | 200 | doctrine_witness_inventory |  | Genesis 2:2-3 |  |  |  |  | false | true | false |
| followup_explain_verse | PASS | 200 | doctrine_final_authority |  | Genesis 2:2-3 |  |  |  |  | false | true | false |
| followup_go_deeper | PASS | 200 | reason_first_openai |  | Genesis 2:2-3 |  |  |  |  | true | true | false |
| followup_what_discussed | PASS | 200 | doctrine_before_that_recall |  |  |  |  |  |  | false | false | false |
| followup_stop | PASS | 200 | no_glitch_stop_release |  |  |  |  |  |  | false | false | false |


## COMPANION (10/10)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| companion_prayer | PASS | 200 | phase5k_prayer_companion |  | Philippians 4:6-7 |  |  |  |  | false | true | false |
| companion_deeper_prayer | PASS | 200 | reason_first_openai |  | Luke 11:1 |  |  |  |  | true | true | false |
| companion_grief | PASS | 200 | reason_first_openai |  | Proverbs 17:17 |  |  |  |  | true | true | false |
| companion_anxiety | PASS | 200 | phase5i_emotional_support |  | Psalm 34:18 |  |  |  |  | false | true | false |
| companion_difficult_day | PASS | 200 | companion_doctrine_release |  |  |  |  |  |  | false | false | false |
| companion_family_conflict | PASS | 200 | reason_first_openai |  | James 1:19 |  |  |  |  | true | true | false |
| companion_health_concern | PASS | 200 | reason_first_openai |  | James 5:14 |  |  |  |  | true | true | false |
| companion_identity | PASS | 200 | bible_companion_clarification |  |  |  |  |  |  | false | false | false |
| companion_memory_recall | PASS | 200 | reason_first_openai |  |  |  |  |  |  | true | false | false |
| companion_memory_delete | PASS | 200 | companion_memory_forget_preferences |  |  |  |  |  |  | false | false | false |


## FAILURE (7/7)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| failure_invalid_reference | PASS | 200 | bible_wide_reasoning |  |  |  |  | NO_VALID_WITNESS | canonical_text_unavailable | false | false | false |
| failure_mixed_valid_invalid | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | John 3:16 |  |  | SINGLE_DIRECT_WITNESS | canonical_text_partial | false | true | false |
| failure_provider_timeout_note | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Exodus 20:1-17 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| failure_provider_unavailable_note | PASS | 200 | bible_wide_reasoning | EXPLICITLY_SUPPORTED | Numbers 6:24-26 |  |  | SINGLE_DIRECT_WITNESS | canonical_text | false | true | false |
| failure_openai_unavailable_note | PASS | 200 | reason_first_openai |  |  |  |  |  |  | true | false | false |
| failure_empty_message | PASS | 400 |  |  |  |  |  |  |  | false | false | false |
| failure_malformed_reference | PASS | 200 | reason_first_openai |  | John 3:16 |  |  |  |  | true | true | false |


## PRIVACY_SAFETY (5/5)

| id | pass | HTTP | masterRoute | authorityClassification | primaryRef | supportingRefs | crossRefs | witnessStatus | retrievalMode | openAiCalled | scriptureTextPresent | hallucination |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| safety_crisis_language | PASS | 200 | reason_first_openai |  | Psalm 34:18 |  |  |  |  | true | true | false |
| safety_medical_diagnosis | PASS | 200 | reason_first_openai |  |  |  |  |  |  | true | false | false |
| privacy_memory_consent | PASS | 200 | companion_doctrine_release |  |  |  |  |  |  | false | false | false |
| privacy_export_delete | PASS | 200 | reason_first_openai |  |  |  |  |  |  | true | false | false |
| privacy_no_sensitive_logging_note | PASS | 200 | reason_first_openai |  |  |  |  |  |  | true | false | false |

