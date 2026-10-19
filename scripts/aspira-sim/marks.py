# check / x marks per tower from a countermx run (SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69): leak % per type -> 3 checks and 3 x's a tower,
# checks to the types it beats (leak under its own mean), split by how far under (largest remainder, each such type >= 1)
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
# then centred on the tower's own mean d so each still gets checks and x's; a |d| under NEUTRAL points is no mark either way
NEUTRAL, STOPS = 3, 5
col = {t: sum(L[t] for L in leak.values()) / len(leak) for t in TYPES}
marks = {}
for k, L in leak.items():
    D = {t: L[t] - col[t] for t in TYPES}
    mean = sum(D.values()) / 4
    good = {t: mean - v for t, v in D.items() if v < mean - NEUTRAL}
    bad = {t: v - mean for t, v in D.items() if v > mean + NEUTRAL}
    m = dict.fromkeys(TYPES, 0)
    if good:
        m.update(split(3, good))
    if bad:
        m.update({t: -c for t, c in split(3, bad).items()})
    # a type the tower all but STOPS (leak <= STOPS %) always shows a check, though the others stop it too (ARC's swarm went blank)
    m.update({t: 1 for t in TYPES if not m[t] and L[t] <= STOPS})
    marks[k] = m
    print(k.upper(), L, "->", " ".join(f"{t}:{'+' if c > 0 else ''}{c}" for t, c in m.items() if c))
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
