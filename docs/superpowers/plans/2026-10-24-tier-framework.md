# Tier Framework Implementation Plan (tier redesign, plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every tower from tiers 0..IV (capstone IV, 16 points) to tiers 0..V (capstone V, 13 purchases), with today's tiers I..IV shifted up one rung and a placeholder tier I in every axis, so the game and the simulator run end to end on the new ladder.

**Architecture:** The ladder lives in three files: `web/aspira-skills.js` (SKILL_TIERS, SKILL_POINTS, SKILL_STEP_COST), `web/aspira-capstone.js` (CAPSTONE_TIER, TIER_STEPS, the capstone push into every per-tier table, old-save migration), and `scripts/aspira-sim/stops.mjs` (how sims spend points). A new pass in `aspira-capstone.js` inserts tier I into every per-tier table right after the capstone push, interpolated between today's tier 0 and tier I, so no tower file changes in this plan. Plan 2 replaces those placeholders with real tier 0 / tier I mechanics and moves damage, rate and range onto the stat curve; plan 3 balances.

**Tech Stack:** Vanilla JS game files loaded in order (no modules), Node sims in `scripts/aspira-sim/` (vm contexts), `scripts/spire-smoke/smoke.mjs` (headless browser checks).

**Spec:** `docs/superpowers/specs/2026-10-24-tier-redesign-design.md`

## Global Constraints

- Work on a branch in a worktree (`tier-redesign`); nothing here ships alone. Plans 1-3 ship together as the next MINOR version (a balance battery).
- 500-line cap on every `.js`; `aspira-game.js`, `aspira-changelog.js` and `aspira-defs.js` sit at exactly 500 - edit in place, never add a line to them.
- 13 purchases a tower: one axis to the tier V capstone (5), the other two to tier IV (4 + 4). Only one capstone per tower.
- One purchase = one tier on one axis, the capstone included (spec, Calls for the build). Placing the tower buys tier 0.
- No tier lowers a stat (owner; spec: "never down"). The interpolated tier I must sit between tier 0 and tier II on every number.
- Interest stays uncapped (owner, 2026-10-24). This plan touches no economy number except the ladder's length.
- Comments follow the repo idiom: dated owner quotes, the "was" value.
- Every long sim run is pinned to a snapshot (`ASPIRA_WEB`), one pool job at a time.

## Review Focus

1. A save made on 6.15.x (skillScale 2, tiers 0..4) resumes with every bought axis one tier higher and is never shifted twice - Task 3 tests it.
2. A tower whose other axis holds the capstone stops at tier IV, not III - Task 1 tests it.
3. A tier I value outside [tier 0, tier II] (an object field, a count, a negative multiplier) - Task 2 tests every table.
4. The build card and sliders show V and price each buy as exactly one ladder step - Task 1 tests the price, Task 4 the card text.
5. A sim script that still spends points on the old 1 2 2 1 table - Task 5 greps for the old constants and tests `spreadStops`.

---

### Task 1: The ladder - six tiers, 13 purchases, one step a buy

**Files:**
- Modify: `web/aspira-skills.js:16` (`SKILL_POINTS = 16, SKILL_TIERS = 4`), `:26` (`SKILL_STEP_COST`), `:75` (`maxLvl`), `:80` (`shownLvl`)
- Modify: `web/aspira-capstone.js:12-24` (`CAPSTONE_TIER`, `CAPSTONE_LEVELS`, `TIER_STEPS`)
- Test: `scripts/spire-smoke/smoke.mjs:140` ("capstone: one axis to IV") and `:160` ("tiers are purchases")

**Interfaces:**
- Produces: `SKILL_TIERS = 5`, `CAPSTONE_TIER = 5`, `SKILL_POINTS = 13`, `CAPSTONE_LEVELS = 1`, `TIER_STEPS = [1, 1, 1, 1, 1]`, `SKILL_STEP_COST` with 13 entries, `maxLvl(t) = 1 + SKILL_POINTS` for chart towers.

- [ ] **Step 1: Rewrite the two smoke checks for the new ladder**

