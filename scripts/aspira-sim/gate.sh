#!/bin/bash
# gate.sh <tree-new> <tree-live> <outdir> [patch.js]: THE SPIRE's balance ship gate, Old (live) vs New (candidate).
# Each tree is a checkout whose scripts/aspira-sim and web/ are used; [patch.js] is code run after the game loads (ASPIRA_PATCH).
# SAMPLING RULE (owner, 2026-11-24): fewer samples when exploring, more when preparing to ship - this is the SHIP size:
# five-level grid marks on 32 seeds (8 blocks x 4), the duo rule, every trio on 8 seeds. NB tribal.mjs SEEDS is a LIST
# ("1,2" = seeds 1 and 2); SEEDS=2 means seed 2 only (the bug that let the gate run on one game a team).
# Restart-safe: a finished output file is skipped. env: POOL_WORKERS (10), GATE_DRY=1 (print commands only),
# GATE_SMALL=1 (plumbing check: 1 block, 3 towers, level 0 only, trio seed 1, duo 1 seed).
set -euo pipefail
[ $# -ge 3 ] || { echo "usage: gate.sh <tree-new> <tree-live> <outdir> [patch.js]" >&2; exit 2; }
NEW=$(cd "$1" && pwd); LIVE=$(cd "$2" && pwd); OUT=$(realpath -m "$3"); P=""; [ -n "${4:-}" ] && P=$(cat "$4")
export POOL_WORKERS="${POOL_WORKERS:-10}"
DRY="${GATE_DRY:-}"; SMALL="${GATE_SMALL:-}"
KINDS=arc,frz,sol,acd,grv,crr,ifr; BLOCKS="0 4 8 12 16 20 24 28"; TRIOSEEDS=1,2,3,4,5,6,7,8; DUOSEEDS=4
LEVELS="0 3 6 9 13"
if [ -n "$SMALL" ]; then KINDS=arc,frz,sol; BLOCKS="0"; TRIOSEEDS=1; DUOSEEDS=1; LEVELS="0"; fi
# per-level env: points, windows, countermx extras (docs/architecture/04b-capstones-marks.md, the five level commands)
lvl() { case $1 in
  0) echo "POINTS=0 WINDOWS=31-39 N=3 SPREAD_ONLY=1";; 3) echo "POINTS=3 WINDOWS=75-85 N=3 SPREAD_ONLY=1";;
  6) echo "POINTS=6 WINDOWS=91-99 N=3 SPREAD_ONLY=1";; 9) echo "POINTS=9 WINDOWS=101-109,111-119 SPREAD_ONLY=1";;
  13) echo "POINTS=13 WINDOWS=111-119 N=1";; esac; }
flags() { case $1 in 0|3|6) echo "--band";; 9) echo "";; 13) echo "--focus --band --band-total 2";; esac; }

