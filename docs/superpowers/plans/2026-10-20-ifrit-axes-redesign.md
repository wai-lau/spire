# IFR Axes Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild IFR so Meteor owns the ball in flight, Hellfire owns the fire it leaves, and Blk Magic owns the pellets and flares, each with its own damage.

**Architecture:** All game logic stays in `web/aspira-ifrit.js` (tables, `ifrSkillStats`, `stepIfr` and its parts); every draw function moves to a new `web/aspira-ifrit-draw.js` loaded right after it. The blast ring becomes the FIRE (a list `t.ifrFires`), the corner slots become one central charge. Tests are the game smoke (`scripts/spire-smoke/smoke.mjs`, a fake DOM + vm), whose IFR `check(...)` blocks are rewritten task by task.

**Tech Stack:** plain browser JS (globals, one scope, scripts in `api/templates/aspira.html` order), node for the smoke and sims.

**Spec:** `docs/superpowers/specs/2026-10-20-ifrit-axes-redesign-design.md`

## Global Constraints

- Each axis's damage is `TOWERS.ifr.dmg` (60) x its OWN table; no axis multiplies another's.
- Tables index 0..5 = untaken..V; `aspira-capstone.js` pushes index 6 (VI). Stops read 0 1 3 5 6.
- Every list on a tower holds plain data (ids, numbers); new live keys join the dropped IFR keys in `web/aspira-autosave.js:38`.
- 500 lines max per `.js`; `web/aspira-warp.js` is AT 500 - add no lines there.
- In 3D no gradient on the board context: glows are stacked strokes/fills, flares stay on `fxGlGlowLine`.
- "always tower occludes balls": the charge draws in warp's `under` hook (exists, `drawIfrTop(t)`).
- Fires and flares burn by CATCHING FIRE (first tick lights, the next burns); each tick pops one shield charge.
- Intermediate commits bump PATCH (6.4.5, 6.4.6 ...); the battery's commit is **6.5.0** with one new changelog entry. Do not push until Task 7 is done.
- Run the smoke after every task: `node scripts/spire-smoke/smoke.mjs` -> last line `spire smoke: all N passed`. The pre-commit hook runs it too.

## Review Focus