In "capstone: one axis to V, a second stops at IV; every tier table covers V": buy 7 times on `ids[0]` and 7 on `ids[1]`; expect `r.a === 5`, `r.b === 4`; probe `towerStats` and `describeTower` with `{ [ax.id]: 5 }` and `lvl: 6`.
In "tiers are purchases": every `ax.tiers.length` and `SKILL_MOVE[kind][ax.id].length` must be 5 or 6 (names I..V = 5, per-tier tables 0..V = 6); five buys on "focus" must give `[[1,1,true],[2,1,true],[3,1,true],[4,1,true],[5,1,true]]`; a full tower (5 + 4 + 4 buys) ends at `t.lvl === 14` and `nextBuy(t) === null`. Leave the save-migration lines for Task 3.

- [ ] **Step 2: Run the smoke test to see both fail**

Run: `node scripts/spire-smoke/smoke.mjs 2>&1 | grep -E "FAIL|capstone|tiers are"`
Expected: both checks FAIL (first axis reached 4, price steps 1 2 2 2).

- [ ] **Step 3: Set the constants**

`SKILL_TIERS = 5`, `SKILL_POINTS = 13`; `CAPSTONE_LEVELS = 1`, `TIER_STEPS = [1, 1, 1, 1, 1]`; `maxLvl` = `1 + SKILL_POINTS` (drop the `2 +` and its capstone comment). `SKILL_STEP_COST`: 13 entries resampled from today's 17-step curve so the full-tower total (the sum of today's 17 entries) is unchanged: entry k = today's cost at position `k * 16 / 12` by linear interpolation, then scaled so the 13 entries sum to the old 17; comment it "placeholder, plan 3 sets the economy". `shownLvl`: fold 13 purchases onto the 4 drawn looks as `1 + Math.floor((t.lvl - 1) / 4)`, capped at `MAX_LVL`.

- [ ] **Step 4: Run the smoke test**

Run: `node scripts/spire-smoke/smoke.mjs 2>&1 | tail -3`
Expected: both checks pass; any check that fails now is a tier-4 assumption - fix it to `CAPSTONE_TIER` / `SKILL_TIERS`, never to a literal 5.

- [ ] **Step 5: Commit**

```bash
git add web/aspira-skills.js web/aspira-capstone.js scripts/spire-smoke/smoke.mjs
git commit -m "Spire tiers: six tiers 0-V, 13 purchases, one ladder step a buy"
```

### Task 2: Tier I in every per-tier table

**Files:**
- Modify: `web/aspira-capstone.js` (after line 79, the capstone push loop)
- Modify: `web/aspira-skills.js:18` (`TIER_LEVEL`)
- Test: `scripts/spire-smoke/smoke.mjs` (new check after "tiers are purchases")

**Interfaces:**
- Consumes: Task 1's `CAPSTONE_TIER = 5`.
- Produces: `tierMid(a, b)` in `aspira-capstone.js`; every table in `CAPSTONE_NUM` and every `SKILL_MOVE[kind][axis]` has 6 slots, tier I at index 1; every `SKILL_TREES[kind][i].tiers` has 5 names, tier I's name `"Spark"` at index 0 (placeholder; plan 2 names them).

- [ ] **Step 1: Write the failing check**

```js
check("tier I sits between tier 0 and tier II in every table (tier redesign 2026-10-24)", () => {
  const r = run(`(() => {
    const bad = [];
    const num = (v0, v1, v2, at) => { if (typeof v1 !== "number" || isNaN(v1) || v1 < Math.min(v0, v2) - 1e-9 || v1 > Math.max(v0, v2) + 1e-9) bad.push(at); };
    const walk = (a, b, c, at) => typeof a === "number" ? num(a, b, c, at) : a && typeof a === "object" ? Object.keys(a).forEach(k => walk(a[k], b && b[k], c && c[k], at + "." + k)) : 0;
    CAPSTONE_NUM.forEach(([T], i) => { if (T.length !== 6) bad.push("len " + i); else walk(T[0], T[1], T[2], "table " + i); });
    for (const kind in SKILL_MOVE) for (const id in SKILL_MOVE[kind]) { const T = SKILL_MOVE[kind][id]; if (T.length !== 6) bad.push(kind + "." + id + " move"); }
    for (const kind in SKILL_TREES) for (const ax of SKILL_TREES[kind]) if (ax.tiers.length !== 5) bad.push(kind + "." + ax.id + " names");
    return bad;
  })()`);
  return r.length ? "tier I out of place: " + r.slice(0, 6).join(", ") : "";
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/spire-smoke/smoke.mjs 2>&1 | grep "tier I sits"`
Expected: FAIL with "len 0" (tables still 5 long).

