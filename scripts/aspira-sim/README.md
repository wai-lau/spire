# aspira-sim — headless balance simulator for /aspira

Runs the REAL game code (`web/aspira-{defs,upgrades,game,towers}.js`) in a Node VM
with drawing, sound and input stubbed out and every tick run as fast as it can,
then plays it with a scripted player (opening, build mix, upgrade appetite,
interest reserve, chosen path/form per tower). Built for the 2026-10-02
overnight balance pass; ARCHAEOLOGY.md has the findings (ARCHITECTURE.md §10 describes the tooling).

Run one at a time with `nice -n 19` on the droplet (2 cores, serves the site).
On a big box the pool scripts below use every core but two (`POOL_WORKERS=n`
caps it) and the single-threaded ones can run side by side.

| script | what |
|---|---|
| `wave1.mjs [patch] [seeds]` | every 2-tower opening (100 credits) vs wave 1 — must lose no life |
| `eval.mjs [patch] [seeds] [maxWave]` | mono builds + all-four with each tower left out |
| `combos.mjs [patch] [seeds]` | all 15 tower subsets, ranked |
| `forms.mjs [patch] [seeds] [kind]` | each tower's 6 forms inside the all-four build |
| `style.mjs` | upgrade appetite x interest reserve x tower cap |
| `sim.mjs '<strategy json>' [seed] [maxWave]` | one game, JSON result (waves, leaks by type, damage by tower). `core: [power ids]` + `useCore: true` make the player pick (at the boss picks) and fire the core powers (`corepower.mjs`) |
| `curve.mjs [seeds] [out.jsonl]` | the difficulty curve: 4 styles x 4 openings, full games with the core -> death-wave p10/p50/p90, lives lost by wave band, first leak, leaks by type |
| `mbti.mjs [seeds] [out.jsonl]` | 16 REASONING personalities (2026-10-08): each type's cognitive-function stack (Se Si Ne Ni Te Ti Fe Fi, weighted 1 / .6 / .3 / .1) argues over the board every wave through sim.mjs's `mind` hook; prints results, by dominant function and letter, and each type's thoughts |
| `rand.mjs [games] [out.jsonl]` | RANDOM players (2026-10-08, "too easy to win randomly"): each game rolls its own mix, opening, appetite, axis per point, saver or not, core used or not; win rate split by kinds / economy / core / appetite (`BV_PATCH` patches the game) |
| `duo0.mjs [seeds]` | THE DUO RULE over a grid of patches (`DUO_GRID` = JSON `{label: patch}`): every pair of different tier-0 towers, every slot pair, waves 1-12 + the Star; a pair passes on its best slots with every seed clean. Fits the tier-0 ease (`EASE_N`, `EASE_SH`, aspira-waves.js) and each kind's curve `lo` |
| `countermx.mjs [seeds]` | the COUNTER MATRIX: every ordinary wave forced to one enemy type, N towers of one kind (spread, or one axis at the deepest tier its points reach) - % of that type leaked (env N, POINTS, WINDOWS, KINDS, BV_PATCH) |
| `chartvalue.mjs [seeds] [out.jsonl]` | each kind's 10 ways to spend its 6 chart points vs 2/2/2 (team damage + leaks over waves FROM..TO) and the value of every axis tier |
| `corevalue.mjs [seeds] [out.jsonl]` | each core power (and all three) vs none, picked at the boss picks and used in a real game |
| `late.mjs [evals] [seeds] [out.jsonl]` | late game from wave START, every open slot maxed, every core power: ten parallel hill-climbs; the mono starts show where each kind walls |
| `wavebal.mjs` / `typebal.mjs` / `bossbal.mjs` | the fits (wave counts, type counts, boss HP) - headers say how. The per-axis damage fits (`arcfit`, `holdfit`, `solfit`, `solmatch`, `tierfit`, `applyfit.py`) went to the local `.archaeology/` with the tier redesign (2026-10-25): damage is the stat curve's |
| `buildsearch.mjs` | hill-climb the build plan that banks the most by wave 30 |
| `stuck.mjs [toWave=60]` | STUCK TOWERS (2026-10-13, part of the battery): each trio to wave 60 with the gliding player - stalled glide steps, give-ups in a row, illegal spots and their longest run; prints STUCK and exits 1 when a tower stalls, gives up twice running or overlaps past 0.5 s |
| `tribal.mjs [out.jsonl]` | EVERY TRIO of the six kinds (all 20), PERFECT play (the smart saver, both powers) to wave 120, over `SEEDS` (default 1,2): wins, wave reached, lives left, rewinds. The input of the trio-scale method (ARCHITECTURE.md 4.6d); env `KINDS`, `SEEDS`, `ASPIRA_PATCH`, `ASPIRA_WEB`. (`trios.mjs` above walks only the first four kinds.) |
| `trioplan.mjs [beam=3] [seed=1] [out.jsonl]` | THE BEST UPGRADE ORDER per trio: a beam search over the game a wave at a time (checkpoint + rewind; children = the smart saver's own wave and every single purchase; a branch that loses a life is pruned; same build keeps the richer). Prints credits left after Death and the buy order, plus an economy ledger every 10 waves. env `TRIOS=arc+grv+car`, `KINDS`, `WIN` (stop early), `POOL_WORKERS`, `ASPIRA_PATCH`, `ASPIRA_WEB`. |
| `triscale.py out.jsonl` | scores a `tribal` run (a win = 120 + lives left, else the wave reached; a designed death that dies is neutral) and prints each kind's damage factor: the geometric mean over its trios of mean score / trio score |
| `triodiag.mjs` | why a trio loses: its games to 120 with per-wave records over waves 60+, lives lost and closest approach per enemy type, and the killing wave's types. env `TRIOS` (`a.b.c,...`), `SEEDS`, `ASPIRA_WEB` |
| `eco.mjs` | the no-weakness trios at wave 120: credits owned (spent + banked) against what maxing every tower costs; env `K` scales `SKILL_STEP_COST` (the x1.6 price came from it) |
| `marks.py countermx.out` | turns a `countermx` run (spread build, waves 61-69) into the build card's check / x marks (`VS_MARKS`, aspira-chooser.js) |
| `marktarget.py countermx.out [options=5]` | THE NEAREST ZERO-SUM MARKS TABLE (v7, owner 2026-10-25): every -3..3 table with rows and columns summing to 0, no two towers alike, every tower above 0 on two types or more, ranked by distance to the measured raw marks - the benchmark the towers are balanced to; each row shows the cells to move off the measured marks |

`ASPIRA_WEB=<dir>` pins a run to a snapshot of the game files (`cp web/aspira-*.js`
somewhere first): every game re-reads them, so a balance commit landing mid-run
would otherwise mix two versions.
`pool.mjs` runs a task module over a job list on a worker pool (`pool-worker.mjs`
is the entry); with an `out.jsonl` a run resumes where it stopped.
`formvalue.mjs` and `latesearch.mjs` are the pre-chart versions (path/form
tree, `buyCore`) and no longer run - kept for the record.

A `patch` is a JS file run inside the game's context after it loads — change
`TOWERS` / `ENEMIES` / `UPGRADES` numbers (or redefine a function) to try a
balance change without touching the live game. A full `forms` or `combos` run
takes 25-40 min.
