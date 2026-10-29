# Ifrit Tower Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IFR (Ifrit), the seventh Spire tower: corner-slot charge balls lobbed slowly at a target, bursting into an expanding ring plus pellets that burst into burning six-beam flares; re-space all seven tower hues 51.4 OKLCH degrees apart; ship as 6.2.0.

**Architecture:** One new kind module `web/aspira-ifrit.js` (tables, `ifrSkillStats`, `stepIfr`, `drawIfr`) loaded after `aspira-crr.js`, hooked into the same per-kind tables the carrier uses (defs, game loop, towers, core, capstone, stats, sliders, desc, sfx, chooser, css, template, board API, smoke, simulator). Every ball, ring, pellet and flare is a plain object in a list on its tower (`t.ifrBalls`, `t.ifrRings`, `t.ifrPellets`, `t.ifrFlares`), so `G` stays structured-cloneable. All hits go through `damage()`; burns are quiet ticks that pop one shield charge each.

**Tech Stack:** Vanilla JS in one global scope (no modules), canvas 2D primitives that the 3D moving layer turns into GL instances, Python 3 (`spire_board.py`, tests), Node 18 (smoke + simulator), exec-fn's pre-commit lints (ruff, ESLint `max-lines-per-function: 100`, 500-line file cap, palette lint, `lint-swallowed.py`).

**Spec:** `docs/superpowers/specs/2026-10-19-ifrit-tower-design.md`

## Global Constraints

