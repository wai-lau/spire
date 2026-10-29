# Spire Tier Redesign, Plan 2: Towers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every tower's damage, fire rate and range come from one stat curve by total level; every tower is plain at tier 0 and shows its axis's first hint at tier I, with the spec's new mechanics (ACD Contagion's slowing pool, GRV Nova's slowing aura, Radiation's brighter pellets).

**Architecture:** A new file `web/aspira-curve.js` holds the curve (`STAT_CURVE`, `curveAt`, `towerLevel`, `curveBase`, `NUDGE_MAX`). Each tower's `<kind>SkillStats` starts from `curveBase(t, s, b)` and keeps only mechanic levers; per-axis tables whose only job was raw damage, rate or range go. Tier 0 and tier I are set by writing index 0 and index 1 of the per-tier tables by hand (plan 1's `tierMid` placeholders are overwritten where the spec says otherwise) and by gating mechanics on `> 0`. Tower checks live in a new `scripts/spire-smoke/tiers.mjs`, run by `smoke.mjs`.

**Tech Stack:** Vanilla JS game files loaded in template order (no modules); `scripts/spire-smoke/smoke.mjs` (node vm, fake DOM); `scripts/aspira-sim/sim.mjs` (same files, its own `FILES` list).

**Spec:** `docs/superpowers/specs/2026-10-24-tier-redesign-design.md`. Plan 1 (done, branch `tier-redesign`): `docs/superpowers/plans/2026-10-24-tier-framework.md`.

## Global Constraints

