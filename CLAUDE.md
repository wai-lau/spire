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
  minor thing"); anything else bumps PATCH (semver major.minor.patch; the third number is "patch", never "tiny"). ARCHITECTURE.md §9.4.
- **Every balance patch refreshes the build card's checks and x's** (`VS_MARKS`, owner 2026-10-18): run
  `SPREAD_ONLY=1 POINTS=9 WINDOWS=101-109,111-119 KINDS=arc,frz,sol,acd,grv,car,ifr node scripts/aspira-sim/countermx.mjs 2 > cmx.out` (9 points, the late windows - owner, 2026-10-28; was 6 at 61-69) on the patched code, then
  `python3 scripts/aspira-sim/marks.py cmx.out --write`, and ship the new marks with the patch. ARCHITECTURE.md §4.6.
- **THE MARK TARGET** (owner, 2026-10-29: "Save this mark target! It's very important!"): `scripts/aspira-sim/mark-target.json` - every
  type column is ✓✓ ✓ ✓ ✓ – ✗✗ ✗✗✗, every row and column sums to 0, every tower checks two types or more. The towers are balanced TO it
  (`marktarget.py` finds it, nearest to the measured marks); never edit `VS_MARKS` by hand. ARCHITECTURE.md §7.2.
- **Every tower beats or at least helps against two or more enemy types** (owner, 2026-10-19; a check of any size counts): `marks.py` prints `RULE FAIL` for a tower with checks on one
  type alone - fix it with balance, never by editing the marks.
- **Tiers are purchases** (owner, 2026-10-23: "drop all the god damn levels between that can not be bought"; tier redesign 2026-10-24): an axis
  is 0, I, II, III, IV or V (`SKILL_TIERS`; V the capstone, one a tower; 13 purchases a tower) and every per-tier table has those six values;
  damage, rate and range come from the tower's total level on one stat curve (`aspira-curve.js`). A script that sets skills by hand spends
  points through `scripts/aspira-sim/stops.mjs`. ARCHITECTURE.md §4.2, §4.2b.
- **Tests:** from exec-fn, `.venv/bin/pytest apps/spire/tests` (the shared
  fixtures live in exec-fn's root `conftest.py`).
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