- Version **6.2.0** (`web/aspira-version.txt`); the owner keeps it within 6 — not 7.0. Land AFTER exec-fn-f8's 6.1.0 balance push (it owns `aspira-crr.js`, `aspira-skills.js`, `aspira-towers.js`, `aspira-game.js`, `aspira-capstone.js` until then); rebase onto it.
- Kind id `ifr`, shown `IFR`, name `Ifrit`, blurb `Kilika's hellfire.`, colour key `tifr`, token `--asp-ifr-hsl`.
- Matrix: `COUNTERS.swarm.main` + `ifr`, `COUNTERS.shield.main` + `ifr`; no `help` entries; neutral armor (no pierce, no bonus); weak to fast (slow ball, no lead).
- Slots on the hex corners: counts 1, 2, 3, 6 only (`IFR_SLOTS = [1, 2, 2, 3, 3, 3]`, capstone 6); 1 = a corner picked at build, 2 = + its opposite, 3 = every other corner, 6 = all.
- Launch gap `IFR_LAUNCH_GAP = 0.05` s; the ball is aimed at the target's position NOW, never led.
- A missed pellet bursts where it was aimed. Every burn obeys `EFFECT_MAX_S` 10 s. Off-screen enemies (`!e.seen`) are never hit.
- Code rules (ARCHITECTURE.md 11): no mid-line `//` in game JS (use `/* */`); new globals prefixed `IFR_` / `ifr`; every per-tier table has exactly 6 entries before `aspira-capstone.js` loads; functions under 100 lines; file under 500 lines; `G` structured-cloneable (no functions / DOM nodes / closures in it); colours never in JS literals.
- Commit INSIDE `apps/spire`; then bump exec-fn's pointer (`git -C ~/src/exec-fn add apps/spire && git commit -m "apps/spire -> <sha>: ... [skip-docs]" && git push`); deploy with `ssh wai-root@wai-lau.net 'bash /exec-fn/scripts/deploy.sh'` only at the end (Task 9).
- Every commit message ends with the two attribution lines (`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and the `Claude-Session:` line from the session).

## Review Focus

1. A ball whose target dies mid-flight must still fly to its aim spot and burst there (pinned: Task 4 smoke check "a ball bursts where it was aimed").
2. A tower sold or dragged while balls charge: charge balls are drawn from `t.x`/`t.y` every frame (never stored positions), and selling a tower with balls, rings and flares alive throws nothing (pinned: Task 5 smoke check "sell mid-flight").
3. Autosave: `structuredClone(G)` must succeed with every Ifrit list populated — no enemy object references inside balls/pellets/flares, only ids and coordinates (pinned: Task 5 smoke check "G clones").
4. Hellfire capstone beams run to the play-box edges (over 1000 u); the burn tick must stay bucketed (sample points every `GRID_S` along the beam through `enemiesNear`), never all flares x all enemies (pinned: Task 6 smoke check "200 enemies, 40 flares under 4 ms a tick").
5. Shields: the ring, a pellet hit and every burn tick each pop exactly one charge; a shield wave inside a flare melts charge by charge, and a quiet tick on a shielded enemy pops without a flash spam (pinned: Task 6 smoke check "a shielded enemy loses one charge a tick").

---

### Task 1: The seven hues

**Files:**
- Modify: `web/aspira.css` (line 529 `#asp { --asp-blue-hsl ... }`, the `.asp-sw` rules at 520-537, the `[data-kind]` rule blocks at 298-304, 411-417, 557-562, 567-572)
- Modify: `web/aspira-ascend.css:40-45`, `web/aspira-endstats.css:18-23`
- Modify: `api/templates/aspira.html` (the `.asp-sw` swatch list, lines 52-76)
- Create: `scripts/aspira-sim/hues.py` (the ring calculator; from the session scratchpad `huelib.py` + `swatch.py`)
- Modify: `web/aspira.css` comment block 516-519 (the hue note)

**Interfaces:**
- Produces: the CSS token `--asp-ifr-hsl` and the swatch key `tifr` (read by `resolveColors()` into `COL.tifr`); every `[data-kind="ifr"]` rule.

- [ ] **Step 1: Add `scripts/aspira-sim/hues.py`** — copy the scratchpad's `huelib.py` functions (sRGB<->OKLab, gamut map, CIEDE2000) and a `main` that prints, for an anchor hue (argv[1], default 50), the seven slots `sol, ifr, arc, acd, frz, crr, grv` at hue `anchor + (i-1) * 360/7`, each existing tower keeping its OKLCH L and C from the CURRENT tokens (`CUR` dict), ARC lifted to L 0.88, IFR at L 0.76 C 0.19, gamut-mapped, as `hsl` token strings, plus the neighbour dE2000 table. Header comment: `# the seven tower hues, OKLCH 360/7 apart (owner 2026-10-19: "7 equidistant slots, calibrated for human colour discrimination"); python3 hues.py [anchor]`.

- [ ] **Step 2: Run it** — `python3 -I scripts/aspira-sim/hues.py 50`. Expected tokens (rounded): SOL `339 91% 77%`, IFR `23 100% 65%`, ARC `55 63% 67%`, ACD `140 61% 65%`, FRZ `184 95% 48%`, CRR `212 91% 55%`, GRV `278 85% 43%`; inks GRV `264 89% 80%`, CRR `218 100% 75%`.

- [ ] **Step 3: Rewrite the token line** in `web/aspira.css` (line 529) with the printed values: `--asp-blue-hsl: 212 91% 55%; --asp-violet-hsl: 278 85% 43%; --asp-violet-ink-hsl: 264 89% 80%; --asp-blue-ink-hsl: 218 100% 75%; --asp-solar-hsl: 339 91% 77%; --asp-arc-hsl: 55 63% 67%; --asp-frz-hsl: 184 95% 48%; --asp-acd-hsl: 140 61% 65%; --asp-ifr-hsl: 23 100% 65%;` (keep `--asp-ltblue-hsl`, `--asp-yellow-hsl`, `--asp-threat-hsl`, the `--asp-bh-*` as they are). Replace the comment block at 516-519 with: `/* THE SEVEN TOWER HUES, the same angle apart FOR THE EYE: OKLCH hues 359 / 50 / 101 / 153 / 204 / 256 / 307 (SOL IFR ARC ACD FRZ CRR GRV, 360/7 apart; the six were 60 apart at 13 / 73 / 133 / 193 / 253 / 313, 2026-10-16), each keeping its own OKLCH lightness and chroma (pulled in to stay in sRGB) - ARC lifted to L 0.88 for a clean lightning yellow; neighbours checked by CIEDE2000, the closest pair 25 (scripts/aspira-sim/hues.py). The ink tokens shift by their tower's delta. Owner, 2026-10-19: "7 equidistant slots ... calibrate for Human Color Discrimination" */`.

- [ ] **Step 4: Add the swatch and the kind rules.** After `.asp-sw.tacd { ... }` add `.asp-sw.tifr { color: hsl(var(--asp-ifr-hsl)); } /* IFR, the fire tower (2026-10-19): Kilika's orange */`. In each of the four `[data-kind]` blocks add the `ifr` line after `crr`: `.asp-spend[data-kind="ifr"] { --green-hsl: var(--asp-ifr-hsl); }`, `.asp-pop[data-kind="ifr"] { --green-hsl: var(--asp-ifr-hsl); }`, `.asp-chooser[data-kind="ifr"] { --green-hsl: var(--asp-ifr-hsl); }`, `.asp-card[data-kind="ifr"] { --green-hsl: var(--asp-ifr-hsl); }`. In `aspira-ascend.css` add `.asp-asc-k[data-kind="ifr"] { color: hsl(var(--asp-ifr-hsl)); }`; in `aspira-endstats.css` add `.asp-end-towers tr[data-kind="ifr"] { color: hsl(var(--asp-ifr-hsl)); }`. In the template after the `tacd` span add `<span class="asp-sw tifr" data-asp-sw="tifr"></span>`.

- [ ] **Step 5: Palette lint** — `cd ~/src/exec-fn && python3 scripts/lint-colors.py`; if it reports the new token / raw literal, eyeball `/UI` is not needed for a tower token (the owner approved the ring in the spec): run `python3 scripts/lint-colors.py --update` and include the baseline file(s) it rewrites in the commit. Also `python3 scripts/lint-scale.py`.

- [ ] **Step 6: Smoke** — `node scripts/spire-smoke/smoke.mjs` from `apps/spire`. Expected: all checks pass (no kind yet; the CSS is inert).

- [ ] **Step 7: Commit** (inside apps/spire): `git add web/aspira.css web/aspira-ascend.css web/aspira-endstats.css api/templates/aspira.html scripts/aspira-sim/hues.py` (+ exec-fn baselines if updated, committed in exec-fn) — message `Spire: seven tower hues 360/7 OKLCH apart, IFR orange, ARC yellow`.

---

### Task 2: Register the kind — module skeleton, tables, every per-kind hook

**Files:**
- Create: `web/aspira-ifrit.js`
- Modify: `web/aspira-defs.js:343-351` (TOWERS), `:358` (COUNTERS), `:430-490` (towerStats switch)
- Modify: `web/aspira-game.js:465` (the step dispatch), `web/aspira-towers.js:358` (MOVE_BASE), `web/aspira-core.js:96-101` (relayStats)
- Modify: `web/aspira-capstone.js` (CAPSTONE_NUM, CAPSTONE_MOVE, CAPSTONE_TIERS), `web/aspira-stats.js` (SPEC), `web/aspira-sliders.js:134` (STAT_SECTIONS), `web/aspira-desc.js` (DESCRIBE), `web/aspira-sfx.js` (SFX + SOUND_MAX), `web/aspira-chooser.js:141` (VS_MARKS), `web/aspira-draw.js:403` (draw call)
- Modify: `api/templates/aspira.html:92` (script tag), `scripts/aspira-sim/sim.mjs:16` (FILES), `scripts/aspira-sim/{countermx,axis,buildlog,powercurve,solo,tribal,trios}.mjs`, `scripts/aspira-sim/{marks,triscale}.py` (kind lists), `scripts/spire-smoke/smoke.mjs:61,107`
- Modify: `api/spire_board.py:48`, `tests/test_spire_board.py`

**Interfaces:**
- Produces: `ifrSkillStats(t, s, b)` filling `s.slots, s.chargeS, s.ballV, s.routeK, s.blastR, s.blastK, s.pellets, s.beamL, s.beamW, s.burnS, s.tickS, s.tickK, s.impact, s.hellfire, s.backdraft`; `stepIfr(t, dt)`; `drawIfr()`; tables `IFR_SLOTS, IFR_CHARGE_S, IFR_BALL_V, IFR_ROUTE_K, IFR_RANGE_M, IFR_BLAST_R, IFR_BLAST_K, IFR_PELLETS, IFR_BEAM_L, IFR_BEAM_W, IFR_BURN_S, IFR_TICK_S, IFR_TICK_K`.

- [ ] **Step 1: Write the failing smoke check.** In `scripts/spire-smoke/smoke.mjs` change both kind lists (lines 61 and 107) to `["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]`. Run `node scripts/spire-smoke/smoke.mjs`. Expected: FAIL — `build IFR` fails (`placeTower built nothing` or a thrown `TOWERS.ifr` undefined).

- [ ] **Step 2: Write the module skeleton** `web/aspira-ifrit.js`:

```js
// /spire - IFR, IFRIT (owner's design, 2026-10-19 - the fire aeon of FFX, orange): strong against swarm + shield, NEUTRAL to
// armor, weak to fast. It CHARGES balls on its hex corners (one slot at base, 2, 3, then all 6 at the capstone) and is never idle
// while a slot is free; a charged ball + an enemy in range = a launch, one every IFR_LAUNCH_GAP s. The ball flies SLOWLY at the
// enemy's spot at launch (no lead: a fast enemy walks out from under it), hitting what it passes through; where it lands a RING
// expands to the blast radius hitting everything it flares once, and PELLETS fly at the units inside the blast (they can miss);
// where a pellet stops it bursts into a FLARE - six beams 60 degrees apart, quiet ticks that pop a shield charge.
// Meteor: slots, charge rate, ball speed, en-route hit (Impact: 6 slots, charging as fast as it launches). Hellfire: the flare
// (Hellfire VI: beams to the play-box edges). Firaga: the blast and the pellet count (Backdraft VI: a pellet bursts into a
// smaller ring too). Loaded after aspira-crr.js (the simulator too); towerStats calls ifrSkillStats, the tower loop stepIfr,
// drawSceneTop drawIfr. Every list on the tower holds plain objects (ids and coordinates, never enemy refs): autosave clones G.
// Spec: docs/superpowers/specs/2026-10-19-ifrit-tower-design.md

// ---------- the numbers, by tier (index 0 = untaken; capstone.js pushes tier VI) ----------
const IFR_SLOTS = [1, 2, 2, 3, 3, 3]; // Meteor: charge slots on the hex corners - 1, 2 (opposite), 3 (a triangle); VI all 6 (owner: "skip 4 and 5")
const IFR_CHARGE_S = [2.0, 1.6, 1.3, 1.0, 0.8, 0.6]; // Meteor: s to fill one ball (VI 0.1: "near the launch rate")
const IFR_BALL_V = [140, 170, 200, 240, 280, 320]; // Meteor: u/s in flight - SLOW, the fast weakness (VI 360)
const IFR_ROUTE_K = [0.25, 0.5, 1, 2, 4, 8]; // Meteor: the en-route hit, x the blast hit ("a lot to make up for the faster travel speed"; VI 16)
const IFR_BEAM_L = [50, 65, 80, 100, 120, 140]; // Hellfire: a flare beam's half-length, u (VI: to the play-box edges)
const IFR_BEAM_W = [10, 12, 14, 16, 18, 20]; // Hellfire: its width, u
const IFR_BURN_S = [1.5, 2, 2.5, 3, 4, 5]; // Hellfire: a flare burns this long (VI 10 = EFFECT_MAX_S)
const IFR_TICK_S = [0.3, 0.27, 0.24, 0.2, 0.17, 0.15]; // Hellfire: s between burn ticks
const IFR_TICK_K = [0.08, 0.12, 0.18, 0.27, 0.4, 0.6]; // Hellfire: a tick, x the blast hit
const IFR_BLAST_R = [60, 70, 80, 95, 110, 130]; // Firaga: the ring's reach, u
const IFR_BLAST_K = [1, 1.5, 2.3, 3.5, 6, 10]; // Firaga: the blast hit, x TOWERS.ifr.dmg
const IFR_PELLETS = [5, 6, 7, 8, 9, 10]; // Firaga: pellets a burst
const IFR_LAUNCH_GAP = 0.05, IFR_BALL_R = 10, IFR_RING_V = 600, IFR_PELLET_V = 300, IFR_PELLET_HIT = 4, IFR_PELLET_K = 0.25, IFR_MINI_K = 0.5; // s between launches; the ball's hit radius (+ the enemy's size); the ring's speed u/s; a pellet's speed and hit pad; a pellet hit x the blast hit; Backdraft's mini ring x radius and x hit
const IFR_FLARE_MAX = 60; // live flares a tower at most: the oldest goes (perf)
const IFR_ROUTE_ST = { shieldPop: 1 }, IFR_RING_ST = { shieldPop: 1 }, IFR_PELLET_ST = { shieldPop: 1 }, IFR_BURN_ST = { noFx: true, noNum: true, shieldPop: 1 }; // (damage: st.shieldPop; the burn is quiet)

SKILL_TREES.ifr = [
  { id: "meteor", name: "Meteor", tiers: [{ name: "Pebble" }, { name: "Stone" }, { name: "Rock" }, { name: "Boulder" }, { name: "Meteor" }] },
  { id: "hellfire", name: "Hellfire", tiers: [{ name: "Kindle" }, { name: "Flare" }, { name: "Blaze" }, { name: "Inferno" }, { name: "Conflagration" }] },
  { id: "firaga", name: "Firaga", tiers: [{ name: "Ember" }, { name: "Fire" }, { name: "Fira" }, { name: "Firaga" }, { name: "Pyre" }] },
];
SKILL_MOVE.ifr = { meteor: [[1, 1], [1.1, 1], [1.2, 1], [1.3, 1], [1.4, 1], [1.5, 1]], hellfire: [[1, 1], [1.06, 1], [1.12, 1], [1.18, 1], [1.24, 1], [1.3, 1]], firaga: [[1, 1], [1, 1.3], [1, 1.6], [1, 2], [1, 2.2], [1, 2.4]] }; // Meteor and Hellfire = range, Firaga = slide (the fire roams)

function ifrSkillStats(t, s, b) {
  const m = skillOf(t, "meteor"), h = skillOf(t, "hellfire"), f = skillOf(t, "firaga");
  s.range = b.range * RANGE_BONUS; s.targets = 1;
  s.slots = IFR_SLOTS[m]; s.chargeS = IFR_CHARGE_S[m]; s.ballV = IFR_BALL_V[m]; s.routeK = IFR_ROUTE_K[m]; s.impact = m >= CAPSTONE_TIER;
  s.beamL = IFR_BEAM_L[h]; s.beamW = IFR_BEAM_W[h]; s.burnS = Math.min(EFFECT_MAX_S, IFR_BURN_S[h]); s.tickS = IFR_TICK_S[h]; s.tickK = IFR_TICK_K[h]; s.hellfire = h >= CAPSTONE_TIER;
  s.blastR = IFR_BLAST_R[f]; s.blastK = IFR_BLAST_K[f]; s.pellets = IFR_PELLETS[f]; s.backdraft = f >= CAPSTONE_TIER;
  s.dmg = b.dmg * s.blastK; s.rate = 1 / s.chargeS; // the card's Damage and Rate: the blast hit, balls a second
  s.skill = true;
}
function stepIfr(t, dt) { /* Task 3 */ }
function drawIfr() { /* Task 5 */ }
```

- [ ] **Step 3: Register the kind.** `aspira-defs.js` TOWERS: after `grv:` add `ifr: { name: "Ifrit", ab: "IFR", color: "tifr", cost: 40, dmg: 60 /* the blast hit (owner's starting value, 2026-10-19; the sim sets it) */, rate: 0.5 /* (unused: ifrSkillStats sets rate = 1 / the charge time) */, range: 200 /* a mortar: between CRR 160 and SOL 260 */, blurb: "Kilika's hellfire." /* owner, 2026-10-19 */, up: "slots" }, // IFR, the fire tower (owner, 2026-10-19; aspira-ifrit.js)`. COUNTERS: `swarm: { main: ["arc", "grv", "ifr"], ... }`, `shield: { main: ["acd", "crr", "ifr"], ... }` and update the comment: `// ifr: swarm + shield mains, 2026-10-19 (owner: neutral armor, weak to fast)`. towerStats switch: after `case "crr": ...` add `case "ifr": ifrSkillStats(t, s, b); break; // Ifrit (aspira-ifrit.js)`. `aspira-game.js:465`: after `if (t.kind === "crr") { stepCar(t, dt); continue; }` add `if (t.kind === "ifr") { stepIfr(t, dt); continue; }`. `aspira-towers.js` MOVE_BASE: add `, ifr: 200 /* medium, like ARC and GRV (owner's design, 2026-10-19) */`. `aspira-core.js` relayStats: add `if (kind === "ifr") s.chargeS /= m; // IFR: charges m times as fast`.

- [ ] **Step 4: The capstone entries.** `aspira-capstone.js` CAPSTONE_NUM: add `// IFR: Meteor every corner, charging as fast as it launches (Impact); Hellfire beams aflare the whole board; Firaga the biggest blast, the most pellets (Backdraft)` then `[IFR_SLOTS, 6], [IFR_CHARGE_S, 0.1], [IFR_BALL_V, 360], [IFR_ROUTE_K, 16], [IFR_BEAM_L, 140], [IFR_BEAM_W, 24], [IFR_BURN_S, 10], [IFR_TICK_S, 0.12], [IFR_TICK_K, 1], [IFR_BLAST_R, 160], [IFR_BLAST_K, 18], [IFR_PELLETS, 12],`. CAPSTONE_MOVE: `ifr: { meteor: [1.6, 1], hellfire: [1.4, 1], firaga: [1, 3] },`. CAPSTONE_TIERS: `meteor: { name: "Impact" }, hellfire: { name: "Hellfire" }, firaga: { name: "Backdraft" },`.

- [ ] **Step 5: The words and rows.** `aspira-stats.js` SPEC add:

```js
  // IFR (aspira-ifrit.js): Damage is the blast hit, Rate balls a second from one slot
  ifr: st => [["Slots", st.slots], ["Charge", st.chargeS + "s"], ["Ball speed", st.ballV], ["En route", dmgUnits(st.dmg * st.routeK)], ["Blast", "r" + st.blastR], ["Pellets", st.pellets + " × " + dmgUnits(st.dmg * IFR_PELLET_K)],
    ["Flare", (st.hellfire ? "to the edges" : "±" + st.beamL) + " · " + st.beamW + " wide"], ["Burn", dmgUnits(st.dmg * st.tickK) + " / " + st.tickS + "s · " + st.burnS + "s"], ["Shields", "−1 / hit, −1 / tick"],
    ["Backdraft", st.backdraft ? "pellets burst r" + Math.round(st.blastR * IFR_MINI_K) : "—"]],
```

`aspira-sliders.js` STAT_SECTIONS add `ifr: [["Meteor", ["Slots", "Charge", "Ball speed", "En route", "Rate", "Range"]], ["Hellfire", ["Flare", "Burn"]], ["Firaga", ["Damage", "Blast", "Pellets", "Backdraft", "Shields"]]],`. `aspira-desc.js` DESCRIBE add (and, near the top of the file, the two word lists):

```js
const IFR_BALLS = ["", "a ball", "two balls", "three balls", "", "", "six balls"]; // by SLOT count (IFR_SLOTS: 1 2 3, capstone 6)
const IFR_PELL = ["", "", "", "", "", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]; // by PELLET count (IFR_PELLETS 5..10, capstone 12)
```

```js
  // IFR (owner, 2026-10-19): Meteor more slots, faster, harder on the way (Impact: all six corners); Hellfire the flare of six beams
  // (Hellfire VI: aflare the whole board); Firaga a bigger blast, more pellets (Backdraft: a pellet bursts too)
  ifr(sk) {
    const m = sk.meteor || 0, h = sk.hellfire || 0, f = sk.firaga || 0;
    return "Charges " + IFR_BALLS[IFR_SLOTS[m]] + " on its corners and lobs each slowly at an enemy, burning what it passes. Where it lands a ring of fire bursts outward and " +
      IFR_PELL[IFR_PELLETS[f]] + " pellets fly at whatever stands in the blast; where a pellet stops a flare of six beams " + (h >= 6 ? "runs to the edges of the board" : "spreads") + (f >= 6 ? ", and the pellet bursts into a smaller ring." : ".");
  },
```

`aspira-sfx.js` SFX add `// IFR (2026-10-19): a ball leaving - a low thump; the ring - a crackle` then `ifr: () => { tone({ type: "sine", f0: 160, f1: 60, dur: 0.14, vol: 0.14 }); noise({ dur: 0.05, vol: 0.06, freq: 900, q: 1 }); },` and `ifrblast: () => { noise({ dur: 0.12, vol: 0.14, freq: 2200, q: 0.8 }); tone({ type: "sawtooth", f0: 300, f1: 90, dur: 0.1, vol: 0.05 }); },`; SOUND_MAX add `ifr: 3, ifrblast: 3`. `aspira-chooser.js` VS_MARKS add a placeholder `ifr: { swarm: 2, fast: -3, shield: 1, armor: 0 }` with the comment `/* IFR: placeholder until the countermx run (Task 8) */` — note `armor: 0` renders no mark (vsMarks filters falsy). `aspira-draw.js:403`: after `drawCar();` add `drawIfr();`.

- [ ] **Step 6: Load order and the lists.** Template line 92: after the crr script add `<script src="/aspira-ifrit.js?v=1"></script>`. `sim.mjs` FILES: insert `"aspira-ifrit.js"` after `"aspira-crr.js"`. Append `ifr` to every default kind list: `solo.mjs:12`, `tribal.mjs:7`, `trios.mjs:10`, `powercurve.mjs:19`, `axis.mjs:10` (`ALL`), `marks.py:55` (`order`), `triscale.py:6` (`ALL`); add `ifr: ["meteor", "hellfire", "firaga"]` to every `AX` map (`countermx.mjs:58`, `axis.mjs:8`, `buildlog.mjs:11`, `powercurve.mjs:20`). `countermx.mjs:16` keep the default `"arc,frz,sol,acd"` (the marks command passes `KINDS=` explicitly; update the CLAUDE.md command in Task 9).

- [ ] **Step 7: The board API.** `api/spire_board.py:48`: `TOWER_KINDS = ("arc", "frz", "sol", "acd", "grv", "crr", "ifr")`. In `tests/test_spire_board.py` add:

```python
def test_team_accepts_ifrit(tmp_path, monkeypatch):
    """The seventh kind posts; an unknown kind still does not."""
    base = {"initials": "IFR", "lives": 5, "team": ["ifr", "arc"], "won": True, "wave": 120}
    assert spire_board.clean_entry(dict(base))["team"] == ["arc", "ifr"]
    assert spire_board.clean_entry(dict(base, team=["ifr", "xyz"])) is None
```

(match the module import name and fixture style the file already uses at line 150-160; if the file imports `clean_entry` directly, call it directly.)

- [ ] **Step 8: Run the smoke and the tests.** `node scripts/spire-smoke/smoke.mjs` — expected: `build IFR` passes (placed, range + tower + arrows draw), the capstone check passes (every IFR tier table covers VI, no `undefined` in the description). `cd ~/src/exec-fn && .venv/bin/pytest apps/spire/tests/test_spire_board.py -q` — expected: pass. A quick sim boot: `cd scripts/aspira-sim && node -e 'import("./sim.mjs").then(m => { const g = m.makeGame(1); g.reset(); console.log(g.run("KINDS.join(),TOWERS.ifr.name")); })'` — expected `arc,frz,sol,acd,crr,grv,ifr Ifrit` (order follows TOWERS).

- [ ] **Step 9: Lint and commit.** `bash ~/src/exec-fn/scripts/pre-commit` runs on commit (ESLint, 500-line cap, swallowed-comment lint, the smoke). Commit: `Spire: IFR registered - the kind, its chart tables, card words, board API; no behaviour yet`.

---

### Task 3: Charge, slots and launch

**Files:**
- Modify: `web/aspira-ifrit.js` (replace the `stepIfr` stub)
- Test: `scripts/spire-smoke/smoke.mjs` (new checks)

**Interfaces:**
- Produces: `ifrCorner(t, k)` -> `{x, y}` of hex corner k (0..5) at the tower's current spot; `ifrSlotCorners(t, n)` -> the corner indices for n slots; `t.ifrSlot0` (the corner picked at build), `t.ifrCharge` (0..1), `t.ifrReady` (charged balls), `t.ifrBalls` (in flight, Task 4 fills them), `t.ifrLaunchCd`.

- [ ] **Step 1: Write the failing smoke checks.** First add, above the IFR checks in `smoke.mjs`, a helper that puts a REAL enemy (spawned through `spawnEnemy`, held still by a huge stun) on its lane at about `dist` u from a tower — fake enemy literals do not survive `stepEnemies`, which walks every enemy along `PATHS[e.pi]`:

```js
// an enemy held still on lane 0 at about `dist` u from tower t (its lane point nearest that distance); shield / hp settable after
run(`function ifrNear(type, t, dist) {
  spawnEnemy(type, 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
  for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
  const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1e6; e.armor = 0; e.shield = 0; return e;
}`);
```

Then add, after the capstone check:

```js
check("IFR: charges on its corners, holds one ball at base, launches at a target in range", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e6; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0], out = { slot0: t.ifrSlot0, corners: ifrSlotCorners(t, 3) };
    for (let i = 0; i < 150; i++) step(1 / 30); // 5 s: one ball charged, a second cannot start (1 slot)
    out.ready = t.ifrReady; out.charge = t.ifrCharge;
    const c = ifrCorner(t, t.ifrSlot0); out.onCorner = Math.abs(Math.hypot(c.x - t.x, c.y - t.y) - CELL_S * TOWER_K) < 1;
    ifrNear("armor", t, 100);
    step(1 / 30); out.readyAfter = t.ifrReady; out.balls = (t.ifrBalls || []).length;
    return out;
  })()`);
  if (!(r.slot0 >= 0 && r.slot0 < 6)) return "no corner picked at build: " + r.slot0;
  if (JSON.stringify(r.corners.map(c => (c - r.slot0 + 6) % 6).sort()) !== "[0,2,4]") return "3 slots are not every other corner: " + r.corners;
  if (!r.onCorner) return "the slot is not on the hex corner";
  if (r.ready !== 1 || r.charge !== 0) return "after 5 s: ready " + r.ready + " charge " + r.charge + " (expected 1 ball, the second not charging)";
  if (r.readyAfter !== 0 || r.balls !== 1) return "no launch at a target in range: ready " + r.readyAfter + " balls " + r.balls;
  return "";
});
```

Run `node scripts/spire-smoke/smoke.mjs`. Expected: FAIL (`ifrSlotCorners is not defined`).

- [ ] **Step 2: Implement the charge and the launch** in `aspira-ifrit.js` (replace the stub):

```js
// ---------- the corners and the charge ----------
// a hex corner at the tower's CURRENT spot: its slot's pts, moved with it (drawTower moves the hex the same way)
function ifrCorner(t, k) { const c = CELLS[t.cell], p = c.pts[k % 6]; return { x: (t.x ?? c.x) + p.x - c.x, y: (t.y ?? c.y) + p.y - c.y }; }
// the corners n slots use (owner, 2026-10-19): 1 = the corner picked at build, 2 = + the opposite, 3 = every other corner, 6 = all
function ifrSlotCorners(t, n) {
  const a = t.ifrSlot0 ?? 0;
  if (n >= 6) return [0, 1, 2, 3, 4, 5];
  if (n >= 3) return [a, (a + 2) % 6, (a + 4) % 6];
  if (n >= 2) return [a, (a + 3) % 6];
  return [a];
}
function ifrInit(t) { if (t.ifrSlot0 == null) { t.ifrSlot0 = Math.floor(Math.random() * 6); t.ifrCharge = 0; t.ifrReady = 0; t.ifrLaunchCd = 0; t.ifrBalls = []; t.ifrRings = []; t.ifrPellets = []; t.ifrFlares = []; } }
// ALWAYS CHARGING while a slot is free (owner): the ball under way fills over chargeS, then waits in its slot; the next starts at once
function ifrCharge(t, st, dt) {
  if (t.ifrReady >= st.slots) { t.ifrCharge = 0; return; }
  t.ifrCharge += dt / Math.max(0.01, st.chargeS);
  while (t.ifrCharge >= 1 && t.ifrReady < st.slots) { t.ifrCharge -= 1; t.ifrReady++; }
  if (t.ifrReady >= st.slots) t.ifrCharge = 0;
}
// a launch: a charged ball + an enemy in range (the tower's targeting), one every IFR_LAUNCH_GAP s; aimed at the enemy's spot NOW,
// never led (the fast weakness). The ball leaves from the slot's corner (the last filled)
function ifrLaunch(t, st, dt) {
  t.ifrLaunchCd = Math.max(0, t.ifrLaunchCd - dt);
  if (t.ifrReady <= 0 || t.ifrLaunchCd > 0) return;
  const e = pickTargets(t, st, 1)[0];
  if (!e) return;
  const c = ifrCorner(t, ifrSlotCorners(t, st.slots)[t.ifrReady - 1]), d = Math.hypot(e.x - c.x, e.y - c.y) || 1;
  t.ifrBalls.push({ x: c.x, y: c.y, ax: e.x, ay: e.y, vx: (e.x - c.x) / d * st.ballV, vy: (e.y - c.y) / d * st.ballV, left: d / st.ballV, hit: [] }); // hit: enemy ids struck en route
  t.ifrReady--; t.ifrLaunchCd = IFR_LAUNCH_GAP; t.shots = (t.shots || 0) + 1; sfx("ifr");
}
function stepIfr(t, dt) {
  ifrInit(t);
  const st = towerStats(t);
  ifrCharge(t, st, dt);
  ifrLaunch(t, st, dt);
  stepIfrBalls(t, st, dt); stepIfrRings(t, st, dt); stepIfrPellets(t, st, dt); stepIfrFlares(t, st, dt); // Task 4
}
function stepIfrBalls() {} function stepIfrRings() {} function stepIfrPellets() {} function stepIfrFlares() {}
```

- [ ] **Step 3: Run the smoke.** Expected: the new check passes; every earlier check still passes.

- [ ] **Step 4: Commit** — `Spire: IFR charges balls on its corners and launches them (no flight yet)`.

---

### Task 4: Flight, the ring, the pellets, the flares

**Files:**
- Modify: `web/aspira-ifrit.js` (replace the four stubs)
- Test: `scripts/spire-smoke/smoke.mjs`

**Interfaces:**
- Consumes: `damage(e, amt, t, quiet, crit, st)`, `onHit(e, t, st, amt)`, `projGrid()` / `enemiesNear(x, y, g)` (aspira-grv.js), `keepLive(list)` (aspira-floats.js), `HIT_AT` / `hitFrom` (aspira-floats.js), `phoneBox()` (aspira-positioning.js), `ENEMIES[e.type].size`, `e.sizeMul`.
- Produces: `t.ifrRings[] = {x, y, r, R, hit: [], k}` (k: the hit multiplier, 1 or IFR_MINI_K), `t.ifrPellets[] = {x, y, ax, ay, vx, vy, left}`, `t.ifrFlares[] = {x, y, L, W, life, tick}`; `ifrBurst(t, st, x, y, k)`.

- [ ] **Step 1: Write the failing smoke checks:**

```js
check("IFR: a ball bursts where it was aimed (its target gone), the ring hits once, pellets fly, a flare burns", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "firaga", true); // Backdraft: pellets burst into rings too
    for (let i = 0; i < 90; i++) step(1 / 30); // a ball charged
    const e = ifrNear("shield", t, 120), f = ifrNear("shield", t, 125); e.shield = 5; f.shield = 5; const ex = e.x, ey = e.y;
    step(1 / 30); const ball = t.ifrBalls[0]; if (!ball) return { noBall: true };
    const aimedAt = Math.hypot(ball.ax - ex, ball.ay - ey) < 1 || Math.hypot(ball.ax - f.x, ball.ay - f.y) < 1;
    e.dead = true; e.gone = true; // the target dies in flight (f, 4 u down the lane, stays)
    let n = 0; while (t.ifrBalls.length && n++ < 200) step(1 / 30);
    const out = { aimed: aimedAt, rings: t.ifrRings.length, pellets: t.ifrPellets.length };
    for (let i = 0; i < 90; i++) step(1 / 30); // the ring flares f, pellets land, flares tick
    out.fShield = f.shield; out.flares = t.ifrFlares.length; out.fHits = f.shield < 5;
    return out;
  })()`);
  if (r.noBall) return "no ball launched";
  if (!r.aimed) return "the ball was not aimed at the target's spot at launch";
  if (r.rings < 1) return "no ring where the ball landed (target gone)";
  if (!(r.pellets >= 1 || r.flares >= 1)) return "no pellets / flares after the burst";
  if (!r.fHits) return "the second enemy inside the blast lost no shield charge";
  return "";
});
```

