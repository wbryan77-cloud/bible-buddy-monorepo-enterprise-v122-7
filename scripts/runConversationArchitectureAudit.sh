#!/usr/bin/env bash
set -e

OUT="ConversationArchitectureAudit_$(date +%Y%m%d_%H%M%S).md"

echo "# BibleBuddy Conversation Architecture Audit" > "$OUT"
echo "" >> "$OUT"
echo "Generated: $(date)" >> "$OUT"
echo "" >> "$OUT"

section () {
  echo "" >> "$OUT"
  echo "## $1" >> "$OUT"
  echo '```' >> "$OUT"
}

endsection () {
  echo '```' >> "$OUT"
}

section "Git / Deploy State"
git rev-parse HEAD >> "$OUT" 2>&1 || true
git status --short >> "$OUT" 2>&1 || true
endsection

section "All Intent / Human Need / Route Deciders"
grep -R "detectHumanNeed\|classifyCurrentTurnIntent\|classifyCompanionIntent\|classifyTurnContract\|planCompanionDoctrineRouting\|detectStrictTopicFromMessage\|detectSemanticConcept" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "All Clarifier Producers"
grep -R "Could you ask your question again\|Which Bible topic\|make sure I answer the right thing\|trouble retrieving\|clarifier\|clarification" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "OpenAI Blocking / Allowing Logic"
grep -R "blockOpenAI\|mustBlockOpenAi\|OPENAI\|openAiCalled\|strictDoctrineOpenAiBlocked" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "Doctrine Authority / Frozen Answer Paths"
grep -R "doctrine_final_authority\|strict_doctrine\|approvedDoctrineFrozen\|evidenceVerified\|humanApproved\|scriptureEvidenceUsed\|doctrineValidatorUsed" services docs scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "Memory / Stale Topic Risk"
grep -R "activeConcept\|lastAnsweredConcept\|lastAnsweredTopic\|activeDoctrineTopic\|sessionMemory\|turnMemory\|previousDoctrineTopic\|dietary_pork_unclean" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "Practical / Prayer / Emotional Engines"
grep -R "buildPrayerCompanionResponse\|buildPracticalWisdomResponse\|buildPresenceResponse\|buildFamilyExplanation\|buildBoundaryScript\|prayer_companion\|practical_wisdom\|emotional_support" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "Final Owner / Response Repair Layers"
grep -R "finalizeBuddyResponse\|liveResponseOwner\|singleCompanionContract\|companionRepairLane\|forbiddenPhraseDetected\|response_guarantee_fallback\|withBuddyChatGuarantee" services routes scripts --exclude-dir=node_modules >> "$OUT" 2>&1 || true
endsection

section "Known Bad Browser Transcript Failures To Reproduce"
cat <<'EOF' >> "$OUT"
What does the app do?
I need a better prayer
Prayer as I asked. Are you not able to read the texts?
Decision
I a decision that it not about the bible
What should I say to my son?
How do you know I'm talking about dietary law?
Can we eat shellfish?
Why did you say NO and then give me scriptures?
Only if that yes or no goes with answering the question.
Tell me more.
Stop.
EOF
endsection

section "Production Smoke Test"
for MSG in \
"What is this app?" \
"What does the app do?" \
"Can you pray with me?" \
"I need a better prayer" \
"I'm nervous about tomorrow." \
"Decision" \
"I have a decision that is not about the Bible." \
"What should I say to my son?" \
"Can we eat pork?" \
"Can we eat shellfish?" \
"What about Acts 10?" \
"Tell me more." \
"Stop."
do
  echo "### $MSG" >> "$OUT"
  curl -s -X POST "https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/buddy/chat" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"audit-batch-$(date +%s)\",\"message\":\"$MSG\"}" \
    | jq '{reply:.reply.reply, masterRoute:.reply.runtime.masterRoute, humanNeed:.reply.runtime.liveTruthTrace.orchestratorHumanNeed, routePlanHumanNeed:.reply.runtime.liveTruthTrace.routePlanHumanNeed, protectedHumanNeed:.reply.runtime.liveTruthTrace.protectedHumanNeed, repairLane:.reply.runtime.companionRepairLane, fallback:.reply.runtime.fallbackErrorCode}' >> "$OUT" 2>&1 || true
  echo "" >> "$OUT"
done
endsection

section "Recent Runtime Errors"
curl -s "https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health?trace=1" | jq '.recentErrors' >> "$OUT" 2>&1 || true
endsection

echo ""
echo "DONE: $OUT"