- [ ] **Step 3: Implement `tierMid(a, b)` and the insert pass in `web/aspira-capstone.js`**

`tierMid`: two integers → `Math.round((a + b) / 2)` (counts stay whole); two positive numbers → `Math.sqrt(a * b)` (multipliers grow evenly); other numbers → `(a + b) / 2`; objects / arrays → field by field; anything else → `a`. After the capstone push loop: `for (const [T] of CAPSTONE_NUM) if (T.length === CAPSTONE_TIER) T.splice(1, 0, tierMid(T[0], T[1]));`, the same for every `SKILL_MOVE[kind][id]`, and `ax.tiers.unshift({ name: "Spark" })` for every axis. `TIER_LEVEL` becomes `[0, 0.5, 1, 3, 5, 6]`. A table with a capstone row but no per-tier rows (a scalar in `CAPSTONE_NUM`) is skipped by the length test - leave it.

- [ ] **Step 4: Run the full smoke test**

Run: `node scripts/spire-smoke/smoke.mjs 2>&1 | tail -3`
Expected: `spire smoke: all 65 passed`. A tower file that indexes a table by `CAPSTONE_TIER - 1` or a literal 4 shows up here as a NaN - fix it to read by tier.

- [ ] **Step 5: Commit**

```bash
git add web/aspira-capstone.js web/aspira-skills.js scripts/spire-smoke/smoke.mjs
git commit -m "Spire tiers: tier I placeholder in every per-tier table, between tier 0 and today's I"
```

### Task 3: Old saves move up one tier

**Files:**
- Modify: `web/aspira-capstone.js:42-50` (`SKILL_SCALE`, `OLD_TIER`, `skillScaleFix`)
- Test: `scripts/spire-smoke/smoke.mjs` ("tiers are purchases", its save lines)

**Interfaces:**
- Produces: `SKILL_SCALE = 3`; `skillScaleFix(g)` reads a scale-2 save (tiers 0..4) as `k ? k + 1 : 0`, a pre-scale save (0..6) through `OLD_TIER` then the same shift, and stamps `g.skillScale = 3`.

- [ ] **Step 1: Write the failing assertions**

In "tiers are purchases": `{a:0,b:1,c:2,d:3,e:4,f:5,g:6}` with no stamp reads `{"a":0,"b":2,"c":2,"d":3,"e":3,"f":4,"g":5}`; `{a:0,b:1,c:2,d:3,e:4}` stamped `skillScale: 2` reads `{"a":0,"b":2,"c":3,"d":4,"e":5}`; a second `skillScaleFix` changes nothing.

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/spire-smoke/smoke.mjs 2>&1 | grep "tiers are"`
Expected: FAIL on the old save's levels.

- [ ] **Step 3: Implement** the two read paths in `skillScaleFix` and `SKILL_SCALE = 3`; `aspira-autosave.js` already stamps `SKILL_SCALE`, so a save made now is never shifted.

- [ ] **Step 4: Run the smoke test** - Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add web/aspira-capstone.js scripts/spire-smoke/smoke.mjs
git commit -m "Spire tiers: a 6.15 save resumes one tier up, read once"
```

### Task 4: Card, sliders and descriptions read V

**Files:**
- Modify: `web/aspira-sliders.js`, `web/aspira-desc.js`, `web/aspira-chart.js`, `web/aspira-stats.js`, `web/aspira-ui.js` - only where a tier count is a literal (4, "IV", 16, 17)
- Test: `scripts/spire-smoke/smoke.mjs` (new check)