Run the smoke. Expected: FAIL (`rings 0`).

- [ ] **Step 2: Implement the flight and the burst:**

```js
// ---------- the flight: slow, small, hitting what it passes; it bursts at its AIM spot whatever happened to the target ----------
function stepIfrBalls(t, st, dt) {
  if (!t.ifrBalls.length) return;
  const g = projGrid();
  for (const b of t.ifrBalls) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.left -= dt;
    for (const e of enemiesNear(b.x, b.y, g)) {
      if (e.dead || b.hit.includes(e.id)) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + IFR_BALL_R;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      b.hit.push(e.id); const amt = st.dmg * st.routeK;
      const h0 = hitFrom; HIT_AT.x = b.x - b.vx; HIT_AT.y = b.y - b.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_ROUTE_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
    if (b.left <= 0) ifrBurst(t, st, b.ax, b.ay, 1);
  }
  keepLive(t.ifrBalls);
}
// the BURST: a ring from the spot, and pellets at the units inside the blast (random picks, with replacement); k: 1 a ball, IFR_MINI_K a Backdraft pellet
function ifrBurst(t, st, x, y, k) {
  const R = st.blastR * k;
  t.ifrRings.push({ x, y, r: 0, R, k, hit: [], left: R / IFR_RING_V + 0.05 });
  sfx("ifrblast");
  if (k < 1) return; // a mini ring sends no pellets
  const inside = [];
  for (const e of G.enemies) if (!e.dead && e.seen && (e.x - x) ** 2 + (e.y - y) ** 2 <= R * R) inside.push(e);
  if (!inside.length) return;
  for (let i = 0; i < st.pellets; i++) {
    const e = inside[Math.floor(Math.random() * inside.length)], d = Math.hypot(e.x - x, e.y - y) || 1;
    t.ifrPellets.push({ x, y, ax: e.x, ay: e.y, vx: (e.x - x) / d * IFR_PELLET_V, vy: (e.y - y) / d * IFR_PELLET_V, left: d / IFR_PELLET_V });
  }
}
// the RING: expands at IFR_RING_V to R; every enemy it flares takes the blast hit once (full splash - owner: good vs swarm)
function stepIfrRings(t, st, dt) {
  if (!t.ifrRings.length) return;
  for (const q of t.ifrRings) {
    q.r = Math.min(q.R, q.r + IFR_RING_V * dt); q.left -= dt;
    for (const e of G.enemies) {
      if (e.dead || !e.seen || q.hit.includes(e.id)) continue;
      const d2 = (e.x - q.x) ** 2 + (e.y - q.y) ** 2;
      if (d2 > q.r * q.r || d2 > q.R * q.R) continue;
      q.hit.push(e.id); const amt = st.dmg * q.k;
      const h0 = hitFrom; HIT_AT.x = q.x; HIT_AT.y = q.y; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_RING_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
    }
  }
  keepLive(t.ifrRings);
}
// the PELLETS: non-homing, at the unit's spot when fired; the first enemy touched stops one (a hit), else it stops at its aim spot
// (owner: "a missed pellet bursts where it was aimed"); where it stops, a FLARE - and at Backdraft a smaller ring too
function stepIfrPellets(t, st, dt) {
  if (!t.ifrPellets.length) return;
  const g = projGrid();
  for (const p of t.ifrPellets) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.left -= dt;
    let sx = p.ax, sy = p.ay, stop = p.left <= 0;
    for (const e of enemiesNear(p.x, p.y, g)) {
      if (e.dead) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + IFR_PELLET_HIT;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      const amt = st.dmg * IFR_PELLET_K, h0 = hitFrom; HIT_AT.x = e.x - p.vx; HIT_AT.y = e.y - p.vy; hitFrom = HIT_AT;
      try { damage(e, amt, t, false, false, IFR_PELLET_ST); } finally { hitFrom = h0; } onHit(e, t, st, amt);
      sx = p.x; sy = p.y; stop = true; break;
    }
    if (!stop) continue;
    p.left = 0; ifrFlare(t, st, sx, sy);
    if (st.backdraft) ifrBurst(t, st, sx, sy, IFR_MINI_K);
  }
  keepLive(t.ifrPellets);
}
function ifrFlare(t, st, x, y) {
  if (t.ifrFlares.length >= IFR_FLARE_MAX) t.ifrFlares.shift();
  t.ifrFlares.push({ x, y, L: st.beamL, W: st.beamW, life: st.burnS, left: st.burnS, tick: 0, edges: st.hellfire });
}
```

