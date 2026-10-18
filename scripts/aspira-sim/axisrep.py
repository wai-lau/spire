import collections
import json
import sys
rows = [json.loads(ln) for ln in open(sys.argv[1]) if ln.strip()]
agg = collections.defaultdict(lambda: [[], [], [], [0, 0]])
for r in rows:
    a = r["args"]
    res = r["res"]
    k = (a["kind"], a["axis"])
    for i, p in enumerate(res["phases"]):
        agg[k][i].append(max(5, p["avg"] - 10 * p["lost"]) if p else 0)
    agg[k][3][0] += res["won"]
    agg[k][3][1] += 1
print("margin = mean per-wave closest approach (u from the core, capped 400) minus 10 u per life lost, over the real trios holding the tower; wins = games won / played")
print("tower axis".ljust(22), "early".rjust(6), "mid".rjust(6), "late".rjust(6), " wins")
last = None
for (kind, axis), v in sorted(agg.items()):
    if last and last != kind:
        print()
    last = kind
    m = [sum(x) / len(x) if x else 0 for x in v[:3]]
    print(f"{kind.upper()} {axis}".ljust(22), *(f"{x:6.0f}" for x in m), f" {v[3][0]}/{v[3][1]}")
