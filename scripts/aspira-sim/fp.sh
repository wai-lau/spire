#!/usr/bin/env bash
# THE REFACTOR FINGERPRINT: plays fp-task.mjs (six fixed-seed games) on a commit and on its parent, each from a clean
# `git archive` of that commit, and compares the output byte for byte. A refactor commit must print IDENTICAL.
# usage: scripts/aspira-sim/fp.sh [commit] [base]   (default: HEAD vs HEAD~1; commit "WORK" = the working tree)
# FP_DEEP=1 also plays fp-deep-task.mjs (each kind maxed vs a wave-90 crowd, sim env): use it for any move or split of game code
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
C=${1:-HEAD}; B=${2:-$C~1}; [ "$C" = WORK ] && B=${2:-HEAD}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
TASK="$PWD/scripts/aspira-sim/fp-task.mjs" DEEP="$PWD/scripts/aspira-sim/fp-deep-task.mjs"
fp() { # $1 commit (or WORK) -> $T/$1.json
  local d="$T/$(echo "$1" | tr '/~^' '___')"; mkdir -p "$d"
  if [ "$1" = WORK ]; then cp -r web scripts "$d"; else git archive "$1" web scripts | tar -x -C "$d"; fi
  cp "$TASK" "$d/scripts/aspira-sim/fp-task.mjs"; cp "$DEEP" "$d/scripts/aspira-sim/fp-deep-task.mjs"
  (cd "$d" && node scripts/aspira-sim/fp-task.mjs && if [ -n "${FP_DEEP:-}" ]; then node scripts/aspira-sim/fp-deep-task.mjs; fi) > "$d.json"; echo "$d.json"
}
a=$(fp "$B"); b=$(fp "$C")
if cmp -s "$a" "$b"; then echo "IDENTICAL $(sha1sum < "$b" | cut -c1-12)  $C vs $B"; else echo "DIFFERENT  $C vs $B"; diff <(tr ',' '\n' < "$a") <(tr ',' '\n' < "$b") | head -20; exit 1; fi