- [ ] **Step 3: Implement the flares' burn** (bucketed along each beam; the capstone's beams run to the play box):

```js
// the FLARE: six beams along the board's axes (3D is a view: world axes), burning for `life` - every tickS a QUIET tick on each
// enemy touching a beam, popping one shield charge. Enemies are found through the projectile grid at sample points every GRID_S
// along the beam (never all flares x all enemies); Hellfire VI runs each beam to the play box's edge (phoneBox)
const IFR_ONE_TICK = new Set();
const IFR_BEAMS = 6; // beams a flare: a hexagonal star, like the tower's own hex (owner, 2026-10-19: six, never a flare)
// one beam from (x, y) at angle a: len u long, or to the play box's edge at Hellfire VI (the first wall the ray meets)
function ifrBeamEnd(x, y, a, len, edges) {
  const c = Math.cos(a), s = Math.sin(a);
  if (edges) {
    const b = phoneBox(); let t = Infinity;
    if (c > 1e-9) t = Math.min(t, (b.x1 - x) / c); else if (c < -1e-9) t = Math.min(t, (b.x0 - x) / c);
    if (s > 1e-9) t = Math.min(t, (b.y1 - y) / s); else if (s < -1e-9) t = Math.min(t, (b.y0 - y) / s);
    len = Math.max(0, t);
  }
  return [x, y, x + c * len, y + s * len];
}
function ifrBeamEnds(f) { const out = []; for (let k = 0; k < IFR_BEAMS; k++) out.push(ifrBeamEnd(f.x, f.y, k * Math.PI / 3, f.L, f.edges)); return out; }
function ifrTickBeam(t, st, f, x0, y0, x1, y1, g, hit) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, len = Math.sqrt(L2), n = Math.max(1, Math.ceil(len / (GRID_S / 2))), half = f.W / 2, amt = st.dmg * st.tickK;
  for (let i = 0; i <= n; i++) {
    const sx = x0 + dx * i / n, sy = y0 + dy * i / n;
    for (const e of enemiesNear(sx, sy, g)) {
      if (e.dead || hit.has(e.id)) continue;
      const r = ENEMIES[e.type].size * (e.sizeMul || 1) + half;
      const u = Math.max(0, Math.min(1, ((e.x - x0) * dx + (e.y - y0) * dy) / L2)), px = x0 + dx * u, py = y0 + dy * u; // the nearest point of the beam to the body
      if ((e.x - px) ** 2 + (e.y - py) ** 2 > r * r) continue;
      hit.add(e.id); damage(e, amt, t, true, false, IFR_BURN_ST); onHit(e, t, st, amt);
    }
  }
}
function stepIfrFlares(t, st, dt) {
  if (!t.ifrFlares.length) return;
  const g = projGrid();
  for (const f of t.ifrFlares) {
    f.left -= dt; f.tick += dt;
    if (f.tick < st.tickS) continue;
    f.tick -= st.tickS; IFR_ONE_TICK.clear();
    for (const [x0, y0, x1, y1] of ifrBeamEnds(f)) ifrTickBeam(t, st, f, x0, y0, x1, y1, g, IFR_ONE_TICK);
  }
  keepLive(t.ifrFlares);
}
```

