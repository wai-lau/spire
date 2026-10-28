#!/usr/bin/env bash
# THE BATTERY IN SMALL CHUNKS (owner, 2026-10-27: "decompose the battery into smaller parts" - machine sims and edits run in
# parallel, an edit makes a long sim stale, so every chunk is minutes-sized, streams as it lands, and is acted on before the next).
# Every chunk runs on a PINNED snapshot of web/ (snap) and writes to $OUT (default: ~/sim-out, survives a reboot). One pool job at a time.
#   battery.sh snap                      snapshot web/ -> $OUT/web-<commit>; later chunks use it (ASPIRA_WEB)
#   battery.sh duo                       1. the duo rule, 2 seeds (~30 s) - the gate: a fail stops the battery
#   battery.sh late [points]             2. chapter-4 standing: every tower's row at 101-109 / 111-119 (~2 min)
#   battery.sh tribal <kind|all> [seeds] 3. tribal for the trios holding <kind> (15 trios, ~20 min; all: 35, ~45 min), streamed a game a line;
#                                           factors only from a COMPLETE chunk (losses land first - a partial set is biased)
#   battery.sh plan <trios|losers|rest>  4. the planner, streamed a trio a line (~5 min a trio): losers first, act, then the rest
#   battery.sh marks <windows> [points]  5. the marks for one chapter (~2 min)
#   battery.sh boss <wave|all> [mode]    6. boss calibration, one boss WAVE a chunk (bossbal.mjs tune), on the shorter lanes - LAST (owner)
#   battery.sh tally <file>              the tally of a chunk so far (a .jsonl / .jsonl.pool / tribal jsonl -> factors)
# Bosses are SKIPPED in tribal / plan (BOSS_SKIP=1: owner, 2026-10-27 - "ignore boss waves, assume instakill and get rewards");
# never in duo (its rule names the Star) nor in boss.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../.." && pwd)
OUT=${OUT:-$HOME/sim-out} # durable: /tmp is wiped on a WSL reboot (2026-10-27 lost a battery's outputs); was one session's /tmp scratchpad
mkdir -p "$OUT"
KINDS=arc,frz,sol,acd,grv,car,ifr
LOSERS=arc+grv+ifr,frz+acd+car,sol+acd+car,sol+grv+car,sol+grv+ifr,sol+car+ifr,grv+car+ifr
snap() { local c; c=$(git -C "$ROOT" rev-parse --short HEAD); rm -rf "$OUT/web-$c"; mkdir -p "$OUT/web-$c"; cp -r "$ROOT/web/." "$OUT/web-$c/"; echo "$OUT/web-$c" > "$OUT/web-current"; echo "snapshot $OUT/web-$c"; }
web() { cat "$OUT/web-current" 2>/dev/null || { echo "no snapshot - run: battery.sh snap" >&2; exit 2; }; }
trios_with() { node -e 'const K="arc,frz,sol,acd,grv,car,ifr".split(","),k=process.argv[1],o=[];for(let a=0;a<7;a++)for(let b=a+1;b<7;b++)for(let c=b+1;c<7;c++){const t=[K[a],K[b],K[c]];if(k==="all"||t.includes(k))o.push(t.join("+"))}console.log(o.join(","))' "$1"; }
case "${1:-help}" in
  snap) snap ;;
  duo) W=$(web); ASPIRA_WEB=$W DUO_GRID='{"now":""}' node "$HERE/duo0.mjs" "${2:-2}" | tail -1 ;;
  late) W=$(web); SPREAD_ONLY=1 POINTS="${2:-10}" WINDOWS=101-109,111-119 KINDS=$KINDS ASPIRA_WEB=$W node "$HERE/countermx.mjs" 2 ;;
  tribal) W=$(web); k=${2:?kind or all}; f="$OUT/tribal-$k-$(basename "$W").jsonl"; echo "streaming to $f"; BOSS_SKIP=1 SEEDS="${3:-1,2}" KINDS=$KINDS TRIOS=$(trios_with "$k") ASPIRA_WEB=$W node "$HERE/tribal.mjs" "$f" ;;
  plan) W=$(web); t=${2:?trios|losers|rest}; case $t in losers) t=$LOSERS ;; rest) t=$(trios_with all | tr ',' '\n' | grep -vxF -f <(tr ',' '\n' <<< "$LOSERS") | paste -sd,) ;; esac
        f="$OUT/plan-$(echo "$t" | md5sum | cut -c1-6)-$(basename "$W").jsonl"; echo "streaming to $f.pool"; BOSS_SKIP=1 TRIOS=$t ASPIRA_WEB=$W node "$HERE/trioplan.mjs" "${3:-3}" "${4:-1}" "$f" ;;
  marks) W=$(web); SPREAD_ONLY=1 POINTS="${3:-6}" WINDOWS="${2:?windows}" KINDS=$KINDS ASPIRA_WEB=$W node "$HERE/countermx.mjs" 2 ;;
  boss) W=$(web); BOSS="${2:-all}" ASPIRA_WEB=$W node "$HERE/bossbal.mjs" ;;
  tally) f=${2:?file}; case $f in *tribal*) python3 "$HERE/triscale.py" "$f" | tail -3 ;; *) node -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").split("\n"))if(l){const r=JSON.parse(l),a=r.args,s=r.res;console.log((a.trio||[]).join("+").padEnd(12),s.won?"WON ":"lost","w"+s.wave,"lives",s.lives,s.buys?s.buys.length+" buys":"",s.money!=null?Math.round(s.money)+" credits":"")}' "$f" ;; esac ;;
  *) sed -n 2,17p "$0" ;;
esac