1. Upgrading an axis mid-flight (ball, fire or pellets live) - nothing throws, live objects keep their launch-time numbers. Pin in Task 3's smoke check.
2. Selling the tower with fires and flares live - nothing throws (today's "selling mid-flight throws nothing" check keeps running; extend it to `ifrFires`). Task 4.
3. A resumed save from 6.4.x (old `ifrSlot0`/`ifrReady`/`ifrRings`/`ifrFs` keys) - `ifrInit` rebuilds, nothing reads the old keys. Task 2's check.
4. Many stacked fires at Meteor V + Hellfire VI - the frame budget check ("200 enemies and 40 flares under 16 ms") gets a fires variant. Task 4.
5. Boss sky inversion - the charge keeps the tower's colours (ownColours), fire/flares turn over with the sky like the old ring. Task 6 eyeball.

---

### Task 1: Split the look into `aspira-ifrit-draw.js`

**Files:** Create `web/aspira-ifrit-draw.js`; Modify `web/aspira-ifrit.js`, `api/templates/aspira.html:95` (add `<script src="/aspira-ifrit-draw.js?v=1"></script>` after the ifrit line).

**Interfaces:** Produces nothing new; every `drawIfr*`, `IFR_GLOW*`, `IFR_RING_GLOW`, `IFR_RING_THIN`, `IFR_RING_DISC`, `IFR_EMBER_*`, `IFR_TAIL_*` and `ifrEmberK` move as-is. `ifrBallReach` (logic) stays in ifrit.js and is replaced in Task 3.

- [ ] Move everything from the `// ---------- the look:` header to the end of the file into the new file, with a two-line header comment (what it is, loaded after aspira-ifrit.js). Check `scripts/aspira-sim/sim.mjs` FILES: the sim must still load (it calls no draw function; if a logic function references a moved const, keep that const in ifrit.js).
- [ ] Smoke passes; `node scripts/aspira-sim/solo.mjs` runs to the end. Commit "Spire: IFR draw code to aspira-ifrit-draw.js (500-line cap)".

### Task 2: New tables and `ifrSkillStats`

**Files:** Modify `web/aspira-ifrit.js` (tables, `ifrSkillStats`), `web/aspira-capstone.js:70` (IFR VI row), `web/aspira-stats.js:52-55`, `web/aspira-desc.js` (`ifr(sk)`, `IFR_BALLS`), `web/aspira-defs.js:350` (comment only: `dmg` is the base all three axes multiply).

**Interfaces - Produces** these `st` fields (later tasks use exactly these names):

| field | table (index 0..5; VI in capstone.js) | starting values (the battery tunes them) |
|---|---|---|
| `st.chargeS` | `IFR_CHARGE_S` (Meteor) | [2.0, 1.8, 1.6, 1.4, 1.2, 1.0]; VI 0.7 |
| `st.ballV` | `IFR_BALL_V` (Meteor) | [360, 390, 420, 450, 480, 510]; VI 540 |
| `st.ballR` | `IFR_BALL_RAD` (Meteor), u radius | [13.5, 16, 18.5, 21, 24, 27]; VI 54 |
| `st.routeHit` | `b.dmg x IFR_ROUTE_K` (Meteor) | K [1.5, 2, 4, 10, 25, 60]; VI 150 |
| `st.fireR` | `max(st.ballR, IFR_FIRE_R)` (Hellfire), u radius | R [0, 40, 60, 85, 110, 130]; VI 160 |
| `st.fireV` | `IFR_FIRE_V` (Hellfire), u/s | [60, 80, 100, 120, 150, 180]; VI 220 |
| `st.fireLinger` | `IFR_FIRE_LINGER` (Hellfire), s | [0.5, 1, 1.5, 2, 2.5, 3]; VI 4 |
| `st.fireHit` | `b.dmg x IFR_FIRE_K` (Hellfire), per tick | K [0.1, 0.15, 0.25, 0.4, 0.6, 0.8]; VI 1.2 |
| `st.pellets` | `IFR_PELLETS` (Blk Magic) | [5, 6, 8, 10, 14, 19]; VI 24 |
| `st.pelletHit` | `b.dmg x IFR_PELLET_K` (Blk Magic) | K [0.3, 0.45, 0.7, 1, 1.6, 2.5]; VI 4 |
| `st.beamL`, `st.beamW`, `st.burnS`, `st.tickS` | today's Hellfire flare tables, now indexed by **Blk Magic** | unchanged values |
| `st.flareHit` | `b.dmg x IFR_TICK_K` (Blk Magic) | today's TICK_K values |
| `st.giant` | Blk Magic at VI (bool) | `IFR_GIANT_K = 4`: the giant flare's size and hit x a VI flare's |
| `st.dmg`, `st.rate` | the card: `st.routeHit`, `1 / st.chargeS` | |

Removed: `IFR_SLOTS`, `IFR_BLAST_R`, `IFR_BLAST_K`, `IFR_LAUNCH_GAP`, `IFR_RING_V`, `IFR_RING_FADE`, `IFR_TRIPLE_*`, `st.slots/blastR/blastK/impact/hellfire/backdraft/tickK/routeK`. Pellet reach (`IFR_PELLET_REACH`) now multiplies `st.fireR`. Fixed: `IFR_FIRE_TICK_S = 0.2`, `IFR_FIRE_FADE = 0.3`.

- [ ] Write the smoke check `"IFR: each axis scales only its own numbers"`: build an IFR, read `towerStats` at 0/0/0, then 6 of one axis at a time (fresh tower each): Meteor changes only chargeS/ballV/ballR/routeHit (and `fireR` only through the `max` floor); Hellfire only fireR/fireV/fireLinger/fireHit; Blk Magic only pellets/pelletHit/beamL/beamW/burnS/tickS/flareHit/giant. Assert `fireR` at Hellfire 0 equals `ballR`; Meteor VI `ballR` 54; Hellfire VI `fireR` 160. Also: a tower object carrying 6.4 keys (`ifrSlot0: 2, ifrReady: 1, ifrRings: [{}], ifrFs: [{}]`) steps 30 frames without throwing.
- [ ] Run smoke: the new check FAILS (fields missing).
- [ ] Implement the tables and `ifrSkillStats`; update capstone.js's IFR row and its `SKILL_MOVE` VI row (unchanged values), the stats card rows (Charge, Ball speed, Meteor size, En route, Fire r + speed, Burn hit / linger, Pellets x hit, Flare, Mega Firaga), and the description (one charge at its centre; Meteor: faster, bigger, harder in flight; Hellfire: a spreading fire that lingers; Blk Magic: more, harder pellets and flares, the capstone's giant flare).
- [ ] Smoke: the new check passes (older IFR checks may fail until Tasks 3-5; note which, fix there). Commit.

### Task 3: One central charge, launch, flight

**Files:** Modify `web/aspira-ifrit.js` (`ifrInit`, `ifrCharge`, `ifrLaunch`, `stepIfrBalls`, drop `ifrCorner`/`ifrSlotCorners`/`ifrSlotBall`/`ifrBallK`/`ifrPelletFlares` use at launch), `web/aspira-ifrit-draw.js` (`drawIfrCharge`), `web/aspira-autosave.js:38` (keys: `ifrCharge`, `ifrBalls`, `ifrFires`, `ifrPellets`, `ifrFlares`, `ifrInit0`).

