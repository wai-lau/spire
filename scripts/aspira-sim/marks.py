# check / x marks per tower from a countermx run (SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69): leak % per type -> checks on the types it
# beats, x's on the ones it leaks, each row and each column summing to 0 (see PER_MARK)
# usage: python3 marks.py <countermx.out> [--write]   --write puts the result into VS_MARKS (web/aspira-chooser.js) - run it after
# EVERY balance patch (owner, 2026-10-18: "update the checks and xs here whenever you make a balance patch")
import datetime
import json
import pathlib
import re
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
leak = {}
for line in open(sys.argv[1]):
    m = re.match(r"\s+([A-Z]+) spread\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if m:
        leak[m.group(1).lower()] = dict(zip(TYPES, map(int, m.groups()[1:])))


def split(n, w):
    tot = sum(w.values())
    raw = {k: n * v / tot for k, v in w.items()}
    out = {k: max(1, int(r)) for k, r in raw.items()}
    while sum(out.values()) > n:
        out[max(out, key=lambda k: out[k] - raw[k])] -= 1
    while sum(out.values()) < n:
        out[max(raw, key=lambda k: raw[k] - out[k])] += 1
    return out


# each type judged against the SIX-TOWER mean for it, not only the tower's own mean (owner, 2026-10-18: FRZ and SOL showed the same
# marks - both stop swarm/fast cold and leak shield, so own-mean ranking tied them): d = (leak - that type's mean over every tower),
# then centred on the tower's own mean d. That DOUBLE-CENTRED table has every row and every column summing to 0 (owner, 2026-10-23:
# "Col and row need to sum to 0"), so the marks are it scaled - one mark per PER_MARK points, as many as the gap earns (a row of
# dashes is fine) - and rounded so each row still sums to 0 (largest remainder). The old fixed 3 checks / 3 x's and the STOPS check
# are gone: both broke the sums.
PER_MARK = 20
col = {t: sum(L[t] for L in leak.values()) / len(leak) for t in TYPES}
marks, raws = {}, {}
for k, L in leak.items():
    D = {t: L[t] - col[t] for t in TYPES}
    mean = sum(D.values()) / 4
    raw = {t: (mean - D[t]) / PER_MARK for t in TYPES}
    m = {t: int(raw[t] // 1) for t in TYPES}
    for t in sorted(TYPES, key=lambda t: m[t] - raw[t])[:-sum(m.values())]:
        m[t] += 1
    marks[k], raws[k] = m, raw
# the columns too: while a type's column is off 0, move one mark between it and a type off the other way, in the row where that
# costs least (the cells nearest their next rounding) - a row keeps its 0
while True:
    cs = {t: sum(m[t] for m in marks.values()) for t in TYPES}
    hi, lo = max(TYPES, key=cs.get), min(TYPES, key=cs.get)
    if cs[hi] <= 0:
        break
    def cost(k):
        m, r = marks[k], raws[k]
        return abs(m[hi] - 1 - r[hi]) - abs(m[hi] - r[hi]) + abs(m[lo] + 1 - r[lo]) - abs(m[lo] - r[lo])
    k = min(marks, key=cost)
    marks[k][hi] -= 1
    marks[k][lo] += 1
for k, m in marks.items():
    print(k.upper(), leak[k], "->", " ".join(f"{t}:{'+' if c > 0 else ''}{c}" for t, c in m.items() if c))
dup = [k for k in marks if [marks[j] for j in marks].count(marks[k]) > 1]
if dup:
    print("DUPLICATE marks:", ", ".join(k.upper() for k in dup))
print(json.dumps(marks))
# RULE (owner, 2026-10-19: "ensure that no tower has only 1 enemy type with checkmarks", "beats or at least helps"): every tower has a check (any size) on at least TWO types -
# a tower with checks on one type alone (CRR, 2026-10-19: shields only) is a balance failure to fix, not a mark to fudge
MIN_CHECKED = 2
lone = {k: [t for t in TYPES if m[t] > 0] for k, m in marks.items() if sum(1 for t in TYPES if m[t] > 0) < MIN_CHECKED}
for k, ts in lone.items():
    print(f"RULE FAIL: {k.upper()} has checks on {len(ts)} enemy type(s) {ts} - every tower needs at least {MIN_CHECKED}")

if "--write" in sys.argv[2:]:
    web = pathlib.Path(__file__).resolve().parents[2] / "web"
    chooser, ver = web / "aspira-chooser.js", (web / "aspira-version.txt").read_text().strip()
    order = ["arc", "frz", "sol", "acd", "grv", "car", "ifr"]
    body = ", ".join(f"{k}: {{ " + ", ".join(f"{t}: {marks[k][t]}" for t in TYPES if marks[k][t]) + " }" for k in order if k in marks)
    line = f"const VS_MARKS = {{ {body} }}; /* regenerated {datetime.date.today()} v{ver} (marks.py --write, countermx 61-69 @6pts) */"
    src = chooser.read_text()
    new, n = re.subn(r"^const VS_MARKS = .*$", lambda _: line, src, count=1, flags=re.M)
    assert n == 1, "VS_MARKS line not found"
    chooser.write_text(new)
    print("wrote", chooser)
