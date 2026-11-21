#!/usr/bin/env python3
# lsolve.py - the lever-aware balance solver (2026-11-20). Each tower's leak rows at every point level are modelled as the averaged base
# (countermx DIFF=avg tables) plus the sum of lever moves, each move x_l times that lever's measured delta (its sensitivity run minus the noop
# run on the same seed blocks); x_l walks the --steps values (1 = the nudge as measured). Score = 10 x the rule fails over 0/3/6/9/13 points
# + the mark distance to mark-target.json at 6/9/13. Coordinate descent: single lever moves, then pairs within a tower when singles stall.
# It is a linear guess from noisy maps: every move it proposes needs a real 16-seed countermx run before it is kept (ARCHITECTURE §4.8).
# usage: python3 lsolve.py --base DIR --sens DIR [--prefix sb] [--steps -1,-0.5,0,0.5,1] [tower ...]
#   --base: m0.out m3.out m6.out m9.out m13.out; --sens: s-<tower>-noop-<pts>.k.out and s-<tower>-<prefix>-<tower>-<lever>-<pts>.k.out
import argparse
import concurrent.futures as cf
import glob
import itertools
import json
import os
import re
import shutil
import subprocess
import tempfile

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--sens", required=True)
ap.add_argument("--prefix", default="sb")
ap.add_argument("--steps", default="-1,-0.5,0,0.5,1")
ap.add_argument("towers", nargs="*")
A = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp(prefix="lsolve-")
SENS, LP, BASE = os.path.abspath(A.sens), A.prefix, os.path.abspath(A.base)
STEPS = [float(v) for v in A.steps.split(",")]
TYPES = ["swarm", "fast", "shield", "armor"]
LV = {"0": ["--band"], "3": ["--band"], "6": ["--band"], "9": [], "13": ["--focus", "--band", "--band-total", "2"]}
ROW = re.compile(r"(\s+([A-Z]+) ([a-z]+)\s+)(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%")
TGT = json.load(open(os.path.join(HERE, "mark-target.json")))


def rows(path):
    out = []
    for line in open(path):
        m = ROW.match(line)
        if m:
            out.append(((m.group(2), m.group(3)), list(map(int, m.groups()[3:]))))
    return out


base = {lv: open(f"{BASE}/m{lv}.out").read().split("\n") for lv in LV}
towers = [t.lower() for t in A.towers] or sorted({os.path.basename(f).split("-")[1] for f in glob.glob(f"{SENS}/s-*-noop-0.k.out")})
levers = {}
for t in towers:
    for f in sorted(glob.glob(f"{SENS}/s-{t}-{LP}-{t}-*-0.k.out")):
        name = re.sub(r"^s-%s-%s-%s-|-0\.k\.out$" % (t, LP, t), "", os.path.basename(f))
        deltas = {}
        for lv in LV:
            a, b = f"{SENS}/s-{t}-{LP}-{t}-{name}-{lv}.k.out", f"{SENS}/s-{t}-noop-{lv}.k.out"
            if not (os.path.exists(a) and os.path.exists(b)):
                break
            deltas[lv] = [(ka, [x - y for x, y in zip(va, vb)]) for (ka, va), (kb, vb) in zip(rows(a), rows(b)) if ka == kb]
        else:
            levers[(t, name)] = deltas
print("levers:", ", ".join(f"{t}:{n}" for t, n in levers))


def tables(x):
    out = {}
    for lv in LV:
        add = {}
        for key, k in x.items():
            if k:
                for tb, dv in levers[key][lv]:
                    add.setdefault(tb, []).append([k * v for v in dv])
        lines = []
        for line in base[lv]:
            m = ROW.match(line)
            if m and (m.group(2), m.group(3)) in add:
                ds = add[(m.group(2), m.group(3))]
                v = list(map(int, m.groups()[3:]))
                v = [min(100, max(0, round(a + sum(dd[j] for dd in ds)))) for j, a in enumerate(v)]
                line = m.group(1) + "      ".join(f"{q}%" for q in v)
            lines.append(line)
        out[lv] = "\n".join(lines)
    return out


def fails(x):
    tot, per, dist = 0, {}, 0
    for lv, txt in tables(x).items():
        fd, f = tempfile.mkstemp(suffix=".out", dir=TMP)
        os.write(fd, txt.encode())
        os.close(fd)
        r = subprocess.run(["python3", os.path.join(HERE, "marks.py"), f] + LV[lv], capture_output=True, text=True).stdout
        os.unlink(f)
        fl = [q for q in r.split("\n") if "RULE FAIL" in q]
        per[lv] = fl
        tot += len(fl)
        js = [q for q in r.split("\n") if q.startswith('{"')]
        if js and lv in ("6", "9", "13"):
            mk = json.loads(js[-1])
            dist += sum(abs(mk[t][ty] - TGT[t][i]) for t in mk if t in TGT for i, ty in enumerate(TYPES))
    return tot * 10 + dist, per


def best_of(trials):
    with cf.ThreadPoolExecutor(5) as ex:
        return list(ex.map(lambda f: f(), trials))


x = {k: 0 for k in levers}
best, per = fails(x)
print("start: score %d, %d fails" % (best, sum(len(v) for v in per.values())))
for it in range(4):
    moved = False
    for key in levers:
        def single(k, key=key):
            y = dict(x)
            y[key] = k
            return k, fails(y)[0]
        res = best_of([lambda k=k: single(k) for k in STEPS])
        k, n = min(res, key=lambda r: (r[1], abs(r[0])))
        if n < best:
            x[key], best, moved = k, n, True
    if not moved:
        for t in sorted({t for t, _ in levers}):
            for a, b in itertools.combinations([k for k in levers if k[0] == t], 2):
                def pair(kk, a=a, b=b):
                    y = dict(x)
                    y[a], y[b] = kk
                    return kk, fails(y)[0]
                res = best_of([lambda kk=kk: pair(kk) for kk in itertools.product(STEPS, repeat=2)])
                kk, n = min(res, key=lambda r: (r[1], abs(r[0][0]) + abs(r[0][1])))
                if n < best:
                    x[a], x[b] = kk
                    best, moved = n, True
    print(f"pass {it}: score {best}, levers set: " + ", ".join(f"{t}:{n}={k:+g}" for (t, n), k in x.items() if k))
    if not moved or best == 0:
        break
best, per = fails(x)
print("end: %d fails" % sum(len(v) for v in per.values()))
for lv in LV:
    for q in per[lv]:
        print(f"  left {lv} pts: {q[11:110]}")
shutil.rmtree(TMP, ignore_errors=True)
