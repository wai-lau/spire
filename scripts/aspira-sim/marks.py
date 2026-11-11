# check / x marks per tower from a countermx run (SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69): leak % per type -> checks on the types it
# beats, x's on the ones it leaks, each row and each column summing to 0 (see PER_MARK)
# usage: python3 marks.py <countermx.out> [--write] [--focus] [--band [--band-total N]]   --write puts the result into VS_MARKS (web/aspira-chooser.js) - run it after
# EVERY balance patch (owner, 2026-10-18: "update the checks and xs here whenever you make a balance patch")
# FIVE LEVELS (owner, 2026-11-06: "most important marks are 9 and 13, but 0 3 and 6 should never drift more than +/- 1 point away from target
# marks"): countermx at POINTS 0 / 3 / 6 / 9 / 13. 9 (spread) writes the card; 13 is read with --focus (no SPREAD_ONLY: each tower's
# one-axis-maxed rows - V + IV + IV, every axis in turn - averaged into one row, the capstone check); 0 / 3 / 6 with --band: any cell more than
# BAND off its mark-target.json cell prints RULE FAIL (a balance failure, like the two-checks rule); BAND is 1 at 3 and 6 points and 2 at 0 points
# (owner, 2026-11-07: "1C" - a fresh tower's row is too flat to hold +/-1), read from the run's "(N pts)" header
import datetime
import json
import pathlib
import re
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
# THE FOUR CHAPTERS (owner, 2026-10-25: "make countermx consistent at the 4 different game chapters" - ARCHITECTURE.md 5.6's
# sections): a countermx run may hold one window a chapter (WINDOWS=13-19:p,41-49:p,71-79:p,101-109:p). Each window's marks print
# on their own, then whether every chapter agrees; the build card's marks (--write) come from the leaks POOLED over the windows
FOCUS, BAND = "--focus" in sys.argv[2:], 1
by_win, win = {}, None
for line in open(sys.argv[1]):
    h = re.match(r"\s*waves (\d+)-(\d+)", line)
    if h:
        win = f"{h.group(1)}-{h.group(2)}"
    m = re.match(r"\s+([A-Z]+) ([a-z]+)\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if m and (m.group(2) == "spread") != FOCUS:
        rows = by_win.setdefault(win, {}).setdefault(m.group(1).lower(), [])
        rows.append(dict(zip(TYPES, map(int, m.groups()[2:]))))
for w in by_win:  # a tower's row: its spread build, or (--focus) the mean of its focused builds
    by_win[w] = {k: {t: sum(r[t] for r in rs) / len(rs) for t in TYPES} for k, rs in by_win[w].items()}


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


def marks_of(leak):
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
    return marks, raws


windows = list(by_win)
leak = {k: {t: sum(by_win[w][k][t] for w in windows) / len(windows) for t in TYPES} for k in by_win[windows[-1]]}  # pooled
per_win = {w: marks_of(by_win[w])[0] for w in windows}
if len(windows) > 1:
    for w in windows:
        print(f"waves {w}:", " | ".join(f"{k.upper()} " + " ".join(f"{m[t]:+d}" for t in TYPES) for k, m in per_win[w].items()))
    bad = [k for k in leak if len({tuple(per_win[w][k][t] for t in TYPES) for w in windows}) > 1]
    print("CHAPTERS AGREE" if not bad else "CHAPTERS DIFFER: " + ", ".join(k.upper() for k in bad))
marks, raws = marks_of(leak)
for k, m in marks.items():
    print(k.upper(), {t: round(v) for t, v in leak[k].items()}, "->", " ".join(f"{t}:{'+' if c > 0 else ''}{c}" for t, c in m.items() if c))
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

# THE BAND (owner, 2026-11-06 / 2026-11-07, above): with --band every cell within BAND of the target - 2 for a 0-point run, else 1
if "--band" in sys.argv[2:]:
    pts = re.search(r"\((\d+) pts\)", open(sys.argv[1]).read())
    BAND = 2 if pts and int(pts.group(1)) == 0 else 1
    # THE 13-POINT BAND (owner, 2026-11-10: "hey for 13 points, allow up to +1 on any type (up to total of +2)"): --band-total N caps a
    # tower's summed gap; marks5.sh reads 13 points with --focus --band --band-total 2 (each type within 1, at most 2 off in all)
    BAND_TOTAL = int(sys.argv[sys.argv.index("--band-total") + 1]) if "--band-total" in sys.argv else None
    tgt = json.loads((pathlib.Path(__file__).resolve().parent / "mark-target.json").read_text())
    for k, m in marks.items():
        off = [f"{t} {m[t]:+d} vs {tgt[k][i]:+d}" for i, t in enumerate(TYPES) if k in tgt and abs(m[t] - tgt[k][i]) > BAND]
        if off:
            print(f"RULE FAIL: {k.upper()} outside the +/-{BAND} band: " + ", ".join(off))
        tot = sum(abs(m[t] - tgt[k][i]) for i, t in enumerate(TYPES)) if k in tgt else 0
        if BAND_TOTAL is not None and tot > BAND_TOTAL:
            print(f"RULE FAIL: {k.upper()} total gap {tot} over {BAND_TOTAL} (the sum of |mark - target| over the four types)")

if "--write" in sys.argv[2:]:
    assert not FOCUS, "the card's marks come from the spread rows (9 points), never --focus"
    web = pathlib.Path(__file__).resolve().parents[2] / "web"
    chooser, ver = web / "aspira-chooser.js", (web / "aspira-version.txt").read_text().strip()
    order = ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]
    body = ", ".join(f"{k}: {{ " + ", ".join(f"{t}: {marks[k][t]}" for t in TYPES if marks[k][t]) + " }" for k in order if k in marks)
    line = f"const VS_MARKS = {{ {body} }}; /* regenerated {datetime.date.today()} v{ver} (marks.py --write, countermx " + ",".join(windows) + ", pooled) */"
    src = chooser.read_text()
    new, n = re.subn(r"^const VS_MARKS = .*$", lambda _: line, src, count=1, flags=re.M)
    assert n == 1, "VS_MARKS line not found"
    chooser.write_text(new)
    print("wrote", chooser)