- Branch `tier-redesign` in its worktree; nothing ships alone. Plans 1-3 ship together as the next MINOR. No push, merge or deploy in this plan.
- 500-line cap per `.js`; `aspira-game.js`, `aspira-changelog.js`, `aspira-defs.js` sit at exactly 500 — edit in place, never add a line. A tower file that would pass 500 splits on a real seam.
- 100-line cap per function in staged `web/*.js` (exec-fn's ESLint via the hook).
- Total level = all points spent on the tower, 0 to 13 (`SKILL_POINTS`). "Every point counts the same, whichever axis it buys."
- "Axes add mechanics first." An axis "may also nudge a basic stat (damage, rate or range) up to fine-tune the numbers, never down", at most +20% over the curve (`NUDGE_MAX = 1.2`, the product of all of a tower's nudges on one stat).
- "One curve per tower, one lever per mechanic. This replaces today's stacked per-axis damage tables (ARC_SIDE_DMG, ARC_VOLTAGE_DMG and the like)."
- Counts and shapes (jumps, forks, bounces, pierce, moons, pools, pellets, interceptors) stay hand-tuned per axis. A sub-attack's damage factor (a `K` x `st.dmg`) becomes ONE constant per mechanic: its value at the first tier the mechanic is on.
- One pop per tick (a shield loses at most one charge per tick or hit). Never raise SOL's fire rate (SOL's curve rate is flat 1). IFR flare sizes (`IFR_BEAM_L`, `IFR_BEAM_W`, `IFR_FLARE_K`, the big flare) are locked.
- Numbers are not balanced here (plan 3 fits the curve, prices, bounty, marks). The curve's placeholder end points are measured, not guessed (Task 1).
- Smoke must pass at every commit (the hook runs it; never `--no-verify`). Commit trailer as the session's attribution reminder says.

## Review Focus

1. A tower bought on one axis only: every mechanic of the other two axes is off at tier 0 (no stray fork, pool, aura, fan, fire, flare, tether). Each tower task's tier-0 check covers its own kind.
2. Old saves: a 6.15 save migrated one tier up lands on tier II+, so tier 0/I changes never reach it — but a tower whose axis is 0 now loses its old tier-0 mechanics (ACD pools, IFR fire, SOL second beam). Expected, ledger it; no test.
3. Stat card rows (`aspira-stats.js`) reading a table that is gone or reading `undefined` at tier 0 (pool, aura, pellets absent): each tower task's check renders `STAT_ROWS[kind]` at tier 0 and tier I and asserts no `NaN` / `undefined` in the text.
4. The card sentence (`describeTower`) at tier 0 claiming a mechanic the tower no longer has: each tower task asserts its tier-0 sentence names none of the axes' mechanics.
5. Sims: `sim.mjs` must load `aspira-curve.js`, or every sim dies on `curveBase` — Task 1's check runs one 2-wave sim game.

---

### Task 1: The stat curve

**Files:**
- Create: `web/aspira-curve.js`
- Create: `scripts/spire-smoke/tiers.mjs`, `scripts/spire-smoke/harness.mjs`
- Modify: `scripts/spire-smoke/smoke.mjs` (boot/check/report move to `harness.mjs`; imports `./tiers.mjs` before reporting)
- Modify: `api/templates/aspira.html` (script tag after `aspira-capstone.js`, `?v=1`), `scripts/aspira-sim/sim.mjs` (`FILES`: after `aspira-capstone.js`)
- Modify: `web/aspira-skills.js` (`skillMove`: range nudge capped)

**Interfaces:**
- Produces: `STAT_CURVE[kind] = { dmg: [lo, hi], rate: [lo, hi], range: [lo, hi] }`; `CURVE_P` (steepening exponent); `towerLevel(t) -> int` (sum of `t.skills`); `curveAt(kind, L) -> { dmg, rate, range }` (multipliers, `lo + (hi - lo) * (L / SKILL_POINTS) ** CURVE_P`); `curveBase(t, s, b)` sets `s.dmg = b.dmg * c.dmg`, `s.rate = b.rate * c.rate`, `s.range = b.range * RANGE_BONUS * c.range`; `NUDGE_MAX = 1.2`; `nudge(x) -> min(NUDGE_MAX, max(1, x))`.
- Produces (tests): `harness.mjs` exports `boot, check, run, results, report`; `tiers.mjs` exports nothing, registers checks; `CURVE_DONE` array at the top of `tiers.mjs` lists the kinds whose stats run on the curve (empty in Task 1; each tower task appends its kind).

- [ ] **Step 1: Measure the placeholder end points.** Scratch script (scratchpad, not committed) on the current HEAD: for each kind, `towerStats` of the three V/IV/IV builds (each axis the capstone once); `hi.dmg` = mean of `s.dmg / b.dmg`, `hi.rate` = mean `s.rate / b.rate` (SOL forced 1), `hi.range` = mean `s.range / (b.range * RANGE_BONUS)` capped at 1.5. `lo` = `{ dmg: 0.8, rate: 1, range: 1 }` for every kind (spec call: tier 0 below today's bare tower). `CURVE_P = 1.3`. Write the measured numbers into the plan ledger.
- [ ] **Step 2: Split the harness.** Move `boot`, `check`, `results`, `drawn`, `calls`, `frames` and the report block into `harness.mjs`; `smoke.mjs` imports them, `await import("./tiers.mjs")`, then `report()`. Run `node scripts/spire-smoke/smoke.mjs | tail -1` — Expected: `all 67 passed`.
- [ ] **Step 3: Write the failing checks in `tiers.mjs`:**

```js
check("curve: by total level alone, rising, slightly steepening, tier 0 below today's bare tower (tier redesign 2026-10-24)", () => {
  const r = run(`(() => { const out = {}; for (const k in STAT_CURVE) { const d = []; for (let L = 0; L <= SKILL_POINTS; L++) d.push(curveAt(k, L).dmg); out[k] = d; } return out; })()`);
  for (const [k, d] of Object.entries(r)) {
    if (!(d[0] < 1)) return k + " tier 0 dmg x" + d[0] + " (expected below 1)";
    for (let i = 1; i < d.length; i++) if (!(d[i] > d[i - 1])) return k + " not rising at L" + i;
    for (let i = 2; i < d.length; i++) if (d[i] - d[i - 1] < d[i - 1] - d[i - 2] - 1e-9) return k + " flattens at L" + i;
  }
  if (Object.keys(r).length !== 7) return "STAT_CURVE covers " + Object.keys(r).join(",");
});
check("curve: SOL's rate is flat (never raise SOL's fire rate)", () => {
  const r = run(`[curveAt("sol", 0).rate, curveAt("sol", SKILL_POINTS).rate]`);
  if (r[0] !== 1 || r[1] !== 1) return "SOL rate " + r;
});
check("curve: range nudges from the axes add at most 20%", () => {
  const r = run(`(() => { let worst = 0; for (const kind in SKILL_MOVE) { const t = { id: 99, kind, x: CX, y: CY, lvl: 14, skills: {} };
    SKILL_TREES[kind].forEach((ax, i) => t.skills[ax.id] = i ? 4 : 5); const s = { range: 1, slide: 1 }; skillMove(t, s); worst = Math.max(worst, s.range); } return worst; })()`);
  if (r > 1.2 + 1e-9) return "a full tower's range nudge x" + r;
});
check("curve: a sim game boots and runs two waves with aspira-curve.js loaded", () => { /* spawnSync node -e on scripts/aspira-sim/sim.mjs makeGame + 2 waves; non-zero exit = FAIL */ });
```

- [ ] **Step 4: Run** `node scripts/spire-smoke/smoke.mjs | grep -A1 curve:` — Expected: the four curve checks FAIL (`STAT_CURVE is not defined`; the range one fails on SOL's x2).
- [ ] **Step 5: Implement** `web/aspira-curve.js` (Interfaces above; header comment in the file's style, dated, citing the spec), add it to the template and `sim.mjs` `FILES`; in `skillMove` multiply `s.range` by `nudge(product of the axes' range factors)` (slide unchanged).
- [ ] **Step 6: Run** the full smoke — Expected: all pass (69 + 4). Any older check that read SOL's x2 range fails: rewrite it against `NUDGE_MAX`.
- [ ] **Step 7: Commit** `git commit -m "Spire tiers: one stat curve by total level (placeholder ends), range nudges capped at +20%"`

---

### Tower tasks: shared shape

Every tower task (2-8) has the same steps; each task lists only what is its own.

- **Step A (failing checks)** in `tiers.mjs`, one `check` per bullet in the task's **Checks**, plus three shared ones written once in Task 2 as a helper `towerTierChecks(kind, tier0Words)`: (1) the kind is in `CURVE_DONE` and two single-axis tier I builds of it (`{ax: 1}` for each axis) have `s.dmg`, `s.rate`, `s.range` within x1.2 of `curveAt(kind, 1)` x the bare base; (2) `STAT_ROWS[kind]` at tier 0 and at each single-axis tier I renders no `NaN` / `undefined`; (3) `describeTower(kind, {})` contains none of `tier0Words`.
- **Step B:** run, watch them fail for the expected reason.
- **Step C:** implement: `curveBase` first in the stats function; delete the task's **Removed** tables (and every reader; a capstone push in `aspira-capstone.js` for a deleted table goes too); write the **Table edits**; the **Mechanics**; update `DESCRIBE[kind]` and `STAT_ROWS[kind]` to the new numbers (the sentence names only mechanics the tower has).
- **Step D:** full smoke green. An older check that encoded the old tier-0 or old damage tables is updated to the new rule, with the reason in its name; never deleted unless its feature is gone (say so in the ledger).
- **Step E:** commit `Spire tiers: <KIND> on the curve, plain at tier 0, <tier I hints>`.

---

### Task 2: ARC

**Removed:** `ARC_SIDE_DMG`, `ARC_VOLTAGE_DMG`, `ARC_CONDUCTIVITY[*].d`. `ARC_CONDUCTIVITY[*].q` becomes a rate nudge through `nudge()`.
**Table edits:** `ARC_CONDUCTIVITY[0].j = 0` (no chain), `[1].j = 1` (one jump); `f` leaves Conductivity. New `VOLT_FORK = [1, 2, 2, 2, 3, 3]` (Voltage: forks per jump; tier I one fork). `ARC_CAPACITANCE[1]` stays `{ n: 1, ... }` (one charge).
**Mechanics:** `s.branch = VOLT_FORK[v]`; `s.layers = max(sh.j, VOLT_FORK[v] > 1 ? 1 : 0)` (a fork with no chain splits the strike once). The double strike (`ARC_ECHO_K`) stays.
**Checks:** tier 0 hits exactly one enemy per strike among five in reach (count `damage` calls on distinct enemies over one attack, echo excluded); Conductivity I alone hits two in a line, Voltage I alone hits two beside the struck one; `tier0Words = ["fork", "charge", "same place"]`.

### Task 3: SOL

**Removed:** `SOL_REFRACTION_DMG`. Rate stays `b.rate` (curve rate flat).
**Table edits:** `SOL_BEAMS[0] = 1, [1] = 1`; `SOL_PASS[0] = 0` (stops at its first enemy); new `SOL_PASS_N = [0, 1, Infinity, Infinity, Infinity, Infinity]` (enemies a beam passes through, by Focus); `SOL_REFRACTION[0] = 0, [1] = 1`; `SOL_FAN` becomes by-tier `[0, 1, 2, 2, 2, 6]`; `SOL_SCORCH[0] = 0` (no burn), `SOL_SCORCH[1]` keeps its tier I value; `SOL_BREACH_ARMOR[0] = 0, [1] = 0` (the strip starts at II, today's I).
**Mechanics:** `solPierce` stops after `st.passN` enemies; at Focus I the pass-through runs at today's base share (0.5); no reflection when `st.refraction` is 0; no `st.dot` when the scorch is 0.
**Checks:** tier 0: three enemies in a line, only the first is hit, no burn, armor unchanged; Focus I: the second is hit, not the third; Reflection I: exactly one bounce; Breach I: a shielded enemy loses one charge to the burn's ticks per tick, armor unchanged; `tier0Words = ["reflect", "pass", "scorch", "break"]`.

### Task 4: CRR

**Removed:** `CRR_SHOT_MUL`, `CRR_SIDE_DMG`, `CRR_RATE_MUL`. `CRR_TETHER_K` becomes one constant `CRR_TETHER_K0` (its tier II value: the pulse starts at II, today's I).
**Table edits:** `CRR_HANGAR[0] = 1, [1] = 2`; `CRR_HOLD_FRAC[1]` set so `s.hold = 1`; `CRR_TETHER_SLOW[0] = 0` (no tether), `[1] = 0.35` (today's base); new `CRR_TETHER_N = [0, 1, Infinity, Infinity, Infinity, Infinity]` (interceptors that tether); new `CRR_BOLTS_BY = [1, 2, CRR_BOLTS, CRR_BOLTS, CRR_BOLTS, CRR_BOLTS]` (bolts a volley, by Armament; the volley's damage unchanged, split).
**Mechanics:** only the first `st.tetherN` interceptors out draw and apply a tether; a volley fires `st.bolts` bolts, each `1 / st.bolts` of the volley.
**Checks:** tier 0 launches one interceptor, no tether beam, one bolt a volley; Hangar I: two interceptors, one held circling when nothing is in range; Tether I: one tether at most with three interceptors out; Armament I: two bolts a volley, same total; `tier0Words = ["tether", "circling", "wingmate"]`.

### Task 5: FRZ

**Removed:** `FRZ_MOON_HIT` (raw; moons hit as the tower), `FRZ_RIME_BITE` becomes the constant `FRZ_RIME_BITE0` (its tier I value).
**Table edits:** none to counts (`FRZ_MOON_COUNT[1]` is already 1).
**Mechanics:** the aura's damage per second comes from the curve and is split over Sublimation's ticks: `s.dmg = dps * FRZ_TEMP_TICK[f]`, `s.rate = 1 / FRZ_TEMP_TICK[f]`, where `dps` = the curve damage x `b.rate * FRZ_TICK / FRZ_TEMP_TICK[0]` (so Sublimation buys ticks, not damage). At Sublimation 0 the aura only slows: no tick damage (`s.dmg = 0` for the aura; the Rime bite and moons use `s.biteDmg = dps`). "Hurts more the slower": a tick hits x `(1 + slowOf(e))` where `slowOf` is the enemy's current slow share (0..1).
**Checks:** tier 0: an enemy in the aura is slowed and takes no damage; Sublimation I: it takes damage, more when also slowed by another source; Permafrost I: a pulse reaches it and cracks armor; Moons I: one moon; `tier0Words = ["hurts", "pulse", "moon", "more damage"]`.

### Task 6: ACD

**Removed:** `ACD_BASE_DMG_MUL`, `ACD_CORROSION_DMG`, `ACD_SPRAY_MUL`. `ACD_PUDDLE_HEAT` becomes the constant `ACD_POOL_HEAT` (its tier I value). Kill pools go: the drop-on-kill under a jet, `s.spread` and the spread-on-pool-kill (`ACD_SPREAD_MAX` and its reader).
**Table edits:** `ACD_LINES[0] = 1, [1] = 2`; `ACD_CONTAGION[0] = null` (no pools), `[1]` keeps its tier I pool; the pool slow moves from Flow to Contagion: `s.burnSlow = ACD_POOL_SLOW[contagion]` with `ACD_POOL_SLOW` = today's `ACD_FLOW_SLOW` values one rung up (`[0, ACD_FLOW_SLOW[1], ACD_FLOW_SLOW[2], ...]`), `ACD_FLOW_SLOW` deleted.
**Mechanics:** `stepPuddles` returns at once when `st.contagion` is null; pools drip only from a ray, never from a kill.
**Checks:** tier 0: one ray, no pool after 3 s on a held enemy, a kill leaves no pool; Flow I: two rays and the carry; Contagion I: the ray drips a pool, an enemy in it is slowed, a kill in a pool spawns no pool; Corrosion I: a hit strips armor; `tier0Words = ["pool", "puddle", "slow", "spread"]`.

### Task 7: GRV

**Removed:** `GRV_RATE_MUL`, `GRV_NOVA_MUL` (the nova hits `st.dmg x GRV_NOVA_K`), the `rm / rh` compensation (`s.hdmg = s.dmg`, `s.evapK = 1`). `GRV_STRIP_MUL`, `GRV_INNER_T`, `GRV_PELLET_K` become constants `GRV_STRIP_K0`, `GRV_INNER_K0`, `GRV_PELLET_K0` (their tier I values; `GRV_PELLET_K0` then x2 — "more useful").
**Axis:** Supernova becomes **Nova** (`name: "Nova"`, id `supernova` kept for saves): it adds the slowing aura. `GRV_SLOW` and `GRV_AURA_R` read the Nova tier (`GRV_AURA_R[max(n, v)]` for the strip's reach when Void is bought without Nova); `GRV_NOVA_R` reads `max(n, v)` as today.
**Mechanics:** tier 0 fires the nova alone — no sphere. A sphere forms when any axis is bought, with flags: `hole` (Void >= 1: the black hole, its mass, the armor strip and the inner burn), `aura` (Nova >= 1: the slowing aura), `pellets` (Radiation >= 1). A sphere without `hole` draws no black disc and lives `GRV_LIFE` unfed. Radiation's pellets draw brighter and bigger: `GRV_PEL_DRAW = { r: x1.6, a: x1.5 }` over today's look (no new colour or alpha token without the palette lint's `--update`).
**Checks:** tier 0: one nova hit, no sphere in `t.spheres` (or the file's equivalent) 0.5 s later; Void I: a hole forms and strips armor, no slow; Nova I: an aura slows, no hole drawn; Radiation I: pellets fly with no hole; `tier0Words = ["black hole", "aura", "pellet", "strip"]`.

### Task 8: IFR

**Removed:** `IFR_CHARGE_S` as a per-tier rate (the charge time is `IFR_CHARGE_S0 / curve.rate`, `IFR_CHARGE_S0 = 1.4`), `IFR_ROUTE_K` becomes `IFR_ROUTE_K0 = 1.5`, `IFR_TICK_K` becomes `IFR_TICK_K0` (its tier I value). Locked and untouched: `IFR_BEAM_L`, `IFR_BEAM_W`, `IFR_FLARE_K`, `IFR_BIG_*`.
**Table edits:** `IFR_FAN[0] = 0, [1] = 2` (a fan of two); fire only from Hellfire I (`IFR_FIRE_FLOOR` applies when Hellfire >= 1; tier I is a small fire that rides its enemy, its radius `IFR_FIRE_R[1]`); new `IFR_FLARE_N = [0, 1, ...today's counts by tier]` (tier I: one flare at the impact).
**Mechanics:** a tier 0 meteor hits and leaves nothing: no fan, no fire, no flare.
**Checks:** tier 0: after one impact, `t.ifrFires`, `t.ifrFlares` empty and no spawned meteors; Meteor I: two fan meteors; Hellfire I: one fire riding the struck enemy; Flare I: one flare; `tier0Words = ["fan", "fire", "flare", "hellfire"]`.

---

### Task 9: Tier I names, the Nova axis, docs

**Files:** `web/aspira-skills.js`, `web/aspira-grv.js`, `web/aspira-crr.js`, `web/aspira-ifrit.js`, `web/aspira-capstone.js` (drop the `"Spark"` unshift), `ARCHITECTURE.md` (§4 tower pages: tier 0 / tier I and the curve; §6 the ladder), the stale header comments in `aspira-skills.js` / `aspira-capstone.js`.

Tier I names (Claude's calls, the doc lists them for Wai):

| Tower | Axis 1 | Axis 2 | Axis 3 |
|---|---|---|---|
| ARC | Conductivity: Lead | Voltage: Fork | Capacitance: Charge |
| SOL | Focus: Lance | Reflection: Glint | Breach: Singe |
| CRR | Hangar: Escort | Tether: Line | Armament: Twin |
| FRZ | Sublimation: Nip | Permafrost: Rime | Moons: Crescent |
| ACD | Corrosion: Pit | Flow: Drip | Contagion: Seep |
| GRV | Void: Sink | Nova: Halo | Radiation: Ember |
| IFR | Meteor: Split | Hellfire: Cinder | Flare: Flicker |

- [ ] **Step 1: Failing check** — every `SKILL_TREES[kind][i].tiers[0].name` is in the table above, no tier named `"Spark"` remains as a placeholder (ARC Voltage II keeps its own "Spark"), and `SKILL_TREES.grv[1].name === "Nova"`.
- [ ] **Step 2: Run** — FAIL on `"Spark"`.
- [ ] **Step 3:** write the names as each tree's first tier; remove the capstone file's unshift; rename the GRV axis; update ARCHITECTURE.md and the stale comments (the 16-point / 0..IV wording).
- [ ] **Step 4:** full smoke green, then pinned sims: `ASPIRA_WEB=<snapshot>/web node scripts/aspira-sim/solo.mjs 2` and `ASPIRA_WEB=<snapshot>/web SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69 KINDS=arc,frz,sol,acd,grv,crr,ifr node scripts/aspira-sim/countermx.mjs 1` — Expected: both finish with no thrown error (numbers are plan 3's).
- [ ] **Step 5: Commit** `Spire tiers: tier I names, GRV's Nova axis, docs`.

## Later

- **Plan 3, balance battery:** fit `STAT_CURVE` and `CURVE_P`, the duo rule (ease waves 1-12 alike if two tier 0 towers leak), price ladder + bounty to the economy target (trioplan), marks target C with countermx's point count re-picked, the two-type rule, changelog, ship as the next minor.
