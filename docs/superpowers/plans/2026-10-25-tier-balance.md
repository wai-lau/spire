# Spire Tier Redesign, Plan 3: Balance Battery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, chosen by Wai). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit the tier redesign's numbers so the spec's checks pass: the duo rule at tier 0, equal trios, the economy target (all 39 points by Death, under 10% of a tower's price left), marks target C with every tower on two or more types; ship-ready as **7.0.0** (owner, 2026-10-25: "All things after tower L0 rework should be considered v7").

**Architecture:** No new mechanics. Every change is a number in `web/aspira-curve.js` (`STAT_CURVE` lo/hi per kind), `web/aspira-defs.js` (early-wave ease, `BOUNTY_MUL`), `web/aspira-skills.js` (`SKILL_STEP_COST`) or a tower's mechanic lever, tried first through `ASPIRA_PATCH` in the sims and committed once a sim passes. Every sim runs pinned to a snapshot (`ASPIRA_WEB`), one at a time.

**Tech Stack:** `scripts/aspira-sim/` (`solo.mjs`, `tribal.mjs` + `triscale.py`, `trioplan.mjs`, `countermx.mjs` + `marks.py`), smoke `scripts/spire-smoke/smoke.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-24-tier-redesign-design.md`. Plans 1-2 done on branch `tier-redesign`.

## Global Constraints

- Branch `tier-redesign`; no push, merge or deploy without Wai's OK.
- 500-line cap per `.js`; `aspira-game.js`, `aspira-changelog.js`, `aspira-defs.js` at exactly 500: edit in place.
- Interest stays uncapped, boss +1% drops included. Never raise SOL's fire rate (not even in a sim). One pop per tick. IFR flare sizes locked.
- Tier 0 stays below today's bare tower: every `STAT_CURVE[k].dmg[0] < 1` (smoke checks it). An axis nudge stays within `NUDGE_MAX` 1.2.
- Waves 1-12 ease applies to every type alike (types stay equally hard). Count-first tuning for any type lever (max 1.5x).
- A RULE FAIL in marks is fixed with balance, never by editing marks.
- Sims run sequentially, each pinned with `ASPIRA_WEB=<snapshot>`; outputs to the scratchpad.
- Smoke passes at every commit; commit trailer per the session reminder.

## Review Focus

1. Tier-0 lo changes shift the whole curve's low end: re-run the duo check after the hi fit and after the economy (Task 4 re-checks).
2. Prices rising steeply can starve the early game: the duo rule buys nothing, so trioplan's first-buy wave is the early check; ledger it per run.
3. A trio that cannot beat Death at any price (a design death): ledger it, the economy target is judged on trios that win.
4. Old saves migrated one tier up keep their bought points; with a new price ladder their `t.lvl` ladder index still maps 1:1 (13 steps) - smoke's save check covers it.
5. `VS_MARKS` regenerated on the final numbers only (Task 5), never mid-battery.

---

### Task 1: Duo rule at tier 0

**Files:** Modify `web/aspira-curve.js` (`STAT_CURVE[k].dmg[0]`), `web/aspira-defs.js` (an early-HP ease on waves 1..`PLAIN_HP_EASY`, in place).

- [ ] **Step 1:** Baseline `solo.mjs 2` (done: only GRV pairs and ARC+GRV-like pairs clean; FRZ/SOL/IFR/CAR pairs lose 13-46 lives).
- [ ] **Step 2:** Even the kinds: per kind, scale `dmg[0]` (staying < 1) so its pairs' lives lost come together; GRV/ACD down, SOL/IFR/CAR/ARC up. Patch-test with `ASPIRA_PATCH`.
- [ ] **Step 3:** Ease waves 1-12 HP for all types alike until every different-kind pair clears 1-12 + the Star with 0 lives (best slot, both seeds).
- [ ] **Step 4:** Commit: `Spire tiers: duo rule at tier 0 - ...`. Expected: `solo.mjs 2` duo table all `0/0  star W W` for different kinds; smoke all passed.

### Task 2: Curve hi fit (equal trios)

**Files:** Modify `web/aspira-curve.js` (`STAT_CURVE[k].dmg[1]`, rate/range hi where a kind walls).

- [ ] **Step 1:** `tribal.mjs` (all 35 trios, seeds 1,2) → `triscale.py` per-kind damage factor.
- [ ] **Step 2:** Scale each kind's `dmg[1]` by its factor; repeat until every factor is within 0.9..1.1.
- [ ] **Step 3:** Commit `Spire tiers: curve fit - ...`. Expected: factors within ±10%; smoke passes.

### Task 2b: Axis balance (owner, 2026-10-25: "make sure that axis balancing is run as well")

