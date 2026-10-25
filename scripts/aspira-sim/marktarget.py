"""THE NEAREST ZERO-SUM MARKS TABLE (owner, 2026-10-25, v7: "this needs to include getting the nearest new zero sum table / Then balancing
so each tower hits those benchmarks"): from a countermx run (the same spread build and window marks.py reads), the measured raw marks
(marks.py's double-centred leak gaps / PER_MARK, unrounded), then every integer table of marks -3..3 that keeps the marks rules:
  - each tower's row sums to 0 and each enemy type's column sums to 0 (owner, 2026-10-23: "Col and row need to sum to 0")
  - no two towers alike (owner, 2026-10-23: "no duplicates")
  - every tower above 0 on two or more types (owner, 2026-10-19: "beats or at least helps" two types or more)
ranked by distance to the raw marks (sum of |target - raw|), then by cells off the measured (rounded) marks. The nearest is the v7
benchmark the towers are balanced to (plan 3 Task 5); its ties are printed with it.
usage: python3 marktarget.py <countermx output> [options=5]"""
import heapq
import itertools
import json
import pathlib
import re
import subprocess
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
PER_MARK = 20  # as marks.py
MIN_CHECKED = 2
leak = {}
for line in open(sys.argv[1]):
    m = re.match(r"\s+([A-Z]+) spread\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if m:
        leak[m.group(1).lower()] = dict(zip(TYPES, map(int, m.groups()[1:])))
KINDS = list(leak)
col = {t: sum(L[t] for L in leak.values()) / len(leak) for t in TYPES}
raw = {}
for k, L in leak.items():
    D = {t: L[t] - col[t] for t in TYPES}
    mean = sum(D.values()) / 4
    raw[k] = [(mean - D[t]) / PER_MARK for t in TYPES]
ROWS = [r for r in itertools.product(range(-3, 4), repeat=4) if sum(r) == 0 and sum(1 for x in r if x > 0) >= MIN_CHECKED]
def dist(k, r):
    return sum(abs(a - b) for a, b in zip(r, raw[k]))



cand = {k: sorted(ROWS, key=lambda r: dist(k, r)) for k in KINDS}
best_rest = [sum(dist(k, cand[k][0]) for k in KINDS[i:]) for i in range(len(KINDS))] + [0]

N = int(sys.argv[2]) if len(sys.argv) > 2 else 5
top = []  # max-heap by cost (negated) of the N best tables


def dfs(i, rows, cost, sums):
    if len(top) == N and cost + best_rest[i] > -top[0][0] + 1e-9:
        return
    if i == len(KINDS):
        if all(s == 0 for s in sums):
            heapq.heappush(top, (-cost, rows[:]))
            if len(top) > N:
                heapq.heappop(top)
        return
    left = len(KINDS) - i - 1
    for r in cand[KINDS[i]]:
        c = cost + dist(KINDS[i], r)
        if len(top) == N and c + best_rest[i + 1] > -top[0][0] + 1e-9:
            break  # candidates are sorted: nothing after this row is cheaper
        if r in rows:
            continue
        ns = [a + b for a, b in zip(sums, r)]
        if any(abs(s) > 3 * left for s in ns):
            continue  # the rows left cannot bring this column back to 0
        rows.append(r)
        dfs(i + 1, rows, c, ns)
        rows.pop()


dfs(0, [], 0.0, [0, 0, 0, 0])
# the MEASURED marks (marks.py's rounding, the ones on the build card now): what a balance job moves a tower off
out = subprocess.run([sys.executable, str(pathlib.Path(__file__).with_name("marks.py")), sys.argv[1]], capture_output=True, text=True).stdout
meas = json.loads([ln for ln in out.splitlines() if ln.startswith("{")][-1])


def moved(rows):
    return sum(1 for k, r in zip(KINDS, rows) for t, x in zip(TYPES, r) if x != meas[k][t])


def fmt(r):
    return " ".join(f"{x:+d}" if x else " 0" for x in r)


print("raw marks (measured, unrounded):", " ".join(TYPES), "  | measured marks")
for k in KINDS:
    print(f"  {k.upper()}  " + " ".join(f"{x:+.1f}" for x in raw[k]) + "  | " + fmt([meas[k][t] for t in TYPES]))
for n, (neg, rows) in enumerate(sorted(top, key=lambda x: (round(-x[0], 6), moved(x[1])))):
    print(f"\noption {n + 1}: distance {-neg:.2f}, {moved(rows)} cells off the measured marks" + (" (THE TARGET)" if n == 0 else ""))
    for k, r in zip(KINDS, rows):
        off = [f"{t} {meas[k][t]:+d}->{x:+d}" for t, x in zip(TYPES, r) if x != meas[k][t]]
        print(f"  {k.upper()}  {fmt(r)}" + (f"   to move: {', '.join(off)}" if off else ""))
