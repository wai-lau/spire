# THE SPIRE

Spiral tower defence at `wai-lau.net/spire` (`/aspira` 301s to it; files, code
and the nav key keep the name `aspira`). The current game design, topic by topic
(§1 overview .. §10 tech): **ARCHITECTURE.md** (this repo), an INDEX - the sections
live one file each in `docs/architecture/NN-*.md`, and **§11, every trap, is
`docs/architecture/11-traps.md`** - read it before changing code. Incidents, superseded designs and
balance/perf history: **ARCHAEOLOGY.md**, an index too (same top-level numbering; the sections in `docs/archaeology/NN-*.md`; its §12 is the tuned-number snapshot at 4.4.2, its §13 the battery log by date - the code is the truth). Code comments
that say `ARCHITECTURE.md §22` mean the whole of ARCHITECTURE.md; a "§4.8" resolves through the index.

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

- **No tracked text file over 500 lines, docs included** (owner, 2026-11-10: "add a 500 line limit to every file, including docs"; the changelog keeps
  its owner exemption, 2026-10-20 "allow overcap on changelog"): split a growing file on a real seam - a doc by section (`docs/architecture/`,
  `docs/archaeology/`; §13's battery log by month when it nears 500), code as the 500-line cap already says.
- **Commit in this repo** (`git -C apps/spire commit …` from exec-fn). exec-fn's
  push hook pushes it, then bumps + pushes exec-fn's pointer. Never edit the
  files through exec-fn's index.
- **Lints, hooks and checks are exec-fn's, not this repo's.** `scripts/pre-commit` here is a SHIM (verbatim copy of exec-fn's `scripts/subrepo-pre-commit`; git runs it via `core.hooksPath=scripts`, which exec-fn's session hook sets). Inside exec-fn it runs exec-fn's `scripts/pre-commit`; cloned on its own it sparse-pulls ONLY the lint files (exec-fn `scripts/tooling-paths.txt`) into the gitignored `.exec-fn/` and runs that (lints only; tests need exec-fn). Never edit the shim here — change checks in exec-fn. A standalone clone: `git config core.hooksPath scripts` once. exec-fn ARCHITECTURE.md §1e. The game smoke (`node scripts/spire-smoke/smoke.mjs`, this repo's) is run by exec-fn's hook when a game file is staged.
- **Shipping** (owner, 2026-10-19: "every group of changes that is the result of a balance battery run should result in a new minor version"; "stop
  doing the new day new minor thing"; 2026-11-05: separate copies of the code): a battery's changes = the next MINOR, anything else a PATCH, ONCE A
  SHIP, not a commit. The peers commit on their own branches in their own worktrees (`peer-balance` / `peer-visual` at `.wt/balance` / `.wt/visual`)
  and never touch `web/aspira-version.txt`; `~/.claude/spire-ship2.sh [--minor] "<subject>" [branch ...]` cherry-picks their unshipped commits onto
  `tier-redesign`, bumps the version once, smokes, runs the spire pytest, pushes, moves exec-fn's pointer and deploys; each peer then `git rebase
  tier-redesign`. A new tower is a new major. ARCHITECTURE.md §9.4.
- **Every balance patch runs the marks at FIVE point levels** (`VS_MARKS`, owner 2026-10-18; 2026-11-06: "also add a 0 point and 3 point check",
  "most important marks are 9 and 13, but 0 3 and 6 should never drift more than +/- 1 point away from target marks"): 9 points writes the card
  (`marks.py --write`), 13 points (each axis maxed, `--focus`) is the second target, each type within 1 and a tower's total gap at most 2 (owner 2026-11-10: "hey for 13 points, allow up to +1 on any type (up to total of +2)"; `--band --band-total 2`), 3 / 6 must stay within 1 of the target and 0 within 2
  (owner 2026-11-07: the 0-point band loosened to +/-2) (`--band`, RULE FAIL past it). The five commands and their windows: ARCHITECTURE.md §4.8.
- **THE MARK TARGET** (owner, 2026-10-29: "save super important! priority #1"): `scripts/aspira-sim/mark-target.json` is the table the towers
  are balanced TO; never edit `VS_MARKS` by hand; `marktarget.py` (the fitter) runs again only on the owner's word; any other mark table in docs
  or plans is OLD. The table and its rules: ARCHITECTURE.md §4.8; its history and every owner quote: ARCHAEOLOGY.md §4.6.
- **Every tower beats or at least helps against two or more enemy types** (owner, 2026-10-19; a check of any size counts): `marks.py` prints `RULE FAIL` for a tower with checks on one
  type alone - fix it with balance, never by editing the marks.
- **Tiers are purchases** (owner, 2026-10-23: "drop all the god damn levels between that can not be bought"; tier redesign 2026-10-24): an axis
  is 0, I, II, III, IV or V (`SKILL_TIERS`; V the capstone, one a tower; 13 purchases a tower) and every per-tier table has those six values;
  damage, rate and range come from the tower's total level on one stat curve (`aspira-curve.js`). A script that sets skills by hand spends
  points through `scripts/aspira-sim/stops.mjs`. ARCHITECTURE.md §4.2, §4.3.
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
