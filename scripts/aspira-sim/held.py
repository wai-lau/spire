# THE BUILD A PERFECT PLAYER HOLDS (plan 3 Task 5 Step 1, owner 2026-10-25: "make countermx consistent at the 4 different game
# chapters"): from trioplan's buy logs, per chapter window and per tower, its MAIN axis (the one most trios buy deepest by the window's
# start) and the other two, each at its mean tier over every trio holding the tower, rounded. Prints countermx's HELD JSON.
# usage: python3 held.py <trioplan out.jsonl> [windows=13-19,41-49,71-79,101-109] > held.json
import collections
import json
import sys

WINDOWS = (sys.argv[2] if len(sys.argv) > 2 else "13-19,41-49,71-79,101-109").split(",")
runs = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
held = {}
for win in WINDOWS:
    start = int(win.split("-")[0])
    per = collections.defaultdict(list)  # kind -> [{axis: tier}] one per trio
    for r in runs:
        tiers = collections.defaultdict(lambda: collections.defaultdict(int))
        for k in r["trio"].split("+"):
            tiers[k]
        for b in r["buys"]:
            w, rest = b.split(":", 1)
            kind, ax = rest.split(".", 1)
            ax = ax.rstrip("0123456789")
            if ax != "build" and int(w) < start:  # "build": the tower placed, not an axis
                tiers[kind][ax] += 1
        for k, t in tiers.items():
            per[k].append(dict(t))
    out = {}
    for kind, builds in per.items():
        mains = collections.Counter(max(b, key=b.get) for b in builds if b)
        axes = sorted({a for b in builds for a in b})
        if not mains:
            out[kind] = {}
            continue
        main = mains.most_common(1)[0][0]
        # by RANK, not axis id: a trio's deepest axis is its main, wherever it sits in the tree
        ranked = [sorted(b.values(), reverse=True) + [0, 0, 0] for b in builds]
        mean = [round(sum(r[i] for r in ranked) / len(ranked)) for i in range(3)]
        rest = sorted((a for a in axes if a != main), key=lambda a: -sum(b.get(a, 0) for b in builds))
        out[kind] = {a: v for a, v in zip([main] + rest, mean) if v}
    held[win] = out
print(json.dumps(held))
