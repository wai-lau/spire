# Spire Tier Redesign, Plan 3: Balance Battery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, chosen by Wai). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit the tier redesign's numbers so the spec's checks pass: the duo rule at tier 0, equal trios, the economy target (all 39 points by Death, under 10% of a tower's price left), marks target C with every tower on two or more types; ship-ready as the next minor (7.0.0 is NOT it: minor = 6.16.0).

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

### Task 3: Economy target

**Files:** Modify `web/aspira-skills.js` (`SKILL_STEP_COST`), `web/aspira-defs.js` (`BOUNTY_MUL`).

- [ ] **Step 1:** `trioplan.mjs 3 1` on all 35 trios: buys, credits left, first-buy wave.
- [ ] **Step 2:** Scale the ladder (and steepen its top) and/or lower bounty until the winning trios end Death with 39 buys and credits < 10% of a full tower's price (the tower price x sum(`SKILL_STEP_COST`)).
- [ ] **Step 3:** Commit `Spire tiers: economy - ...`. Expected: the target met on every winning trio; smoke passes.

### Task 4: Re-check

- [ ] **Step 1:** `solo.mjs 2` and `tribal.mjs` again on the final numbers. Expected: duo table clean, factors within ±15%. Fix and loop back to the failing task if not.

### Task 5: Marks

**Files:** Modify `web/aspira-chooser.js` (`VS_MARKS`, via `marks.py --write`), tower mechanic levers if needed.

- [ ] **Step 1:** Pick POINTS = a perfect player's buys per tower at waves 61-69 from Task 3's trioplan (rounded).
- [ ] **Step 2:** `SPREAD_ONLY=1 POINTS=<p> WINDOWS=61-69 KINDS=arc,frz,sol,acd,grv,car,ifr node scripts/aspira-sim/countermx.mjs 2 > cmx.out; python3 scripts/aspira-sim/marks.py cmx.out` - compare to target C; fix RULE FAILs with balance.
- [ ] **Step 3:** `marks.py --write`, commit `Spire tiers: marks - ...`. Expected: no RULE FAIL.

### Task 6: Ship prep (6.16.0)

**Files:** `web/aspira-version.txt`, `web/aspira-changelog.js` (in place), `ARCHITECTURE.md` §9.4/§4.2, `ARCHAEOLOGY.md` §12 snapshot, `CLAUDE.md` index lines if needed.

- [ ] **Step 1:** Version 6.16.0, a changelog entry naming the tier ladder, the curve, the new mechanics and the economy.
- [ ] **Step 2:** Docs: the fitted numbers into ARCHAEOLOGY §12, principles only in ARCHITECTURE.
- [ ] **Step 3:** Smoke + `.venv/bin/pytest apps/spire/tests` from exec-fn; commit. Then STOP: ask Wai before push/merge/deploy.
