"""screen.py RUN.jsonl GATE [BASE.jsonl] - the test ladder's stop rule (owner, 2026-11-05: "why do all tests run for 7 hours?").

Reads a players3b run (shuffled order: any prefix is an unbiased sample) and says whether its win rate is DECISIVELY above or below
GATE (a share, e.g. 0.5): more than 2 standard errors away, SE = sqrt(p (1 - p) / n) - at p 0.5 that is 7.1 points at 50 games,
5.0 at 100, 3.5 at 200. Prints the running read at 25-game steps and the verdict: PASS, FAIL or RUN ON (near the line: run more).
With BASE, also the same-trio-and-seed difference (paired: much less noise than two independent rates).
"""
import json
import math
import sys


def load(p):
    with open(p) as fh:
        return [json.loads(line)["res"] for line in fh]


def read(rs, gate):
    n = len(rs)
    if not n:
        return "no games"
    p = sum(r["won"] for r in rs) / n
    se = math.sqrt(max(p * (1 - p), 0.05) / n)
    z = (p - gate) / se
    verdict = "PASS" if z > 2 else "FAIL" if z < -2 else "RUN ON"
    return f"{n:3} games  won {100 * p:5.1f}%  SE {100 * se:4.1f}  gate {100 * gate:.0f}%  z {z:+.1f}  {verdict}"


if __name__ == "__main__":
    rs, gate = load(sys.argv[1]), float(sys.argv[2])
    for k in range(25, len(rs), 25):
        print("  ", read(rs[:k], gate))
    print("=>", read(rs, gate))
    if len(sys.argv) > 3:
        base = {(r["trio"], r["seed"]): r["won"] for r in load(sys.argv[3])}
        pairs = [(r["won"], base[(r["trio"], r["seed"])]) for r in rs if (r["trio"], r["seed"]) in base]
        if pairs:
            d = [a - b for a, b in pairs]
            m = sum(d) / len(d)
            sd = math.sqrt(sum((x - m) ** 2 for x in d) / max(1, len(d) - 1) / len(d))
            print(f"paired vs base: {len(pairs)} games, {100 * m:+.1f} points (SE {100 * sd:.1f})")
