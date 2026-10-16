import json
import math
import sys

# per-trio score from a tribal run: a win = 120 + lives left, a loss = the wave reached (mean of its games)
ALL = ["arc", "frz", "sol", "acd", "grv", "car"]
rows = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
jobs = [(r["args"]["trio"], r["args"]["seed"]) for r in rows]
res = [r["res"] for r in rows]
DEAD = [
    {"arc", "frz", "car"},
    {"sol", "acd", "car"},
    {"arc", "acd", "grv"},
    {"frz", "sol", "grv"},
]  # unwinnable by design
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
