"""THE NEAREST MARKS TABLE (owner, 2026-10-25, v7: "this needs to include getting the nearest new zero sum table / Then balancing
so each tower hits those benchmarks"): from a countermx run (the same spread build and window marks.py reads), the measured raw marks
(marks.py's double-centred leak gaps / PER_MARK, unrounded), then every integer table of marks that keeps the marks rules:
  - EVERY TYPE COLUMN IS ONE 2-CHECK, THREE 1-CHECKS, ONE DASH, ONE XX, ONE XXX (owner, 2026-10-29: "one 2check, 3 1check, one -, one
    x, one xx", then "rows sum to the same number, cols sum to the same number" - that column summed to +2, 8 over 7 rows; option A, the
    x's one deeper, sums to 0: "A"), so every row and every column sums to 0
  - every tower checks two or more types (owner, 2026-10-29: "each row needs at least two checked types"; 2026-10-19: "beats or at
    least helps" two types or more)
  - no two towers alike (owner, 2026-10-23: "no duplicates")
ranked by distance to the raw marks (sum of |target - raw - COL_MEAN|: the raw marks are centred, a column's marks average +2/7),
then by cells off the measured (rounded) marks. The nearest is the benchmark the towers are balanced to (mark-target.json).
usage: python3 marktarget.py <countermx output> [options=5]"""
import heapq
import itertools
import json
import os
import pathlib
import re
import subprocess
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
PER_MARK = 20  # as marks.py
MIN_CHECKED = 2
# one window a CHAPTER (owner, 2026-10-25: "make countermx consistent at the 4 different game chapters", ARCHITECTURE.md 5.6): the
# target is ONE table for the whole game, so its distance is summed over every window the run holds
by_win, win = {}, None
for line in open(sys.argv[1]):
    h = re.match(r"\s*waves (\d+)-(\d+)", line)
    if h:
        win = f"{h.group(1)}-{h.group(2)}"
    m = re.match(r"\s+([A-Z]+) spread\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if m:
        by_win.setdefault(win, {})[m.group(1).lower()] = dict(zip(TYPES, map(int, m.groups()[1:])))
WINS = list(by_win)
KINDS = list(by_win[WINS[-1]])


def raws_of(leak):
    col = {t: sum(L[t] for L in leak.values()) / len(leak) for t in TYPES}
    out = {}
    for k, L in leak.items():
        D = {t: L[t] - col[t] for t in TYPES}
        mean = sum(D.values()) / 4
        out[k] = [(mean - D[t]) / PER_MARK for t in TYPES]
    return out


RAW = {w: raws_of(by_win[w]) for w in WINS}
raw = {k: [sum(RAW[w][k][i] for w in WINS) / len(WINS) for i in range(4)] for k in KINDS}  # the chapters' mean, for the print
COLUMN = {int(v): int(n) for v, n in (x.split(":") for x in (os.environ.get("MT_COLUMN") or "2:1,1:3,0:1,-2:1,-3:1").split(","))}  # one type column's marks (owner, 2026-10-29); env MT_COLUMN
# EQUAL SUMS (owner, 2026-10-29: "rows sum to the same number, cols sum to the same number, whatever it is"): 4 columns x their sum = 7 rows x
# theirs, so every row sums to 4 x the column's sum / 7 - a whole number only when the column's sum is a multiple of 7
ROW_SUM = 4 * sum(v * n for v, n in COLUMN.items()) / 7
COL_MEAN = sum(v * n for v, n in COLUMN.items()) / sum(COLUMN.values())
ROWS = [r for r in itertools.product(sorted(COLUMN), repeat=4) if sum(1 for x in r if x > 0) >= MIN_CHECKED and sum(r) == ROW_SUM]
if ROW_SUM != int(ROW_SUM):
    sys.exit(f"column sums to {sum(v * n for v, n in COLUMN.items())}: rows cannot all sum to the same whole number (4 x it / 7 = {ROW_SUM:.2f})")
def dist(k, r):
    return sum(abs(a - b - COL_MEAN) for w in WINS for a, b in zip(r, RAW[w][k]))



# BY DESIGN (owner rules the measured raw marks cannot know): CRR is NOT meant to beat armor (owner, 2026-10-27: "CRR isn't supposed
# to be good vs armor anyway") - its armor mark stays below 0
# - and every MAIN counter of the counter matrix (COUNTERS, aspira-defs.js; ARCHITECTURE.md 4.6, pillar 6) checks its type: +1 or more
DEFS = (pathlib.Path(__file__).resolve().parents[2] / "web" / "aspira-defs.js").read_text()
MAIN = {t: re.findall(r'"(\w+)"', m) for t, m in re.findall(r'(\w+): \{ main: \[([^\]]*)\]', re.search(r"const COUNTERS = (\{.*?\}) \};", DEFS).group(1) + " }")}
NEED = {k: [TYPES.index(t) for t, ks in MAIN.items() if k in ks] for k in KINDS}
# ARC's SHAPE (owner, 2026-10-28: ARC is +swarm +armor -fast -shield - its mechanic): checks swarm and armor, x's fast and shield
def ARC_SHAPE(r):
    return r[0] > 0 and r[3] > 0 and r[1] < 0 and r[2] < 0



DESIGN = {k: (lambda need, k: lambda r: all(r[i] >= 1 for i in need) and not (k == "crr" and r[TYPES.index("armor")] >= 0) and (k != "arc" or ARC_SHAPE(r)))(NEED[k], k) for k in KINDS}
print("main counters (must check):", {t: ks for t, ks in MAIN.items()})
cand = {k: sorted((r for r in ROWS if DESIGN.get(k, lambda r: True)(r)), key=lambda r: dist(k, r)) for k in KINDS}
best_rest = [sum(dist(k, cand[k][0]) for k in KINDS[i:]) for i in range(len(KINDS))] + [0]

N = int(sys.argv[2]) if len(sys.argv) > 2 else 5
top = []  # max-heap by cost (negated) of the N best tables


def dfs(i, rows, cost, sums):
    if len(top) == N and cost + best_rest[i] > -top[0][0] + 1e-9:
        return
    if i == len(KINDS):
        if all(s == COLUMN for s in sums):
            heapq.heappush(top, (-cost, rows[:]))
            if len(top) > N:
                heapq.heappop(top)
        return
    for r in cand[KINDS[i]]:
        c = cost + dist(KINDS[i], r)
        if len(top) == N and c + best_rest[i + 1] > -top[0][0] + 1e-9:
            break  # candidates are sorted: nothing after this row is cheaper
        if r in rows:
            continue
        ns = [{**c0, x: c0.get(x, 0) + 1} for c0, x in zip(sums, r)]
        if any(c0[x] > COLUMN[x] for c0, x in zip(ns, r)):
            continue  # that mark is used up in this column
        rows.append(r)
        dfs(i + 1, rows, c, ns)
        rows.pop()


dfs(0, [], 0.0, [{}, {}, {}, {}])
# the MEASURED marks (marks.py's rounding, the ones on the build card now): what a balance job moves a tower off
out = subprocess.run([sys.executable, str(pathlib.Path(__file__).with_name("marks.py")), sys.argv[1]], capture_output=True, text=True).stdout
meas = json.loads([ln for ln in out.splitlines() if ln.startswith("{")][-1])


def moved(rows):
    return sum(1 for k, r in zip(KINDS, rows) for t, x in zip(TYPES, r) if x != meas[k][t])


def fmt(r):
    return " ".join(f"{x:+d}" if x else " 0" for x in r)


print(f"chapters {', '.join(WINS)}; raw marks (measured, unrounded, the chapters' mean):", " ".join(TYPES), "  | measured marks")
for k in KINDS:
    print(f"  {k.upper()}  " + " ".join(f"{x:+.1f}" for x in raw[k]) + "  | " + fmt([meas[k][t] for t in TYPES]))
for n, (neg, rows) in enumerate(sorted(top, key=lambda x: (round(-x[0], 6), moved(x[1])))):
    print(f"\noption {n + 1}: distance {-neg:.2f}, {moved(rows)} cells off the measured marks" + (" (THE TARGET)" if n == 0 else ""))
    for k, r in zip(KINDS, rows):
        off = [f"{t} {meas[k][t]:+d}->{x:+d}" for t, x in zip(TYPES, r) if x != meas[k][t]]
        print(f"  {k.upper()}  {fmt(r)}" + (f"   to move: {', '.join(off)}" if off else ""))