**Files:** Modify `scripts/aspira-sim/axis.mjs` (relative imports - it ran master's sim), each tower's per-axis mechanic levers (counts, shapes, its one own-damage constant) in `web/aspira-*.js`.

- [ ] **Step 1:** `node scripts/aspira-sim/axis.mjs <out.jsonl>` (each axis pushed first inside the real trios holding the tower, perfect play to 120) → `python3 scripts/aspira-sim/axisrep.py <out.jsonl>`.
- [ ] **Step 2:** Per tower, bring each axis's early / mid / late margin within ±10% of the tower's mean, and wins within one game, with that axis's own mechanic levers - never a raw damage table (the curve owns damage), never a stat nudge past `NUDGE_MAX`.
- [ ] **Step 3:** Commit `Spire tiers: axis balance - ...`. Expected: axisrep within ±10% per phase; smoke passes. Re-run Task 2's tribal if any lever moved a kind's power.

### Task 3: Economy target

**Files:** Modify `web/aspira-skills.js` (`SKILL_STEP_COST`), `web/aspira-defs.js` (`BOUNTY_MUL`).

- [ ] **Step 1:** `trioplan.mjs 3 1` on all 35 trios: buys, credits left, first-buy wave.
- [ ] **Step 2:** Scale the ladder (and steepen its top) and/or lower bounty until the winning trios end Death with 39 buys and credits < 10% of a full tower's price (the tower price x sum(`SKILL_STEP_COST`)).
- [ ] **Step 3:** Commit `Spire tiers: economy - ...`. Expected: the target met on every winning trio; smoke passes.

### Task 4: Re-check

- [ ] **Step 1:** `duo0.mjs 3`, `tribal.mjs` and `axis.mjs` again on the final numbers. Expected: duo clean, factors within ±15%, axes within ±15%. Fix and loop back to the failing task if not.

### Task 5: Marks - the nearest zero-sum target, then balance to it (owner, 2026-10-25: "this needs to include getting the nearest new zero sum table / Then balancing so each tower hits those benchmarks")

**Files:** Create `scripts/aspira-sim/marktarget.py`; modify `web/aspira-chooser.js` (`VS_MARKS`, via `marks.py --write`) and tower mechanic levers.

- [ ] **Step 1:** One window a CHAPTER (owner, 2026-10-25: "make countermx consistent at the 4 different game chapters"; ARCHITECTURE.md 5.6): 13-19 (early, past the tier 0 ease), 41-49 (mid), 71-79 (late), 101-109 (end), each with the BUILD a perfect player holds per tower there - Task 3's trioplan buy logs: per kind its MAIN axis (the one bought deepest) and the other two, each at its mean tier in that chapter over every trio, rounded (countermx gets a `held` build beside `spread`).
- [ ] **Step 2:** `HELD=<the Step 1 builds> WINDOWS=13-19,41-49,71-79,101-109 KINDS=arc,frz,sol,acd,grv,car,ifr node scripts/aspira-sim/countermx.mjs 2 > cmx.out; python3 scripts/aspira-sim/marks.py cmx.out` - each chapter's marks, whether they agree, and the pooled marks.
- [ ] **Step 3:** `marktarget.py cmx.out`: ONE table for the whole game, its distance summed over the four chapters - every integer table (-3..3) with each row and each column summing to 0, no two rows alike, every tower above 0 on two or more types; ranked by distance to the measured raw scores (in marks, summed |target - raw / PER_MARK|), fewest cells changed first. Print the nearest and its ties; it replaces target C as the benchmark (memory `marks-target`).
- [ ] **Step 4:** Balance each tower whose measured row misses its target row, with that tower's own mechanic levers (never marks edits, one pop per tick, no SOL rate, IFR flares locked); re-run countermx after each round until every row matches IN EVERY CHAPTER (marks.py prints CHAPTERS AGREE). A chapter that drifts is fixed THROUGH THE MAIN AXIS a player holds by then (owner, 2026-10-25): that axis's tier tables at the tier it has reached in that chapter.
- [ ] **Step 5:** `marks.py --write`, commit `Spire tiers: marks - ...`. Expected: every chapter's measured marks equal the target table; no RULE FAIL. The standing marks command (CLAUDE.md, ARCHITECTURE.md 7.2) becomes the four-chapter one in Task 6. Re-run `tribal.mjs` + `axis.mjs` if levers moved power (Task 4 bounds).

### Task 6: Ship prep (7.0.0)

**Files:** `web/aspira-version.txt`, `web/aspira-changelog.js` (in place), `ARCHITECTURE.md` §9.4/§4.2, `ARCHAEOLOGY.md` §12 snapshot, `CLAUDE.md` index lines if needed.

- [ ] **Step 1:** Version 7.0.0 (the tier redesign is the major; later battery runs are 7.x minors), a changelog entry naming the tier ladder, the curve, the new mechanics and the economy.
- [ ] **Step 2:** Docs: the fitted numbers into ARCHAEOLOGY §12, principles only in ARCHITECTURE.
- [ ] **Step 3:** Smoke + `.venv/bin/pytest apps/spire/tests` from exec-fn; commit. Then STOP: ask Wai before push/merge/deploy.
