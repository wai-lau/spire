"""bossrep.py A.jsonl [B.jsonl ...] - per boss wave (12..120) of a players3b bosses-on run.

For each boss: the runs that reached it, the % that ended there, and the % that survived it but lost lives
(the boss rule, ARCHITECTURE.md §5: no boss ends more than ~20% of the runs reaching it).
Lost lives are only recorded from wave 40 on (players3b's `late`), so Star / Empress / Strength show deaths only.
"""
import json
import sys

ARC = {12: "Star", 24: "Empress", 36: "Strength", 48: "Chariot", 60: "Lovers", 72: "Temperance",
       84: "Devil", 96: "Justice", 108: "Judgement", 120: "Death"}


def late_of(r, w):
    return (r.get("late") or {}).get(str(w)) or {}


def report(path):
    with open(path) as fh:
        rs = [json.loads(line)["res"] for line in fh]
    print(path.split("/")[-1], len(rs), "games, won", sum(r["won"] for r in rs))
    for w, name in ARC.items():
        reached = [r for r in rs if r["wave"] >= w]
        died = sum(1 for r in reached if not r["won"] and r["wave"] == w)
        survived = [r for r in reached if r["wave"] > w or r["won"]]
        hurt = [r for r in survived if late_of(r, w).get("lost")]
        lives = sum(late_of(r, w)["lost"] for r in hurt)
        n = max(1, len(reached))
        print(f"  {w:3} {name:10} reached {len(reached):3}  ended {100 * died / n:3.0f}% ({died:2})  "
              f"survived-but-lost {100 * len(hurt) / n:3.0f}% ({len(hurt):2}, {lives:3} lives)")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        report(p)
