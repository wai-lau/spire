"""countermx.mjs output -> axis-vs.json: per tower, % leaked of each enemy type with an even spread and with each axis maxed
(three of that tower, the window countermx ran). sim.mjs's adaptive spend (adaptAxis) reads it.
usage: python3 axisvs.py <countermx output> [out=axis-vs.json]"""
import json
import re
import sys

TYPES = ["swarm", "fast", "shield", "armor"]
out = {}
for line in open(sys.argv[1]):
    m = re.match(r"\s+([A-Z]+) (\w+)\s+(\d+)%\s+(\d+)%\s+(\d+)%\s+(\d+)%", line)
    if m:
        kind, build = m.group(1).lower(), m.group(2)
        out.setdefault(kind, {})[build] = dict(zip(TYPES, map(int, m.groups()[2:])))
path = sys.argv[2] if len(sys.argv) > 2 else "axis-vs.json"
json.dump(out, open(path, "w"), indent=1)
print(path, {k: sorted(v) for k, v in out.items()})
