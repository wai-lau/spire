# check / x marks per tower from a countermx run (spread build, waves 61-69): leak % per type -> 3 checks and 3 x's a tower,
# checks to the types it beats (leak under its own mean), split by how far under (largest remainder, each such type >= 1)
import json
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


marks = {}
for k, L in leak.items():
    mean = sum(L.values()) / 4
    good = {t: mean - v for t, v in L.items() if v < mean}
    bad = {t: v - mean for t, v in L.items() if v > mean}
    m = dict.fromkeys(TYPES, 0)
    if good:
        m.update(split(3, good))
    if bad:
        m.update({t: -c for t, c in split(3, bad).items()})
    marks[k] = m
    print(k.upper(), L, "->", " ".join(f"{t}:{'+' if c > 0 else ''}{c}" for t, c in m.items() if c))
print(json.dumps(marks))
