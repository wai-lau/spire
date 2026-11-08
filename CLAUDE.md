# THE SPIRE

Spiral tower defence at `wai-lau.net/spire` (`/aspira` 301s to it; files, code
and the nav key keep the name `aspira`). The current game design, topic by topic
(§1 overview .. §10 tech): **ARCHITECTURE.md** (this repo), whose **§11 is every
trap** - read it before changing code. Incidents, superseded designs and
balance/perf history: **ARCHAEOLOGY.md** (same top-level numbering; its §12 is the dated snapshot of every tuned number - the code is the truth). Code comments
that say `ARCHITECTURE.md §22` mean the whole of ARCHITECTURE.md.

## Where this repo lives

A git SUBMODULE of exec-fn at `apps/spire` (since 2026-10-14). It MIRRORS
exec-fn's layout, so the parent finds each piece the way it finds its own
(exec-fn ARCHITECTURE.md §1e):

| Here | Served / loaded as |
|------|--------------------|
| `api/routes_aspira.py`, `spire_board.py`, `spire_perflog.py` | python on exec-fn's `sys.path` (`api/app_paths.py`) |
| `api/templates/aspira.html` | `pages._tmpl("aspira.html")` |
| `web/aspira-*.{js,css}`, `aspira-version.txt` | flat at `/` (`/aspira-game.js`) |
| `tests/test_spire_*.py` | collected by exec-fn's pytest |
| `scripts/spire-smoke/`, `scripts/aspira-sim/` | the game smoke + balance simulator |

The python imports exec-fn modules (`auth`, `helpers`, `routers`, `pages`):
this repo runs only INSIDE exec-fn. Runtime data stays in exec-fn's
`api/data/` (`spire_ascendants*`, `spire-perflog/`); the Brood War sound samples
are this repo's gitignored `data/aspira-sfx/`.

## Working here

- **Commit in this repo** (`git -C apps/spire commit …` from exec-fn). exec-fn's
  push hook pushes it, then bumps + pushes exec-fn's pointer. Never edit the
  files through exec-fn's index.
- **Lints, hooks and checks are exec-fn's, not this repo's.** `scripts/pre-commit` here is a SHIM (verbatim copy of exec-fn's `scripts/subrepo-pre-commit`; git runs it via `core.hooksPath=scripts`, which exec-fn's session hook sets). Inside exec-fn it runs exec-fn's `scripts/pre-commit`; cloned on its own it sparse-pulls ONLY the lint files (exec-fn `scripts/tooling-paths.txt`) into the gitignored `.exec-fn/` and runs that (lints only; tests need exec-fn). Never edit the shim here — change checks in exec-fn. A standalone clone: `git config core.hooksPath scripts` once. exec-fn ARCHITECTURE.md §1e. The game smoke (`node scripts/spire-smoke/smoke.mjs`, this repo's) is run by exec-fn's hook when a game file is staged.
- **A balance battery's changes is the next MINOR, and only that** (owner 2026-10-19: "every group of changes that is the
  result of a balance battery run should result in a new minor version"; a new day is NOT one: "stop doing the new day new
  minor thing"); anything else bumps PATCH (semver major.minor.patch; the third number is "patch", never "tiny") - ONCE A SHIP, not a commit: peers commit on
  their own worktree branches (`.wt/balance`, `.wt/visual`) without touching `web/aspira-version.txt`, and `~/.claude/spire-ship2.sh` picks,
  bumps and ships (owner, 2026-11-05: separate copies of the code). ARCHITECTURE.md §9.4.
- **Every balance patch runs the marks at FIVE point levels** (`VS_MARKS`, owner 2026-10-18; 2026-11-06: "1B, but also add a 0 point and 3 point check",
  "most important marks are 9 and 13, but 0 3 and 6 should never drift more than +/- 1 point away from target marks"): 9 points writes the card
  (`marks.py --write`), 13 points (each axis maxed, `--focus`) is the second target, 3 / 6 must stay within 1 of the target and 0 within 2
  (owner 2026-11-07 "1C": the 0-point band loosened to +/-2) (`--band`, RULE FAIL past it). The five commands and their windows: ARCHITECTURE.md §4.6.
