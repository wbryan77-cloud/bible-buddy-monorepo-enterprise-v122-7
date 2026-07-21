set -euo pipefail

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

node scripts/alpha/alphaCoreTruthSmoke.js \
  >"$OUT/core.txt" 2>&1

node scripts/alpha/decisionOwnershipSmoke.js \
  >"$OUT/decision.txt" 2>&1

node scripts/alpha/scriptureFidelitySmoke.js \
  >"$OUT/scripture.txt" 2>&1

cat "$OUT/core.txt"
cat "$OUT/decision.txt"
cat "$OUT/scripture.txt"

FAIL=0

if grep -iE 'Help me decide.*ten commandments|ten commandments.*Help me decide' \
  "$OUT/decision.txt"; then
  echo "FAIL: decision conversation leaked into Ten Commandments."
  FAIL=1
fi

if grep -iE 'Revelation 1:14-15.*(dietary|unclean|Leviticus 11|ten commandments)' \
  "$OUT/scripture.txt"; then
  echo "FAIL: explicit Revelation reference was overridden."
  FAIL=1
fi

if grep -iE 'Decision.*Which Bible topic|Which Bible topic.*Decision' \
  "$OUT/decision.txt"; then
  echo "FAIL: life-decision request received a Bible-menu clarifier."
  FAIL=1
fi

if grep -iE '"detectedConcept":"(ten_commandments|dietary_clean_unclean)"' \
  "$OUT/scripture.txt"; then
  echo "FAIL: explicit Scripture request received an unrelated concept."
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "Sprint 2C Truth Gate passed."
