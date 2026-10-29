import itertools
import json
import math
import pathlib
import re
import sys

# per-trio score from a tribal run: a win = 120 + lives left, a loss = the wave reached (mean of its games)
ALL = ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]
rows = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
jobs = [(r["args"]["trio"], r["args"]["seed"]) for r in rows]
res = [r["res"] for r in rows]
# DESIGNED DEATHS (owner, 2026-10-21: "trios designed to lose are the ones missing a counter / the list with designated losers needs
# to be updated"): a trio with no CHECK (a mark above 0) on some enemy type, read from the build cards' VS_MARKS - so it follows every
# marks refresh (it was a hand list of four from the six-tower square, 2026-10-16, gone stale as the marks moved and IFR came)
CHOOSER = pathlib.Path(__file__).resolve().parents[2] / "web" / "aspira-chooser.js"
VS = json.loads(re.sub(r"(\w+):", r'"\1":', re.search(r"const VS_MARKS = (\{.*?\}) \};", CHOOSER.read_text()).group(1) + " }"))
TYPES = ["swarm", "fast", "shield", "armor"]
DEAD = [set(t) for t in itertools.combinations(ALL, 3) if any(max(VS.get(k, {}).get(e, 0) for k in t) <= 0 for e in TYPES)]
score = {}
for (t, s), r in zip(jobs, res):
    v = 120 + r["lives"] if r["won"] else r["wave"]
    score.setdefault(tuple(t), []).append(v)
score = {t: sum(v) / len(v) for t, v in score.items()}
count = {t: s for t, s in score.items() if not (set(t) in DEAD and s < 120)}  # a designed death that died: neutral
mean = sum(count.values()) / len(count)
f = {}
for k in ALL:
    rs = [mean / s for t, s in count.items() if k in t]
    f[k] = math.exp(sum(map(math.log, rs)) / len(rs))
print("mean score", round(mean, 1), "(a win = 120 + lives, a loss = wave)")
for t, s in sorted(score.items(), key=lambda x: -x[1]):
    print("+".join(t).upper().ljust(12), round(s, 1), "(designed death, neutral)" if t not in count else "")
print("factor:", {k: round(v, 3) for k, v in f.items()})