# run <tree> <outfile> <command...>: in the tree's sim dir, nice, skip if finished, write via .tmp
run() {
  local tree=$1 out=$2; shift 2
  if [ -n "$DRY" ]; then echo "[$tree] $* > $out"; return; fi
  [ -s "$out" ] && { echo "skip $out" >&2; return; }
  local pp=""; [ "$SIDE" = new ] && pp=$P  # the patch is the CANDIDATE's: live runs unpatched
  (cd "$tree/scripts/aspira-sim" && nice -n 10 env KINDS="$KINDS" ASPIRA_WEB=../../web ASPIRA_PATCH="$pp" "$@" > "$out.tmp") && mv "$out.tmp" "$out"
}
for side in new live; do
  tree=$NEW; [ $side = live ] && tree=$LIVE; SIDE=$side
  d=$OUT/$side; mkdir -p "$d"
  for L in $LEVELS; do for B in $BLOCKS; do
    # shellcheck disable=SC2046
    run "$tree" "$d/m$L-s$B.out" env $(lvl "$L") DIFF=grid SEED0="$B" node countermx.mjs 4 2>/dev/null
  done; done
  dp=""; [ $side = new ] && dp=$P
  run "$tree" "$d/duo.out" env DUO_GRID="{\"$side\": $(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$dp")}" node duo0.mjs "$DUOSEEDS"
  # one file a seed: a reset keeps every finished seed (2026-11-24: three WSL resets lost a whole 2 h trio run each)
  for sd in ${TRIOSEEDS//,/ }; do run "$tree" "$d/trio-s$sd.out" env BOSS_SKIP=1 SEEDS="$sd" node tribal.mjs; done
done
[ -n "$DRY" ] && exit 0

# average the seed blocks of each level into one grid table, score it with marks.py
for side in new live; do d=$OUT/$side; for L in $LEVELS; do
  python3 - "$d/m$L-s"*.out > "$d/m$L.out" <<'PY'
import re, sys
tabs = [open(f).read().splitlines() for f in sys.argv[1:]]
for i, line in enumerate(tabs[0]):
    m = re.match(r"(\s+[A-Z]+ [a-z]+\s+)(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if not m: print(line); continue
    cells = [sum(int(re.match(r"\s+[A-Z]+ [a-z]+\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", t[i]).group(j)) for t in tabs) / len(tabs) for j in range(1, 5)]
    print(m.group(1) + "".join(f"{round(c)}%".rjust(8) for c in cells))
PY
  # shellcheck disable=SC2046
  (cd "$NEW/scripts/aspira-sim" && python3 marks.py "$d/m$L.out" --grid $(flags "$L")) > "$d/m$L.marks" 2>&1 || true
done; done

python3 - "$OUT" "$LEVELS" <<'PY'
import re, sys, glob
out, levels = sys.argv[1], sys.argv[2].split()
def fails(side, L):
    try: return sum(1 for l in open(f"{out}/{side}/m{L}.marks") if l.startswith("RULE FAIL"))
    except OSError: return None
def duo(side):
    try: return re.search(r"clean (\d+/\d+)\s+(\w+)", open(f"{out}/{side}/duo.out").read())
    except OSError: return None
def trios(side):
    r = {}
    for fn in sorted(glob.glob(f"{out}/{side}/trio-s*.out")):
        for l in open(fn):
            m = re.match(r"(\S+)\s+won (\d+)/(\d+)", l)
            if m:
                w, g = r.get(m.group(1), (0, 0))
                r[m.group(1)] = (w + int(m.group(2)), g + int(m.group(3)))
    return r
print(f"{'':22}{'Old (live)':>12}{'New (cand.)':>13}")
tot = {"live": 0, "new": 0}
for L in levels:
    o, n = fails("live", L), fails("new", L); tot["live"] += o or 0; tot["new"] += n or 0
    print(f"{'rule fails at ' + L + ' pts':22}{o!s:>12}{n!s:>13}")
print(f"{'rule fails, total':22}{tot['live']:>12}{tot['new']:>13}")
d = {s: duo(s) for s in ("live", "new")}
print(f"{'duo rule':22}" + "".join(f"{(f'{m.group(1)} {m.group(2)}' if m else '-'):>{w}}" for m, w in ((d['live'], 12), (d['new'], 13))))
to, tn = trios("live"), trios("new")
wo, wn = sum(v[0] for v in to.values()), sum(v[0] for v in tn.values())
print(f"{'trio wins':22}{f'{wo}/{sum(v[1] for v in to.values())}':>12}{f'{wn}/{sum(v[1] for v in tn.values())}':>13}")
ch = [(t, to.get(t, (0, 0)), tn[t]) for t in tn if abs(tn[t][0] - to.get(t, (0, 0))[0]) >= 2]
print("trios whose wins changed by 2 or more (Old -> New):" + ("" if ch else " none"))
for t, o, n in sorted(ch): print(f"  {t:14}{o[0]}/{o[1]} -> {n[0]}/{n[1]}")
PY