(`GRID_S` is aspira-grv.js's 64 u cell; a beam sample every half cell cannot skip a cell.)

- [ ] **Step 4: Run the smoke.** Expected: the new check passes. If `fHits` fails, confirm the ring's `r` reaches `f` (it sits 20 u off the aim spot, R = 160 at Firaga VI).

- [ ] **Step 5: A sim sanity run** — `cd scripts/aspira-sim && KINDS=ifr LAST=11 node solo.mjs 2>&1 | tail -5` (if `solo.mjs` takes `KINDS`; its line 12 shows it does). Expected: it runs to completion with no exception; note the lives lost (tuning is Task 8).

- [ ] **Step 6: Commit** — `Spire: IFR flight, ring, pellets and burning flares`.

---

### Task 5: The look, the sound and the clone/sell guards

**Files:**
- Modify: `web/aspira-ifrit.js` (replace the `drawIfr` stub)
- Test: `scripts/spire-smoke/smoke.mjs`

**Interfaces:**
- Consumes: `ctx`, `COL.tifr`, `COL.white`, `lowQ` (aspira-quality.js, `typeof lowQ === "function"` guarded), `skillOf`.

- [ ] **Step 1: Failing smoke checks:**

```js
check("IFR: draws its charge balls, rings and flares; G clones; selling mid-flight throws nothing", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let i = 0; i < 90; i++) step(1 / 30);
    ifrNear("swarm", t, 90);
    for (let i = 0; i < 60; i++) step(1 / 30);
    const out = { live: t.ifrBalls.length + t.ifrRings.length + t.ifrPellets.length + t.ifrFlares.length };
    const fn = v => typeof v === "function" || (v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) || (v && typeof v === "object" && Object.values(v).some(fn)); // a function or a non-plain object anywhere in G breaks the autosave's structured clone
    out.cloned = !fn({ t: [t.ifrBalls, t.ifrRings, t.ifrPellets, t.ifrFlares] });
    return out;
  })()`);
  if (r.cloned !== true) return "G does not clone: " + r.cloned;
  const seen = calls(env, ["drawIfr"], () => frames(env, 2));
  if (!seen.drawIfr) return "drawIfr never called";
  const n = drawn(env, () => frames(env, 1)).n;
  if (n < 60) return "only " + n + " canvas calls with IFR effects live";
  const sold = run(`(() => { try { const t = G.towers[0]; G.money += sellValue(t); G.towers = G.towers.filter(x => x !== t); ui.sel = null; for (let i = 0; i < 30; i++) step(1 / 30); return "ok"; } catch (e) { return String(e); } })()`); // what the card's sell button does (aspira-sliders.js)
  return sold === "ok" ? "" : "sell threw: " + sold;
});
```

Run: FAIL (`drawIfr never called` / low call count).

- [ ] **Step 2: Implement `drawIfr`:**

```js
// ---------- the look: orange balls growing on the corners, a small ball with a short trail in flight, a thinning ring, pellet
// streaks, and the flares - a wide faint beam with a bright hairline, fading as they burn. Fills, strokes and lines only (the
// 3D moving layer turns them into GL instances; no gradient on the board context) ----------
const IFR_BALL_PX = 13, IFR_FLY_PX = 6, IFR_TRAIL_S = 0.06, IFR_PELLET_PX = 2, IFR_PELLET_TAIL = 0.03, IFR_RING_W = 3, IFR_BEAM_A = 0.28, IFR_LINE_A = 0.85;
function drawIfrCharge(t, st) {
  const corners = ifrSlotCorners(t, st.slots);
  ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.9;
  for (let i = 0; i < corners.length; i++) {
    const full = i < t.ifrReady, k = full ? 1 : i === t.ifrReady ? t.ifrCharge : 0;
    if (k <= 0) continue;
    const c = ifrCorner(t, corners[i]);
    ctx.beginPath(); ctx.arc(c.x, c.y, IFR_BALL_PX * (0.3 + 0.7 * k), 0, 6.283); ctx.fill();
    if (full) { ctx.fillStyle = COL.white; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(c.x, c.y, IFR_BALL_PX * 0.35, 0, 6.283); ctx.fill(); ctx.fillStyle = COL.tifr; ctx.globalAlpha = 0.9; }
  }
}
function drawIfrFlight(t) {
  ctx.strokeStyle = COL.tifr; ctx.fillStyle = COL.tifr; ctx.lineCap = "round"; ctx.lineWidth = IFR_PELLET_PX; ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (const b of t.ifrBalls) { ctx.moveTo(b.x - b.vx * IFR_TRAIL_S, b.y - b.vy * IFR_TRAIL_S); ctx.lineTo(b.x, b.y); }
  for (const p of t.ifrPellets) { ctx.moveTo(p.x - p.vx * IFR_PELLET_TAIL, p.y - p.vy * IFR_PELLET_TAIL); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
  for (const b of t.ifrBalls) { ctx.beginPath(); ctx.arc(b.x, b.y, IFR_FLY_PX, 0, 6.283); ctx.fill(); }
  for (const q of t.ifrRings) { ctx.globalAlpha = 0.9 * (1 - q.r / q.R) + 0.1; ctx.lineWidth = IFR_RING_W; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.stroke(); }
}
function drawIfrFlares(t) {
  const low = typeof lowQ === "function" && lowQ();
  for (const c of t.ifrFlares) {
    const f = Math.max(0, c.left / c.life), ends = ifrBeamEnds(c);
    if (!low) { ctx.strokeStyle = COL.tifr; ctx.lineWidth = c.W; ctx.globalAlpha = IFR_BEAM_A * f; ctx.beginPath(); for (const [x0, y0, x1, y1] of ends) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke(); }
    ctx.strokeStyle = COL.white; ctx.lineWidth = 1; ctx.globalAlpha = IFR_LINE_A * f; ctx.beginPath(); for (const [x0, y0, x1, y1] of ends) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke();
  }
}
function drawIfr() {
  for (const t of G.towers) {
    if (t.kind !== "ifr" || t.ifrSlot0 == null) continue;
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    drawIfrFlares(t); drawIfrFlight(t); drawIfrCharge(t, towerStats(t));
  }
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 3: Run the smoke.** Expected: pass. Then eyeball in a browser: `cd ~/src/exec-fn && docker compose up -d` (if not running), open `http://localhost:8080/spire` (guest login), build IFR, watch the corners fill, a lob, the ring, the flares. Phone width 430 x 932 too. Fix anything that reads wrong (ball too small, ring too faint) by the constants above.

- [ ] **Step 4: Commit** — `Spire: IFR drawn - corner balls, lob trail, ring, pellets, flares; sound`.

---

### Task 6: Shields, perf and the capstones under test

**Files:**
- Modify: `scripts/spire-smoke/smoke.mjs`
- Modify (only if a check fails): `web/aspira-ifrit.js`

- [ ] **Step 1: Shield check:**

```js
check("IFR: a shielded enemy in a flare loses one charge a tick; the ring pops one; Impact gives six slots", () => {
  const r = run(`(() => {
    G = newGame(); G.money = 1e9; ui.build = "ifr";
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]);
    const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "meteor", true);
    const st = towerStats(t), out = { slots: st.slots };
    const e = ifrNear("shield", t, 400); e.shield = 9; // out of the tower's range: no ball, only the flare below touches it
    t.ifrFlares.push({ x: e.x - 40, y: e.y, L: 80, W: 12, life: 3, left: 3, tick: 0, edges: false }); // 40 u left of it: the 0-degree beam runs through its body
    for (let i = 0; i < 3; i++) stepIfrFlares(t, st, st.tickS); out.afterTicks = e.shield; // 3 ticks (the first fires at tickS)
    return out;
  })()`);
  if (r.slots !== 6) return "Impact gives " + r.slots + " slots, not 6";
  if (r.afterTicks !== 6) return "3 burn ticks left " + r.afterTicks + " charges of 9 (expected 6)";
  return "";
});
check("IFR: 200 enemies and 40 Hellfire flares tick under 4 ms", () => {
  run(`G = newGame(); G.money = 1e9; ui.build = "ifr";
    { const ci = CELLS.findIndex((c, i) => cellOpen(i)); placeTower(CELLS[ci]); }
    { const t = G.towers[0]; for (let k = 0; k < 6; k++) upgradeTower(t, "hellfire", true);
      for (let i = 0; i < 200; i++) { spawnEnemy("swarm", 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; e.s = entryS(0) + i * 3; const p = pathAt(0, e.s, 0); e.x = p.x; e.y = p.y; e.seen = true; e.stunT = 1e9; e.hp = e.max = 1e6; }
      for (let i = 0; i < 40; i++) t.ifrFlares.push({ x: CX - 300 + i * 15, y: CY - 200 + i * 10, L: 140, W: 24, life: 10, left: 10, tick: 0, edges: true }); }`);
  const t0 = performance.now(); // the HOST clock: the vm's performance.now is dom.mjs's fake frame clock
  run("{ const t = G.towers[0], st = towerStats(t); for (let i = 0; i < 10; i++) stepIfrFlares(t, st, st.tickS); }");
  const ms = (performance.now() - t0) / 10;
  return ms < 4 ? "" : "a Hellfire tick took " + ms.toFixed(1) + " ms";
});
```

Run: both should pass with the Task 4 code; if the perf check fails, raise the sample step to `GRID_S` and dedupe per beam with the shared Set (already done).

- [ ] **Step 2: Commit** — `Spire: IFR smoke checks - shields pop a charge a tick, Hellfire ticks stay bucketed, Impact six slots`.

---

### Task 7: The chooser's seventh card and the browser test

**Files:**
- Modify: `web/aspira-chooser.js` (comments only: "six" -> "seven"), `tests/test_spire_sliders_browser.py` (no change expected: it reads `KINDS.length`)
- Modify: `ARCHITECTURE.md` 7.2 ("six tower cards" -> "seven")

- [ ] **Step 1: Run the browser test** — `cd ~/src/exec-fn && .venv/bin/pytest apps/spire/tests/test_spire_sliders_browser.py -q -k build_cards`. Expected: pass at 1280x800 and 430x932 with 7 cards (two columns, the last row one short is allowed by `layoutCards`: `n % c === c - 1`). If the portrait check fails because 4 rows overflow, lower `CARD_TWO_MIN` is NOT the fix — `layoutCards` scrolls the build cards when taller than the screen (chooser.js:90); confirm `fit["cardsIn"]` logic tolerates that, else relax the test to count cards only on portrait with a comment.

- [ ] **Step 2: Regenerate the descriptions graph** — `node scripts/aspira-desc-graph.mjs > docs/spire-descriptions.md` (check the script's own usage line first: `head -5 scripts/aspira-desc-graph.mjs`).

- [ ] **Step 3: Commit** — `Spire: seven build cards; descriptions graph regenerated`.

---

### Task 8: Balance gates

**Files:**
- Modify: `web/aspira-ifrit.js` tables, `web/aspira-defs.js` (`TOWERS.ifr.dmg`), `web/aspira-chooser.js` (`VS_MARKS`)

Run on the droplet (`nice -n 19`, one at a time) or locally on the WSL box (12 cores; `POOL_WORKERS=8`). Change one lever at a time and record what moved.

- [ ] **Step 1: Alone** — `cd scripts/aspira-sim && KINDS=ifr node solo.mjs`. Gate: a lone L1 IFR loses 0 lives on waves 1-11; every L1 pair with IFR beats the Star. Lever: `TOWERS.ifr.dmg` (60) and `IFR_CHARGE_S[0]`.

- [ ] **Step 2: The matrix** — `SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69 KINDS=arc,frz,sol,acd,grv,crr,ifr node countermx.mjs 2 > cmx.out`. Gate: IFR's swarm and shield cells under 25% (the mains), fast over 60% (the weakness), armor between. Levers: `IFR_BLAST_R` / `IFR_BLAST_K` (swarm), `IFR_TICK_K` / `IFR_TICK_S` (shield), `IFR_BALL_V` (fast). Then `python3 marks.py cmx.out --write` (regenerates `VS_MARKS` for all seven).

- [ ] **Step 3: Per-axis** — `N=1 POINTS=8 WINDOWS=41-49,61-69,81-89,101-109 KINDS=ifr node countermx.mjs 2` (every axis at V + the rest spread). Gate: no axis leaks over 1.5x the others' mean on IFR's main types; even the tables where one axis is dead weight.

- [ ] **Step 4: Trios** — `REAL_LANES=1 SEEDS=1,2,3 KINDS=arc,frz,sol,acd,grv,crr,ifr node tribal.mjs tri.jsonl > tri.out && python3 triscale.py tri.jsonl`. Gate: IFR's factor 0.9-1.1; every previously winning trio still wins; the ARC-less trios with IFR win (SOL+ACD+IFR, SOL+GRV+IFR, ACD+GRV+IFR, GRV+CRR+IFR...). Apply the factor to `TOWERS.ifr.dmg` (squared, as the others were), rerun once.

- [ ] **Step 5: Phase margins** — `node axis.mjs` summary (early / mid / late factors). Gate: IFR within 0.9-1.1 in each phase.

- [ ] **Step 6: Commit** after each lever that moved: `Spire: IFR balance - <lever>: <before -> after>`; the marks: `Spire: build card marks regenerated with IFR (countermx 61-69 @6pts)`.

---

### Task 9: Version, changelog, docs, deploy

**Files:**
- Modify: `web/aspira-version.txt` (6.2.0), `web/aspira-changelog.js` (a new top entry), `ARCHITECTURE.md` (4.1, 4.6, new 4.6e, 7.2, 9.4, 10.1), `ARCHAEOLOGY.md` (4.6e: the starting numbers and what the sim moved), `CLAUDE.md` (the marks command's `KINDS=` list), `docs/arch/ifrit-ball.mmd` is already in; exec-fn `CLAUDE.md` (the `/spire` row: seven kinds)

- [ ] **Step 1: Version + changelog.** `web/aspira-version.txt` -> `6.2.0`. `aspira-changelog.js`: a new entry at the top `{ v: "6.2", day: "Oct 19", bu: ["Ifrit: a seventh tower - charges fireballs on its corners and lobs them; where one lands a ring of fire bursts and pellets fly, each leaving a flare of six beams. Strong against swarms and shields, weak to fast enemies.", "Towers: the seven colours are spaced evenly for the eye; Arc is yellow now, Ifrit orange."], ne: [], u: ["Build: seven cards."] }`. Update the file's header comment: a new tower is a new MAJOR, "except Ifrit, kept within 6 (owner, 2026-10-19)".

- [ ] **Step 2: ARCHITECTURE.md.** 4.1: title "The seven kinds", add the IFR column (design: a lobbed ball, a ring, burning flares; colour: orange; targeting Near; main: swarm, shield; helps: nothing; weak to: fast (slow ball, no lead); leash medium 200); the Ids line `arc frz sol acd grv crr ifr`; the ARC colour cell "yellow", SOL "pink", etc. per Task 1. 4.6: add the IFR column (swarm MAIN, fast weak, armor neutral, shield MAIN) and the `COUNTERS` note. New **4.6e IFR, Ifrit (`web/aspira-ifrit.js`)**: the owner's design in a rules table (charge, slots on the corners 1/2/3/6, launch gap, no lead, flight, ring, pellets, flare, shields, armor, fast, Relay), the axes table (Meteor / Hellfire / Firaga, capstones Impact / Hellfire / Backdraft), the diagram `![The ball's life](docs/arch/ifrit-ball.svg)`; numbers go to ARCHAEOLOGY. 7.2: "seven tower cards". 9.4: "a new tower is a new major (GRV, ATC) — Ifrit stayed within 6 as 6.2.0 (owner)". 10.1 colours: seven tokens, `--asp-ifr-hsl`, OKLCH 360/7 apart, `scripts/aspira-sim/hues.py`. 11 traps: add "IFR's lists hold ids and coordinates, never enemy refs (autosave); its burn ticks sample the projectile grid along each beam".

- [ ] **Step 3: ARCHAEOLOGY.md.** A **4.6e** section: the starting tables (as shipped in Task 2), each lever the battery moved with the before -> after and the run that justified it, the six-tower hues before the seven (13 / 73 / 133 / 193 / 253 / 313) and the data gap that placed IFR (the countermx columns, the trio diagnostic). The memory rule: numbers and dated notes here, principles in ARCHITECTURE.

- [ ] **Step 4: CLAUDE.md (this repo):** the marks command gains `,ifr` in `KINDS=`. exec-fn `CLAUDE.md` `/spire` row: no change needed unless it names six kinds (`grep -n "six" ~/src/exec-fn/CLAUDE.md`).

- [ ] **Step 5: Commit** — `Spire 6.2.0: IFR, Ifrit - the seventh tower; seven hues 360/7 apart` (the docs guard wants ARCHITECTURE.md staged: it is).

- [ ] **Step 6: Push + pointer + deploy.** `git push` (apps/spire); `cd ~/src/exec-fn && git add apps/spire && git commit -m "apps/spire -> <sha>: Spire 6.2.0, IFR the seventh tower [skip-docs]" && git push`; `ssh wai-root@wai-lau.net 'bash /exec-fn/scripts/deploy.sh'`; then `curl -s https://wai-lau.net/aspira-version.txt` -> `6.2.0`, open `https://wai-lau.net/spire`, build an IFR.
