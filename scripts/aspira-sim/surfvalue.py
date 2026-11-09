"""teamsurf.mjs output -> surface.json: what one more tier on each path is worth, by enemy type, for the adaptive buyer (sim-buyer.mjs).
usage: python3 surfvalue.py <teamsurf jsonl>... [-o surface.json]

THE BEST BUILD FOR THE SITUATION (owner, 2026-11-09: "simulated players should always go for the best build depending on their
situation (whichever helps the most with the type they are having difficulty with)"). Per tower, per measured point level P (3 / 6 / 9 /
13), per enemy type, from the team surface (every legal build beside two partners, waves forced to one type, HP calibrated per type):
  g[P][type]     the tower's own gain a point: its spread build at P vs the spread build one point up (4 / 7 / 10, teamsurf.mjs ONE_UP),
                 on the same waves and HP (levels are not comparable to each other: each has its own waves and calibration); 13 uses 9's
  m[P][id][type] a point moved INTO path id from another path, at P points: the mean leak drop (teamsurf.py's marginal, per type)
A tier on path id at P points is worth g + m. The buyer reads the level nearest the tower's points after the buy (no interpolation)."""
import json
import statistics as st
import sys
from collections import defaultdict

T = ["swarm", "fast", "shield", "armor"]
args = sys.argv[1:]
out = "surface.json"
if "-o" in args:
    i = args.index("-o")
    out = args[i + 1]
    args = args[:i] + args[i + 2:]
agg = defaultdict(lambda: [0, 0])
for f in args:
    for line in open(f):
        r = json.loads(line)
        a = agg[(r["kind"], r["points"], r["build"], r["type"])]
        a[0] += r["leaked"]
        a[1] += r["spawned"]
leak = {k: 100 * v[0] / max(1, v[1]) for k, v in agg.items()}
kinds = sorted({k[0] for k in leak})
res = {}
ONE_UP = {3: 4, 6: 7, 9: 10}


def spr(P):
    """the spread build at P points (teamsurf.mjs spr)"""
    return "/".join(map(str, [P // 3 + (P % 3 > 0), P // 3 + (P % 3 > 1), P // 3]))


for kind in kinds:
    levels = sorted({k[1] for k in leak if k[0] == kind} - set(ONE_UP.values()))
    builds = {P: sorted({k[2] for k in leak if k[0] == kind and k[1] == P}) for P in levels}
    res[kind] = {}
    gain = {}
    for P, Q in ONE_UP.items():
        if all((kind, x, spr(x), t) in leak for x in (P, Q) for t in T):
            gain[P] = {t: round(leak[(kind, P, spr(P), t)] - leak[(kind, Q, spr(Q), t)], 2) for t in T}
    for P in levels:
        g = gain.get(P) or gain.get(max([q for q in gain if q <= P], default=None)) or {t: 0 for t in T}
        m = {}
        for i in range(3):
            d = {t: [] for t in T}
            for b in builds[P]:
                x = list(map(int, b.split("/")))
                for jj in range(3):
                    if jj == i or x[jj] == 0:
                        continue
                    y = x[:]
                    y[i] += 1
                    y[jj] -= 1
                    if y[i] > 5 or y.count(5) > 1:
                        continue
                    yb = "/".join(map(str, y))
                    for t in T:
                        if (kind, P, yb, t) in leak and (kind, P, b, t) in leak:
                            d[t].append(leak[(kind, P, b, t)] - leak[(kind, P, yb, t)])
            m[i] = {t: round(st.mean(d[t]), 2) if d[t] else 0 for t in T}
        res[kind][str(P)] = {"g": g, "m": m}
json.dump(res, open(out, "w"), indent=1)
print(out, {k: sorted(v, key=int) for k, v in res.items()})