**Interfaces:**
- Consumes: Tasks 1-2.

- [ ] **Step 1: Write the failing check** "the build card reads tiers I..V (tier redesign 2026-10-24)": place a SOL, buy focus 5 times; `skillOptions(t)` holds no "focus" entry; the slider label text for focus is `tierTxt(5) === "V"`; `describeTower(kind, {axis: k})` for every kind, axis and k in 0..5 contains no "undefined" and no "NaN".
- [ ] **Step 2: Run it** - Expected: FAIL wherever a literal 4 caps a slider or a sentence.
- [ ] **Step 3: Replace each literal** with `SKILL_TIERS` / `CAPSTONE_TIER` / `SKILL_POINTS`. Find them: `grep -nE "\b(4|16|17)\b|\"IV\"" web/aspira-sliders.js web/aspira-desc.js web/aspira-chart.js web/aspira-stats.js web/aspira-ui.js` and judge each hit.
- [ ] **Step 4: Run the smoke test** - Expected: all pass.
- [ ] **Step 5: Commit** `git commit -m "Spire tiers: card, sliders and sentences read I-V"`

### Task 5: Sims spend points on the new ladder

**Files:**
- Modify: `scripts/aspira-sim/stops.mjs` (`STOPS`, `TIER_POINTS`, `POINTS_AT`), `scripts/aspira-sim/countermx.mjs` (its `POINTS` comment and default)
- Modify: any other `scripts/aspira-sim/*.mjs` hit by `grep -nE "TIER_POINTS|POINTS_AT|SKILL_TIERS|\b16\b" scripts/aspira-sim/*.mjs`
- Test: `scripts/aspira-sim/stops.test.mjs` (create)

**Interfaces:**
- Produces: `STOPS = [0, 1, 2, 3, 4, 5]`, `TIER_POINTS = [1, 1, 1, 1, 1]`, `POINTS_AT = [0, 1, 2, 3, 4, 5]`; a POINT is now one purchase.

- [ ] **Step 1: Write the failing test** (`node:test`): `spreadStops(["a","b","c"], 6)` → `{a:2,b:2,c:2}`; `spreadStops(["a","b","c"], 13)` → `{a:4,b:4,c:4}` (a spread build never takes the capstone; the 13th point is left over); `focusStops(["a","b","c"], "a", 13)` → `{a:5,b:4,c:4}`; `snapStop(5)` → 5.
- [ ] **Step 2: Run it** - `node --test scripts/aspira-sim/stops.test.mjs` - Expected: FAIL (old 1 2 2 1 points).
- [ ] **Step 3: Set the three tables**; spreadStops must stop each axis at 4 unless it is the focused one (tier V is the capstone). countermx keeps `POINTS=6` as its default for now (plan 3 re-picks it from the perfect player's holdings at waves 61-69).
- [ ] **Step 4: Run** the test, then pinned smoke runs: `ASPIRA_WEB=<snapshot>/web node scripts/aspira-sim/solo.mjs 2` and `ASPIRA_WEB=<snapshot>/web SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69 KINDS=arc node scripts/aspira-sim/countermx.mjs 1` - Expected: both finish with no thrown error (numbers are not judged in this plan).
- [ ] **Step 5: Commit** `git commit -m "Spire sim: points are purchases on the six-tier ladder"`

---

## Later plans (written when this one is done)

- **Plan 2, towers:** the stat curve (one per tower, damage / rate / range by total level 0..13, slightly steepening; an axis nudge only raises, at most +20%), then one task per tower for its tier 0 and tier I from the spec's table, the new mechanics (ACD Contagion's slowing pool replacing kill pools, GRV Nova replacing Supernova, brighter and stronger Radiation pellets), tier I names replacing "Spark", ARC Voltage = forks / Conductivity = chains.
- **Plan 3, balance battery:** the duo rule (ease waves 1-12 for every type alike if two tier 0 towers leak), the price ladder and bounty to the economy target (trioplan: all 39 points by wave 119, under 10% of a tower's price left), marks target C with countermx's point count re-picked, the two-type rule, then ship as the next minor with the changelog.
