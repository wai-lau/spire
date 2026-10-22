"""THE DESIGN TABLE (owner, 2026-10-21: "split each type into 7 marks -3 -2 -1 0 1 2 3 / each tower needs to add up to 0"; "create a
NEW zero sum table that requires the fewest changes from the current set / if there are many answers, propose the options"): from the
MEASURED ranks (typepower.mjs: per enemy type, the seven kinds ranked +3 .. -3), every table whose columns are each a permutation of
-3..3 and whose rows each sum to 0, with the FEWEST cells outside their measured band (ties = one band, TIE); ties listed, then ordered by how far
outside they land. Each such cell is a balance job.
usage: python3 zerosum.py <typepower output> [max options=12]"""
import itertools
import re
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
score = {}
for line in open(sys.argv[1]):
    m = re.match(r"([A-Z]{3})\s+" + r"\s+".join([r"([\d.]+) \([+-]?\d\)"] * 4), line)
    if m:
        score[m.group(1)] = tuple(float(x) for x in m.groups()[1:])
# TIES ARE ONE BAND (owner, 2026-10-21: "if the gap is tiny between them, then they are in the same band"): down each type the kinds sorted
# by score split wherever two neighbours are TIE points or more apart (TIE 4: two standard errors of a difference of two kinds' means
# at 2 seeds - per-game sd 8.2 over 30 games); a kind in a band may take ANY rank the band spans, at no cost
TIE = float(__import__("os").environ.get("TIE", 4))
meas = {k: [] for k in score}
for j in range(4):
    order = sorted(score, key=lambda k: -score[k][j])
    bands, cur = [], [order[0]]
    for a, b in zip(order, order[1:]):
        if score[a][j] - score[b][j] >= TIE:
            bands.append(cur)
            cur = []
        cur.append(b)
    bands.append(cur)
    at = 0
    for band in bands:
        ranks = set(range(3 - at, 3 - at - len(band), -1))
        for k in band:
            meas[k].append(ranks)
        at += len(band)
K = list(meas)
assert len(K) == 7, f"need 7 kinds, got {K}"
MAXOPT = int(sys.argv[2]) if len(sys.argv) > 2 else 12
VALS = [3, 2, 1, 0, -1, -2, -3]


def col_options(j):
    """every permutation of -3..3 down column j: (cells outside their measured band, how far outside, the column)"""
    base = [meas[k][j] for k in K]
    out = []
    for p in itertools.permutations(VALS):
        miss = [min(abs(a - r) for r in b) for a, b in zip(p, base)]
        out.append((sum(1 for x in miss if x), sum(miss), p))
    return sorted(out)


def half(a, b, sign, bound):
    """pairs of column options changing at most `bound` cells, by the rows' partial sums; every pair kept"""
    out = {}
    for ca, da, pa in a:
        if ca > bound:
            break
        for cb, db, pb in b:
            if ca + cb > bound:
                break
            out.setdefault(tuple(sign * (x + y) for x, y in zip(pa, pb)), []).append(((ca + cb, da + db), pa, pb))
    return out


cols = [col_options(j) for j in range(4)]
for bound in range(0, 29):  # the TOTAL cells changed, widened until a zero-sum table exists - so no lighter table is missed
    A, B = half(cols[0], cols[1], 1, bound), half(cols[2], cols[3], -1, bound)
    sols = [((x[0][0] + y[0][0], x[0][1] + y[0][1]), (x[1], x[2], y[1], y[2])) for key, la in A.items() if key in B for x in la for y in B[key] if x[0][0] + y[0][0] <= bound]
    if sols:
        break
sols.sort()
fewest = sols[0][0][0]
top = [s for s in sols if s[0][0] == fewest]
print(f"measured ranks -> zero-sum tables with the fewest changes: {fewest} cells ({len(top)} tables)")
for n, ((ch, dist), cols_) in enumerate(top[:MAXOPT], 1):
    print(f"\noption {n}: {ch} cells changed, total move {dist}")
    print("kind  " + "".join(t.rjust(12) for t in TYPES))
    for i, k in enumerate(K):
        cells = []
        for j in range(4):
            d, m = cols_[j][i], meas[k][j]
            band = f"{max(m):+d}" if len(m) == 1 else f"{min(m):+d}..{max(m):+d}"
            cells.append((f"{d:+d}" + ("" if d in m else f"<{band}")).rjust(12))
        print(k.ljust(6) + "".join(cells))
print("\nmeasured bands (TIE %g):" % TIE)
for k in K:
    print(k.ljust(6) + "".join((f"{max(m):+d}" if len(m) == 1 else f"{min(m):+d}..{max(m):+d}").rjust(12) for m in meas[k]))