- **THE MARK TARGET** (owner, 2026-10-29 15:45: "save super important! priority #1"; 16:05: "let's swap FRZ and GRV"; 16:30: "swap SOL and ACD targets"; 17:35: GRV takes FRZ's row, FRZ ARC's, ARC GRV's; 10-30: the swarmers shuffle, ARC IFR GRV FRZ check swarm; 10-31: "Sol acd swap / No on arc grv"): `scripts/aspira-sim/mark-target.json`, the exact table
  the owner chose - swarm / fast / shield / armor: ARC +2 -2 -2 +2 · FRZ +1 +2 -1 -2 · SOL -3 +1 +1 +1 · ACD -1 -3 +2 +2 · GRV +1 +1 -3 +1 ·
  CRR -2 +2 +1 -1 · IFR +2 -1 +2 -3. Every type column is ✓✓ ✓✓ ✓ ✓ ✗ ✗✗ ✗✗✗ (+2 +2 +1 +1 -1 -2 -3; one of the seven zero-sum shapes that
  allow two checks a tower), every row and column sums to 0, every tower checks two types or more, IFR (-3) and CRR (-1) bad vs armor by design (owner: "ARC and IFR by design are bad vs armor"; ARC's row became +2 vs armor at 17:35 that day).
  The towers are balanced TO it; never edit `VS_MARKS` by hand; `marktarget.py` (the fitter) runs again only on the owner's word. Any other
  mark table in docs or plans is OLD (owner: "delete all other mark plans, or mark them OLD"). ARCHITECTURE.md §4.6.
- **Every tower beats or at least helps against two or more enemy types** (owner, 2026-10-19; a check of any size counts): `marks.py` prints `RULE FAIL` for a tower with checks on one
  type alone - fix it with balance, never by editing the marks.
- **Tiers are purchases** (owner, 2026-10-23: "drop all the god damn levels between that can not be bought"; tier redesign 2026-10-24): an axis
  is 0, I, II, III, IV or V (`SKILL_TIERS`; V the capstone, one a tower; 13 purchases a tower) and every per-tier table has those six values;
  damage, rate and range come from the tower's total level on one stat curve (`aspira-curve.js`). A script that sets skills by hand spends
  points through `scripts/aspira-sim/stops.mjs`. ARCHITECTURE.md §4.2, §4.2b.
- **Tests:** from exec-fn, `.venv/bin/pytest apps/spire/tests` (the shared
  fixtures live in exec-fn's root `conftest.py`).
- **A mechanic change must keep its demo passing** (owner, 2026-11-03: "Add a mechanism to ensure demo scenes are always up to date"): the tower card's
  scene (`aspira-demo*.js`) has a layout per tower tier 0 and per axis; the smoke (`demo.mjs`) fails on a missing or stale layout and on any layout
  that stops showing what it declares. A new tower or axis ships with its layout. ARCHITECTURE.md §11 "demo".
- **Dev scenes:** `/spire?dev=boss` rebuilds the boss scene on EVERY load (`web/aspira-dev.js`): a FRZ placed, the Star sent, its HP at 55%
  (`&hp=0.3`), paused - so a refresh is the same state on the latest code; the autosave's checkpoint is parked. Nothing without `?dev=`.
- **Diagrams:** mermaid source in `docs/arch/*.mmd`; staging one makes exec-fn's
  pre-commit render the `.svg` beside it (`scripts/render-mermaid.py`) and stage it.
  ARCHITECTURE.md embeds the SVGs (the app's markdown viewer shows a fence as code).
- **Colours** come from exec-fn's `web/chrome.css` tokens via the palette
  swatches in
  `aspira.html` (coloured in `aspira.css`, read at boot by `aspira-defs.js`); a new colour/alpha is exec-fn's palette lint's call.
- **Live edits** on the droplet are live on save, exactly as in exec-fn
  (`./apps` is bind-mounted; `--reload` covers the `.py`).