**Interfaces:**
- `ifrInit(t)`: sets `t.ifrInit0 = true`, `t.ifrCharge = 0` (0..1), `t.ifrBalls/ifrFires/ifrPellets/ifrFlares = []` once; deletes the 6.4 keys.
- `ifrCharge(t, st, dt)`: fills to 1 over `st.chargeS` and holds there.
- `ifrLaunch(t, st)`: if `t.ifrCharge >= 1` and `pickTargets(t, st, 1)[0]`, pushes `{ x, y, ax, ay, vx, vy, left, r: st.ballR, hit: [] }` from the tower's centre `(t.x ?? cell.x, t.y ?? cell.y)`, resets `t.ifrCharge = 0`, `sfx("ifr")`.
- `stepIfrBalls`: reach = `b.r` (the body; the glow adds none); each enemy hit once for `st.routeHit` (`IFR_ROUTE_ST`); at the aim spot calls `ifrImpact(t, st, b)` (Task 4 defines it; until then a stub that calls today's pellet burst).

- [ ] Rewrite the smoke check `"IFR: charges on its corners ..."` as `"IFR: one charge at its centre, launched the moment it is full and a target is in range"`: no target for 3 s -> `t.ifrCharge === 1`, no ball; spawn `ifrNear("armor", t, 100)`; one step -> exactly 1 ball, its start within 0.5 u of the tower's centre, `t.ifrCharge === 0`; its `r` equals `st.ballR`. A ball launched at Meteor 0 keeps `r` 13.5 after upgrading Meteor to 6 mid-flight (Review Focus 1).
- [ ] Smoke: FAILS. Implement. Smoke: passes. Commit.

### Task 4: The fire replaces the ring (Hellfire)

**Files:** Modify `web/aspira-ifrit.js` (`ifrImpact`, `stepIfrFires`; delete `ifrRing`, `stepIfrRings`, `IFR_RING_ST` -> `IFR_FIRE_ST = { noFx: true, noNum: true, shieldPop: 1 }`), `scripts/spire-smoke/smoke.mjs`.

**Interfaces:**
- `ifrImpact(t, st, b)`: pushes a fire `{ x, y, r: b.r, R: st.fireR, v: st.fireV, hold: st.fireLinger, fade: IFR_FIRE_FADE, tick: 0, hit: st.fireHit, on: {} }` (numbers copied at impact), bursts the pellets (Task 5), `sfx("ifrblast")`.
- `stepIfrFires(t, st, dt)`: grows `r` by `v * dt` to `R`; at `R` counts down `hold`, then `fade` (no hits while fading); every `IFR_FIRE_TICK_S` ticks every live, seen enemy whose centre is within `r` + its size, by the flares' catching-fire rule (share it: extract today's `was/now` logic from `ifrTickFlare` into `ifrCatch(src, ids)`), damage `f.hit`.

- [ ] Rewrite the ring checks as `"IFR: the fire opens at the meteor's size, grows to its max, burns by catching fire, lingers, then goes"`: a held shielded enemy 10 u from the impact: tick 1 pops 0, tick 2 pops 1; at Hellfire 0 the fire's `R` equals the meteor's `r`; at Hellfire 6 it reaches 160 after `(160 - r) / v` s (+1 frame); it is gone after grow + hold + fade (+1 frame); an enemy outside `r` takes nothing. Selling the tower with a live fire throws nothing (Review Focus 2). Add `"IFR: 200 enemies and 30 stacked Hellfire VI fires tick under 16 ms"` beside the flare budget check (Review Focus 4).
- [ ] Smoke: FAILS. Implement. Smoke: passes. Commit.

### Task 5: Pellets and flares under Blk Magic; the giant flare

