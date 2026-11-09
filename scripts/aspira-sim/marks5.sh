#!/bin/bash
# marks5.sh <snapshot-dir> <out-prefix> [patch-file]: the marks at all FIVE point levels (ARCHITECTURE.md 4.8; owner, 2026-11-06:
# "1B, but also add a 0 point and 3 point check"; 2026-11-07 "1C": the 0-point band +/-2). <snapshot-dir> is a checkout (git archive)
# whose scripts/aspira-sim and web/ are used; <out-prefix>-{0,3,6,9,13}.out are the countermx tables; [patch-file] is code run after
# the game loads (ASPIRA_PATCH). The 9-point run is the card's (marks.py --write on <out-prefix>-9.out writes VS_MARKS; SEEDS9=4 for
# a card refresh - "two halves agree"). 0 / 3 / 6 / 13 points play ONE tower of a kind (N=1); 9 points the countermx default.
set -euo pipefail
D=$(cd "$1" && pwd); O=$(realpath -m "$2"); P=""; [ -n "${3:-}" ] && P=$(cat "$3")
cd "$D/scripts/aspira-sim"
run() { nice -n 10 env KINDS=arc,frz,sol,acd,grv,crr,ifr ASPIRA_WEB=../../web ASPIRA_PATCH="$P" POOL_WORKERS="${POOL_WORKERS:-10}" "$@"; }
run SPREAD_ONLY=1 N=1 POINTS=0 WINDOWS=9-19 node countermx.mjs 2 > "$O-0.out" 2>/dev/null
run SPREAD_ONLY=1 N=1 POINTS=3 WINDOWS=55-65 node countermx.mjs 2 > "$O-3.out" 2>/dev/null
run SPREAD_ONLY=1 N=1 POINTS=6 WINDOWS=81-89 node countermx.mjs 2 > "$O-6.out" 2>/dev/null
run SPREAD_ONLY=1 POINTS=9 WINDOWS=101-109,111-119 node countermx.mjs "${SEEDS9:-2}" > "$O-9.out" 2>/dev/null
run N=1 POINTS=13 WINDOWS=111-119 node countermx.mjs 2 > "$O-13.out" 2>/dev/null
for L in 0 3 6; do echo "== $L pts"; python3 marks.py "$O-$L.out" --band | grep -vE "^\{" || true; done
echo "== 9 pts"; python3 marks.py "$O-9.out" | grep -vE "^\{" || true
echo "== 13 pts"; python3 marks.py "$O-13.out" --focus | grep -vE "^\{" || true
