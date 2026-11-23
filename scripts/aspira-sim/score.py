#!/usr/bin/env python3
# score.py: merge tower rows into a base countermx set and run marks.py per level
# Usage: python3 score.py --base DIR [tower=PREFIX ...]
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

LEVELS = [0, 3, 6, 9, 13]

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True)
    parser.add_argument('towers', nargs='*')
    return parser.parse_args()

def split_tower_args(towers):
    result = []
    for t in towers:
        m = re.match(r'^([a-z]+)=(.+)$', t)
        if m:
            result.append((m.group(1), m.group(2)))
        else:
            print(f"ERROR: invalid tower arg: {t} (expected kind=prefix)", file=sys.stderr)
            sys.exit(1)
    return result

def merge_into_base(base_dir, towers, level, tmpdir):
    base_file = os.path.join(base_dir, f"m{level}.out")
    merged = tempfile.NamedTemporaryFile(mode='w', suffix=f'.m{level}.out', dir=tmpdir, delete=False)
    with open(base_file) as f:
        base = f.read()
    merged.write(base)
    merged.close()
    merged_path = merged.name
    for kind, prefix in towers:
        row_file = f"{prefix}-{level}.k.out"
        if not os.path.exists(row_file):
            continue
        nb = load_new_rows(row_file, kind)
        merged_path = replace_tower_rows(merged_path, nb, kind)
    return merged_path

def load_new_rows(file, kind):
    kind_upper = kind.upper()
    blocks = {}
    with open(file) as f:
        cur = None
        for line in f:
            m = re.match(r"^waves (\S+)", line)
            if m:
                cur = m.group(1)
                blocks.setdefault(cur, {})
                continue
            m = re.match(r"^  ([A-Z]{3}) (\S+)", line)
            if m and cur and m.group(1) == kind_upper:
                blocks[cur][(m.group(1), m.group(2))] = line
    return blocks

def replace_tower_rows(merged_file, new_blocks, kind):
    kind_upper = kind.upper()
    with open(merged_file) as f:
        lines = f.readlines()
    out = []
    cur = None
    for line in lines:
        m = re.match(r"^waves (\S+)", line)
        if m:
            cur = m.group(1)
        m2 = re.match(r"^  ([A-Z]{3}) (\S+)", line)
        if m2 and cur and m2.group(1) == kind_upper:
            k = (m2.group(1), m2.group(2))
            if k in new_blocks.get(cur, {}):
                out.append(new_blocks[cur][k])
                continue
        out.append(line)
    with open(merged_file, 'w') as f:
        f.writelines(out)
    return merged_file

def run_marks(merged, level):
    marks_script = os.path.join(os.path.dirname(__file__), 'marks.py')
    args = [sys.executable, marks_script, merged]
    if level in (0, 3, 6):
        args.append('--band')
    if level == 13:
        args.extend(['--focus', '--band', '--band-total', '2'])
    r = subprocess.run(args, capture_output=True, text=True)
    return r.stdout

def count_rule_fails(level, output):
    fails = 0
    for line in output.split('\n'):
        if 'RULE FAIL' in line:
            fails += 1
            yield line
    return fails

def main():
    args = parse_args()
    towers = split_tower_args(args.towers)
    tmpdir = tempfile.mkdtemp()
    try:
        level_counts = {}
        for level in LEVELS:
            merged_file = merge_into_base(args.base, towers, level, tmpdir)
            output = run_marks(merged_file, level)
            fails = list(count_rule_fails(level, output))
            for f in fails:
                print(f"{level}: {f}")
            level_counts[level] = len(fails)
        total = sum(level_counts.values())
        parts = [f"{lvl}:{level_counts[lvl]}" for lvl in LEVELS]
        print("total: " + " ".join(parts) + f" = {total}")
    finally:
        shutil.rmtree(tmpdir)

if __name__ == '__main__':
    main()