**Files:** Modify `web/aspira-ifrit.js` (`ifrImpact`'s pellet burst, `stepIfrPellets`, `ifrFlare`, `ifrTickFlare`).

**Interfaces:** pellets fly out to `st.fireR x IFR_PELLET_REACH x u^IFR_LAND_POW` (as today, `fireR` for the blast radius), hit with `st.pelletHit` (rehit rule unchanged), land ONE flare each (sized by `ifrFlareS()`, the Blk Magic tables), whose ticks deal `st.flareHit`, stored on the flare as `f.hit` at birth. `st.giant`: `ifrImpact` also lights one flare at the impact spot with `L`, `W` and `hit` x `IFR_GIANT_K`, flag `f.giant = true`. `IFR_FLARE_MAX` never evicts a giant flare first (skip giants when shifting).

- [ ] Rewrite `"IFR: a pellet passes through ... Backdraft lands three flares"` to end with: at Blk Magic 6 an impact lights exactly `st.pellets` landed flares + 1 giant at the impact spot whose `L` is `IFR_GIANT_K` x a VI flare's max `L`; a pellet's pass-through pop count rises with Blk Magic's `pelletHit` (assert `pelletHit` at 6 > at 0); flare tick damage is `f.hit` (stub `damage` to record amounts).
- [ ] Smoke: FAILS. Implement. Smoke: passes. Commit.

### Task 6: The look

**Files:** Modify `web/aspira-ifrit-draw.js`.

**Interfaces:** `drawIfrMeteor(x, y, r, fill, low)` - `fill` true draws the black disc (`COL.bg`, 0.95); always the ring outline (`drawIfrRingAt`) and the INNER GLOW: stacked strokes inside the outline whose alpha falls from 0.30 at `r` to 0 at `0.7 r` (`IFR_INNER_A = 0.3`, `IFR_INNER_DEPTH = 0.3`, `IFR_INNER_N` bands; lowQ: 2 bands). Charge: `drawIfrMeteor(centre, st.ballR x (0.3 + 0.7 x t.ifrCharge), true)` via `drawIfrTop(t)` (the `under` hook - no warp.js change). Balls: `drawIfrMeteor(b, b.r, true)` (skyKeep pass). Fires: `drawIfrMeteor(f, f.r, false)`, alpha x the fade. Flares: every glow alpha x `ifrFlareI(f)` = `clamp(f.hit / IFR_FLARE_REF, IFR_FLARE_I_MIN, IFR_FLARE_I_MAX)` (`REF` = the untaken flare's hit, `MIN` 1, `MAX` 3); a giant flare uses `MAX` x 1.5 - the brightest thing IFR draws.

- [ ] Smoke check `"IFR: draws its charge, meteors, fires and flares"` (extend today's draw check): `drawIfrTop(t)` with a half charge issues an `arc` of radius `0.65 x st.ballR`; a fire draws no `COL.bg` fill; a flare with twice the reference hit draws at a higher `globalAlpha` than one at the reference (use the smoke's `drawn(env, fn)` recorder).
- [ ] Smoke: FAILS. Implement. Smoke: passes.
- [ ] Eyeball on the local game or after the battery deploy: charge under the prism at its centre; glow ring inside the meteor; fire without the black; Review Focus 5 on a boss wave. Commit.

### Task 7: The battery, docs, 6.5.0

**Files:** Modify the tables in `web/aspira-ifrit.js` + `web/aspira-capstone.js`, `web/aspira-chooser.js` (VS_MARKS via marks.py), `web/aspira-version.txt`, `web/aspira-changelog.js`, `ARCHITECTURE.md` (the IFR section: rewrite its ball table for charge / launch / flight / impact / fire / pellets / flares), `ARCHAEOLOGY.md` §12 (the tuned numbers).

- [ ] `node scripts/aspira-sim/solo.mjs` (16 seeds): a lone L1 IFR loses at most 3 lives on waves 1-11. Tune untaken values (chargeS, routeK, fireK, pelletK first) until it does.
- [ ] `SPREAD_ONLY=1 POINTS=6 WINDOWS=61-69 KINDS=arc,frz,sol,acd,grv,car,ifr node scripts/aspira-sim/countermx.mjs 4 > cmx.out`: IFR checks on swarm and shield, an x on fast; `python3 scripts/aspira-sim/marks.py cmx.out` shows no RULE FAIL for IFR.
- [ ] countermx N=1 focus (`KINDS=ifr N=1 POINTS=8 WINDOWS=81-89,101-109`): Meteor VI leaks least of the three on fast and armor; Hellfire VI and Blk Magic VI each leak less than Meteor VI on swarm and shield. Tune the axis tables until true; record each run's numbers in the commit body.
- [ ] `marks.py cmx.out --write`; version `6.5.0`; a new changelog entry `{ v: "6.5", day: "Oct 20", ... }` (player's words: one charge; Meteor / Hellfire / Blk Magic's new jobs; the giant flare); ARCHITECTURE + ARCHAEOLOGY updates. Smoke passes. Commit "Spire 6.5.0: IFR battery - ...".
- [ ] Push spire; bump exec-fn's `apps/spire` pointer, push; `ssh wai-root@wai-lau.net 'bash /exec-fn/scripts/deploy.sh'`; `curl -s https://wai-lau.net/aspira-version.txt` prints `6.5.0`.
