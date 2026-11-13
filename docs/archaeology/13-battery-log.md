## 13. Battery log (by date)

The dated balance batteries, passes and measured lever lists, oldest first (they sat under §12 as 12.x .. 12.q, newest first,
until 2026-11-07; the old letter is kept in each heading).

### 13.1 OLD marks targets (2026-10-23 and the 2026-10-29 morning) - superseded (was 12.x)

**OLD.** The live target is `scripts/aspira-sim/mark-target.json`, the owner's table of 2026-10-29 15:45 (CLAUDE.md "THE MARK TARGET":
ARC -2 +1 -1 +2, FRZ +2 +2 -2 -2, SOL -1 -2 +1 +2, ACD +1 -3 +1 +1, GRV +1 +1 -3 +1, CRR -3 +2 +2 -1, IFR +2 -1 +2 -3, the FRZ and GRV rows swapped at 16:05, SOL and ACD at 16:30, then GRV/FRZ/ARC rotated at 17:35 (GRV took FRZ's row, FRZ ARC's, ARC GRV's); every column
+2 +2 +1 +1 -1 -2 -3). Two targets came before it, both OLD:

The 2026-10-30 swarmers-shuffle target, OLD since 2026-10-31: ARC +2 -2 -2 +2, FRZ +1 +2 -1 -2, SOL -1 -3 +2 +2, ACD -3 +1 +1 +1, GRV +1 +1 -3 +1, CRR -2 +2 +1 -1, IFR +2 -1 +2 -3. The SOL and ACD rows swapped (owner: "Sol acd swap / No on arc grv"): no ACD tune reached -3 +1 +1 +1 (fast was always its worst type), and the swap was the nearest fit to the 7.0.3 marks.

The 2026-10-29 evening target (after the 16:05 / 16:30 / 17:35 swaps), OLD since 2026-10-30 18:10: ARC -2 +1 -1 +2, FRZ +2 +2 -2 -2, SOL -1 -2 +1 +2, ACD +1 -3 +1 +1, GRV +1 +1 -3 +1, CRR -3 +2 +2 -1, IFR +2 -1 +2 -3. Replaced by the swarmers shuffle (owner: "i want ARC IFR GRV FRZ to be the swarmers"; option B, nearest the measured marks).

The 2026-10-29 MORNING target (commits 7bf7c66, 1c2a231, 760dca9, 2668da6): column shape ✓✓ ✓ ✓ ✓ – ✗✗ ✗✗✗ (+2 +1 +1 +1 0 -2 -3,
"option A"), fitted by `marktarget.py` to the 6.18.0 countermx with an ARC "+swarm +armor -fast -shield" pin (recorded as the owner's,
2026-10-28) - ARC +2 -2 -2 +2, FRZ -3 +2 0 +1, SOL +1 -3 +1 +1, ACD -2 +1 +1 0, GRV +1 +1 -3 +1, CRR 0 +1 +1 -2, IFR +1 0 +2 -3. Dropped
the same afternoon: "ARC and IFR by design are bad vs armor", and the shape cannot hold three armor weaknesses; the owner enumerated the
seven feasible zero-sum shapes and chose +2 +2 +1 +1 -1 -2 -3.

The 2026-10-23 target, the first: the build cards' marks balance was aiming for (swarm, fast, shield, armor; every row and column sums to 0, no two towers alike).
Measured marks (`marks.py`) are moved toward it by balance only, never by editing `VS_MARKS`.

| tower | swarm | fast | shield | armor |
|---|---|---|---|---|
| ARC | +1 | +1 | +1 | -3 |
| FRZ | +2 | +1 | -2 | -1 |
| SOL | -1 | -2 | +1 | +2 |
| ACD | -2 | -2 | +1 | +3 |
| GRV | +1 | -1 | -2 | +2 |
| CRR | -2 | +2 | +1 | -1 |
| IFR | +1 | +1 | 0 | -2 |

The sim's smart saver (REWIND on) reads an easier wave as harder (2026-10-23): it spends only on a leak, so a mid-game with fewer leaks
reaches wave 97 underbuilt - late shield counts x1.0 / x0.75 fell 31 -> 27 -> 22/70 with it, rose 13 -> 17 -> 28/70 with REWIND=0.
Size type levers with REWIND=0.

### 13.2 The 6.16.0 battery (2026-10-28; a6bc1c9, cc67188, 4e3461c) (was 12.y)

Marks measured at 9 points, waves 101-109 and 111-119 (was 6 points at 61-69); every tower checks two types or more, no two alike.

| lever | change |
|---|---|
| late HP | `HP_LATE` 1.13 -> 1.14 |
| stat curve top | GRV x3, IFR x3, ACD x2 |
| IFR Flare tick | x0.5 (`IFR_TICK_S` 0.25-0.22 s, over the 0.1 s floor) |
| FRZ Temp | slow +0.1 a tier (0.55 .. 0.8); brittle 1 / 1 / 2.2 / 3 / 3.4 / 3.8 |
| GRV Nova strip | x5 (0 / 2.5 / 4 / 6 / 18 / 30) |
| GRV pellets | 30 -> 6 a mass, each x6 the hit (same damage, bigger hits) |
| ARC | base rate 3 -> 2.1; the bolts of one attack share one hit set |

| tower | marks |
|---|---|
| ARC | +fast +armor -2 shield |
| FRZ | +swarm +armor -fast -shield |
| SOL | +swarm +shield -fast -armor |
| ACD | +shield +armor -2 swarm |
| GRV | +swarm +armor -2 shield |
| CRR | +fast +2 shield -2 swarm -armor |
| IFR | +swarm +shield -2 armor |

Measured (players3, bosses skipped, snapshot a6bc1c9): perfect + rewind 29/35 (19/22 winnable), good + rewind 86/105 (53/66
winnable), random median death wave 91. Duo rule clean 21/21.

### 13.3 The 6.17.0 boss pass (2026-10-28; 909491b) (was 12.z)

The rule (owner, 2026-10-28): "balance the boss to the towers, balance the towers to the waves, waves not incl bosses".

| lever | change |
|---|---|
| Death HP | x3 (`BOSS_FAR.death` 2.8 -> 8.4); towers untouched |

Points the strongest and weakest winnable trios need to beat Death (`trioplan`, beam 3, seed 1): frz+grv+ifr 18 -> 35 (it held 26
before the 6.16.0 battery); acd+grv+crr 34 -> 34 (it wins at x1, x3 and x4). Death's HP at wave 120 at x1: 0.90M.

### 13.4 Difficulty by player, measured (2026-10-28; snapshot 909491b) (was 12.w)

All `players3`, bosses skipped (`BOSS_SKIP`), 35 trios x 1 seed unless noted. The three players: **random** (spends as it goes, a
random open axis but never the right one, no rewind), **good** (smart saver, the planner's axes, human hands), **perfect** (smart
saver with rewind, every tower re-placed every 0.5 s).

| player | result |
|---|---|
| random | median death wave 93 (91 on 3 seeds earlier) |
| good + rewind | 29 / 35 won |
| perfect + rewind | 19 / 22 winnable won (1 seed; a 3-seed run pending) |

**Curve or axis - where a tower's damage comes from.** Shape 1: damage x (S + (1 - S) x matched-axis tiers / 4), the axis -> type
map of ARCHITECTURE 4.4, each tower's uncovered type its design weakness (CRR uncovered on swarm and armor). Random's median death:
S 0.7 -> 87, 0.5 -> 83, 0.3 -> 82; at S 0.7 good 18 / 22 and perfect 15 / 22 winnable (within noise). Random died alike on
winnable (87.5) and non-winnable (87) trios. Shape 2: damage x C x (1 + k x matched / 4), C so that one matched III equals today:
k 1 -> 83, k 2 -> 82 (at k 2: no match x0.4, III x1.0, IV x1.2).

**Economy x axis**, no rewind (median death; good with rewind 120 for scale):

| | spends as it goes | smart saver |
|---|---|---|
| random axis | random 93 | randomsave 83 |
| the planner's axis | rightspend 110 | good, no rewind 106 |

The right axis is worth 13 - 23 waves; saving without rewind costs waves. Every no-rewind cell holds about 6 tier points a tower at
wave 93; good (with rewind) holds 10.

Tier points a tower, mean, at waves 36 / 48 / 60 / 72 / 93:

| player | 36 | 48 | 60 | 72 | 93 |
|---|---|---|---|---|---|
| random | 3.2 | 3.8 | 4.4 | 5.0 | 5.8 |
| good (rewind) | 1.0 | 2.2 | 2.5 | 4.1 | 9.5 |
| good, no rewind | 3.0 | 3.7 | 4.3 | 5.0 | 5.8 |
| rightspend | 3.1 | 3.8 | 4.3 | 5.0 | 5.9 |

**Hits on the damage floor** (a hit that lands for 1: share of hits / share of damage), waves 60-69 | 70-79 | 80-89 | 90-93: ARC
0 / 0 | 0.5 / 0.04 | 10.5 / 1.4 | 8.4 / 1.8; FRZ 32 / 2.1 | 40.5 / 5.8 | 55.2 / 16.0 | 54.1 / 21.7; SOL, ACD, GRV, CRR and IFR all
under 4% / 0.4%, but IFR 12.5 / 0.34 at 70-79. Only FRZ leans on the floor.

**Designed deaths** at the 6.16.0 marks: thirteen trios miss a counter, ten of them fast (only ARC and CRR check fast) - ARCHITECTURE
4.6d.

**The owner's reading** (2026-10-28): random dying around 90 is "fine" as the game is - the old target of 60 is dropped; "balance
the boss to the towers, balance the towers to the waves, waves not incl bosses". Next: the whole game harder early so money is scarce
"because you need to buy upgrades" (an economy pass), a cadence sweep, and every armor strip a % of the current armor, not a flat
amount.

### 13.5 Dated notes moved out of ARCHITECTURE.md (2026-10-30, 6.18.37) (was 12.v)

ARCHITECTURE.md keeps principles and tables; these dated notes left it, each under the section it came from:

- §4.7 Orbital Relay: the multiplier read "3x" per kind, `RELAY_MUL` 5 since 2026-10-18 (and CRR under its old id ATC); the row now says x`RELAY_MUL` and names what each kind multiplies (`relayStats`, aspira-core.js, IFR included).
- §5.2 counts: EARLY came in on 2026-10-15.
- §5.3 spawning: shield pods spawned at half the others' gap from 2026-10-20 (`SHIELD_POD_GAP` 0.4 a member, was 0.8).
- §5.3 formations before the 2026-10-29 swap: fast flew side-by-side pairs spinning flat about their midpoint (spread x3 on 2026-10-20, `FAST_PAIR` 78); shields flew Vs of 5, then 3, then singles (units 3x apart on 2026-10-20, a third again on 2026-10-21); armor's lattice was 72 u apart (x2 on 2026-10-20 - 216 for an hour put its outer columns out of every tower's reach - halved back to 36 on 2026-10-23). Since the swap the fast fly the Vs and the shields the 2x2 blocks.
- §10.4 balance rules: the duo rule (2026-10-22) replaced "a lone L1 tower clears 1-11, losing at most 3" (2026-10-20).
- §9.1 corrections: the first ones, JUU 84 -> 78 and SMD 49 -> 43 (2026-10-16) - before 4.4.14 the Lovers' pair paid wave 50's +6 lives once a body.

### 13.6 Waves 1-12 and the ARC/CRR tier-0 cut (2026-10-30, 6.18.43; d83b9aa) (was 12.u)

Owner, 2026-10-30: "no tower (other than SOL) 1-shots anything from wave 1-12"; the first levels "look way too easy"; "excellent excellent" to the package.

| knob | before | after |
|---|---|---|
| `EASE_N` (waves 1-12 count divisor and pay) | 4 (a quarter of the bodies) | 0.7 (more bodies; 0.5 let FRZ + IFR at tier 0 lose the Star) |
| `EARLY_FLOOR` (min HP a non-boss body, waves 1-12) | none | 45 (over ACD's 38, the biggest non-SOL tier-0 hit) |
| `STAT_CURVE.arc.dmg` | [88.2] | [1.2493, 70.6] - tier-0 hit 2117 -> 30; level 1 about -80%, 3 -42%, 6 -16%, 9 -6%; level 13 unchanged (undone in 6.18.46, below) |
| `STAT_CURVE.crr.dmg` | [1.58473, 1.8] | [0.3445, 8.28] - tier-0 hit 139 -> 30; level 13 unchanged (undone in 6.18.46, below) |

Bodies in waves 1-12: 45 -> 64; HP a body 45-87 (was 1-68). One tier-0 tower alone: non-SOL one-shot kills 0% on every wave (ARC and CRR were 100%). All 21 tier-0 duos still clean (duo0.mjs, 2 seeds). Late marks (countermx, 9 pts, 101-119) unchanged for ARC and CRR.

6.18.46 (e1338e4, the same day) fixed two side effects - the good model's wins had fallen 112 -> 52 of 200 (8 seeds):
- Pay: a body paid x `earlyN`, so `EASE_N` 0.7 cut waves 1-12's pay 2134 -> 513 gold. Pay now has its own `EASE_PAY` 2.912 (`earlyPay`, = 0.7 x 4.16): 2101 gold.
- The curve: lowering `lo` weakened every level, not only tier 0. The curve is back as before (`dmg` [88.2] ARC, [1.58473, 1.8] CRR) and a `dmg0` factor scales the tier-0 hit alone (ARC 1/70.6, CRR 1/4.6: both 30). Owner picked option 1: the hit jumps back to the curve at the first purchase.
- Both together: 103 of 200, inside the +-10 noise of 112.

### 13.7 The 7.1 pass (2026-11-01 .. 11-03; 012f378 .. 5b28eac) (was 12.t)
Owner, 2026-10-31 / 11-01: "Nothing should ever be above like 800%", "no level damage steps above 2x", "Right now ARC is so insanely steep
it doesnt make sense".
- 7.1.0 (`012f378`): ARC's damage on its own geometric curve, `geo` [0.73912, 1.9]. Hit by level 0/1/2/3/9/13: 18/34/64/122/5724/74597
  (before: 30/2568/3394/4463/14310/23285 - the old `dmg0` tier-0 hit then the power curve). Shock III-V slow .38/.47/.58, strip
  .19/.32/.48; `ARC_RES_DMG` 1,1,1.05,1.1,1.15,1.2. VS_MARKS distance 22 (was 24).
- 7.1.4 (`5fa59c5`): ACD goo in shares - strip 0/15/22/33/50/75% of the picker's armor, damage 0/2/3/4.4/6.4/8 x td. SUPERSEDED: the
  2026-10-13 rule "goo should also deal damage equal to the amount of armor it strips" with `DRIP_TAKE` x (1 + `DRIP_TIER_K` 0.6 x
  `TIER_LEVEL`) = 2.6/3.2/5.6/8/9.2 x the armor lost (the card's "920% of the armor lost"). ACD band, V corrosion mean leak 86 -> 62;
  Corrosion vs armor at V 88% -> 5%.
- Card text: 7.0.30 renames (Amperage -> Conductivity, Resistance -> Shock, Sublimation -> Brittle, Contagion -> Spill, Acceleration ->
  Gravity Well, SOL's Flare tier -> Glare; FRZ's "Brittle" row -> "Damage taken"); 7.1.2 Shock's harder hit; 7.1.5 the goo line.
- 7.1.7 (`d34d4de`): the card per unit, never a total - burns a second, a CRR sortie a bolt, ACD's ramp as a multiplier
  (owner, 2026-10-31: "Nothing should ever be above like 800%").
- 7.1.8 (`1f1ed4d`): Shocked (Wai "1") - `ARC_SHOCK_AMP` 0/.3/.7/1.6/1.8/2; ARC band in at III and V. IFR Flare burns x1.5
  (`IFR_BURN_S` 1.8/2.1/3.2/5.5; ticks a flare 7/7/8/13/25/50), the meteor x0.75 (`IFR_ROUTE_K0` 1.5 -> 1.125), Flare V 2 flares (was 3).
  Good model 47/100. VS_MARKS distance 22.
- 7.1.9 (`59111d2`): `TD_UNIT` {acd 8, frz 3, grv 4}, the card's label only; fp IDENTICAL.
- 7.1.10 (`3b707b8`): the Shocked triangle and card line; smoke "no card sentence over 800%".
- 7.1.11 (`5a9d9af`): SOL `geoCap` [3.0616, 1.9] - hit by level 0..6 251/477/907/1723/3274/6220/11693 (was 1256/1966/3265/4946/
  6937/9195/11693). The curve pin "slightly steepening" (2026-10-28) SUPERSEDED by "below 2x a level". Good model 54/100.
- 7.1.12 (`b837549`): GRV `geoCap` [0.256, 1.9] (was x2.25 at level 1), IFR [0.1047, 1.9] (was x3.65); PENDING down to CRR.
- 7.1.13 (`b647fd5`): SOL beams reach the screen edge - `solShowLen` / `solOutLen` projected under the page's camera in the game tick,
  1/WARP_RES too far out; the up-screen beam drew 722 u (0.75) / 650 u (0.5) of 796, after the fix 818.
- 7.1.14 (`392d007`): damage numbers 10-38 -> 14-30 px (owner: "narrow size band (less big max, more big min)"); CRR darts one path a
  carrier. drawCar ms at 3 CRRs x 17 (desktop WebKit): 2.33-2.49 before, 2.27 batched; bevel trail joins TRIED and dropped (7.55).
- 7.1.16 (`7ba3d42`): the ARC brief (owner, 2026-11-01: "ARC remove slow to make worse vs fast / Increase chaining/forking to make
  good vs swarm / increase damage and reduce fire rate to make good vs armor") - `ARC_RES_SLOW` 0 everywhere (was 0/.15/.25/.38/.47/.58),
  `ARC_VOLT_JUMPS` 2/5/8/12/16/20 (was 2/3/4/5/6/8), `ARC_FORK_FROM` 1 (was 2), `ARC_BURN` 0.2 x6 ticks (was 0.1 x2), the curve
  `geo` [1.10868, 1.9] (x1.5, was 0.73912) with `knee` 7 / `late` 1.35, at two thirds the fire rate.
- 7.1.17 (`b4299d6`): the brief on the card - the dead Res slow rows gone, a Shocked row; Voltage's sentence counts to twenty.
- 7.1.18 (`905a4b4`): SOL `SOL_BAND_W` x0.85 (25.5 .. 85), `SOL_PAR_N` 0/1/1/1/2/3 (was 0/1/1/2/2/4), `SOL_DMG_K` 1.8 -> 2.07; IFR's
  strength to Flare (owner: "IFR looks like just a curve nerf") - `IFR_ROUTE_K0` 1.125 -> 0.675, `IFR_FIRE_HK` 1 -> 0.6, `IFR_TICK_K0`
  0.784 -> 0.98 (Flare's card share 251-348 -> 524-726%td a second); ACD `ACD_DOUBLE` x1.5 (a slower ramp).
- 7.1.19 (`4988211`): 7.1.18 on the card; Flare V's sentence "three at the impact" (wrong since 7.1.8) -> 2.
- 7.1.20 (`0042926`): docs for 7.1.16-7.1.19.
- 7.1.21 (`3261a4f`): the CRR rework (owner, 2026-11-01/02: "I want interceptors to fly and orbit way slower / Add more interceptors to
  compensate?", "Lets go with 500", volleys "should not go above 3") - `CRR_SPEED_V` 2500 -> 500 out and home, `CRR_ORBIT_V` 400 -> 200,
  `CRR_HANGAR` 3/5/11/13 (V 17) -> 8/12/16/20/26 (V 34), `CRR_AMMO` 18/27/27/63 (V 72) -> 4/8/12/16/18/24, `CRR_BOLTS_BY` 1-6 -> 1/2/2/3/3/3 at
  once, no leash, partial reload; the curve `dmg0` -> `geo` [0.8565, 1.4444] (PENDING empty). VS_MARKS crr -2 +1 +2 -1 -> -1 +1 +1 -1.
- 7.1.22 (`1eb7c4a`): the V draw; the card's Flight / Volleys / Bolts rows. drawCar at 3 CRRs x 34 (desktop WebKit, load 11): 2.59 ms mean
  without the V, 2.83 with it (p95 6); option C (trails `CRR_TRAIL_REF` 17 / `CRR_TRAIL_MIN` 20) 2.06 / p95 4, parked for the owner.
- 7.1.23 (`651e48a`) / 7.1.24 (`0b1e01e`): the iPhone board uploads (a 7.1.19 log: 118 in 160 s, 11.6 ms avg, 42 max) - the off-frame log
  names its reason; a new wave is its labels' strips. WebKit, 8 waves, the off-frame path: 34 uploads / 38.4 Mpx (7 whole wave boards) ->
  152 / 6.9 Mpx, pixel diff 0. The in-frame path shows a 677 px texture mismatch on both (open).
- 7.1.25 (`1d1d29b`): the entity layer pools its per-die records. E1 at 135 enemies (wave 60), a frame: 443 die fills + 263 strokes,
  75 tracer gradients + fills, 42 shield-line strokes, ~6k path points.
- 7.1.26 (`34f6820`) / 7.1.27 (`0d8118d`): docs; CRR comment rot (no primes, one speed, a 2.36 s orbit loop).
- 7.1.28 (`d7e585a`): CRR trails shorten past 17 interceptors out (`CRR_TRAIL_REF` 17, `CRR_TRAIL_MIN` 20; owner: "No to all except
  smaller CRR trails" - stepped tracer fades and flat far dice REJECTED). drawCar at 3 x 34: 2.83 -> 2.06 ms, p95 6 -> 4.
- 7.1.29 (`063f079`): CRR's samples - the crr rename (10-29) left index.json keyed car / build.car / up.car; `LEGACY_SFX` car -> crr.
- 7.1.30 (`8d7f0bb`, Balance): a boss at the core costs its HP% left in lives (Lover /2, Devil copy /6, rounded up; `bossLeakLives`).
- 7.1.31 (`9771962`): the demo scene's foundation - `freshG()` split from `newGame()`, the private game, the swap (`demoIn`/`demoOut`).
- 7.1.32 (`82f729d`): a boss in the threat zone (`THREAT_FROM` 4 s) shows ceil(HP%) over each body (`drawBossHp`).
- 7.1.33 / 7.1.34 (`041ed36` / `2f53959`, Balance): the Devil's two on a lane - `DEVIL_TRAIL` 540 u; the second waits out the first's
  HP-bar hold (they spawned on one spot: three visible of six). In reach the pair arrives ~5.2 s apart (540 / 118.9 u/s + the hold);
  the "~1.5 s" first quoted was the off-screen x3 clock (`OFF_SCREEN_SPEED`) of a no-tower check.
- 7.1.35 (`1a03243`): the demo scene in 3D - its own camera (the game's tilt, a flat floor, `DEMO_LENS` 24).
- 7.1.36 (`856292f`): `etaToCore` x `waveClock` + the HP-bar hold left (a boss out of reach read 3x too far off, a held one too near).
- 7.1.37 (`b10195e`): the demo on the card - the layout registry (a layout per tower tier 0 and per axis), walkers for slows, the "i";
  smoke gates: coverage, behaviour (112 scenes, every tier), isolation, the card. Dummies at `DEMO_HP_K` 50 x wave-30 HP (at 1e15
  CRR's `carTarget` sent the whole wing at one; at 1x a killing hit stripped no armor). The fast walker loses more pace, but near the caps
  little more: one tower's slow tops out at slowShape(TOWER_SLOW_MAX, fastSlowCap()) = 0.73 off a fast enemy (FRZ 0.73 vs 0.53, GRV 0.73
  vs 0.70, CRR 0.74 vs 0.69); SOL Scorch the other way (0.12 vs 0.47: a fast walker crosses the beam in fewer ticks).
- 7.1.38 (`a668088`): the held dummies `DEMO_NUM_GAP` 1.6 x the biggest damage number apart (~48 u; were 21-34 u).
- 7.1.39 (`b796a62`): these rows to 7.1.38.
- 7.1.40 (`838d30a`) / 7.1.41 (`3a6111c`): the late-wave entity layer, pixel-checked (Leader: "PIXEL-IDENTICAL" savings only; stepped tracer
  fades and flat far dice REJECTED by the owner). One save round the enemies' marks: save/restore 144 -> 10 a frame, 12 px differ (edge AA).
  One tracer gradient a colour, the frame turned onto each tail: 75 gradient creations -> 0, 566 px differ, all 1-px AA at tail edges.
  WebKit, wave 60 / 135 enemies: warpEntities 5.8-6.1 -> 5.4-5.5 ms; HEAD vs HEAD 0 px. Batching die faces skipped: 534 fills use 265
  colours, and merging them changes which overlapping die paints on top. The 677-px desktop rim-strip gap parked (ARCHITECTURE §11).
- 7.1.42 / 7.1.43 (`f16b925` / `0744a60`): comment rot; CLAUDE.md points at the demo gates.
- 7.1.44 (`97a50e3`): aspira-draw.js -> + aspira-ranges.js, aspira-lanes.js -> + aspira-lanefade.js (479 -> ~405 each). A full-page diff
  needs the GPU lane atlas ready first (`lgl.ready`, stepped frames - the probe's fake clock never advances a real-time wait): before it,
  when a lit lane first shows was timing and read as a 1748 px difference. After it: HEAD x2 and split x2 differ only in the card's + blink.
- 7.1.45 / 7.1.46 (`37add98` / `5b28eac`): the on-screen text audit - the 7.1 notes gain the boss lives rule and the Devil's six; "Shock
  slows" dropped; armor strips read "of the armor left" (shredPct); CRR's sentence says its partial reload, no leash, every bolt's
  CRR_SLOW and shields blocking the tether's slow; Ifrit's two 7.1 lines merged (meteor x0.75 then x0.6: 55% softer net).

### 13.8 Levers measured and DROPPED, 2026-11-05 - do not re-run (was 12.s)

Wai's lever table of 11-05 (per tower x enemy type), measured by Balance/Sims with countermx at 9 points, late windows 101-109 / 111-119
(the marks run), on 7.6.0 unless noted. Leak % is swarm / fast / shield / armor; "distance" is the marks' distance to the target (24 live).
Balance's rule: a +-2 distance change is noise; a lever is real only when the leak % moves.

**The method fact**: the marks build spreads its 9 points as tier III on every axis, so tiers I-II are never in play - any lever that
changes only tiers I-II is unmeasurable by marks (GRV G1 / G2 / G2T below).

| lever | what | result | verdict |
|---|---|---|---|
| SLOW_CAP 0.85 / 0.90 / 0.95 (live 0.8; only higher caps, Wai) | a stronger slow cap, game-wide | no mark moves (0.90 showed distance 22 + a CRR RULE FAIL from cut-line noise); FRZ fast/shield/armor 13/34/91 -> 6/27/78 at 0.95, GRV slightly better | dropped |
| ARMOR_ALL 5 (5 / 5 / 7.5%) and 0 (live 10 / 10 / 15%) | light types' share of the armor type's armor | AA5 distance 22, no RULE FAIL; AA0 distance 22, RULE FAIL (CRR). Mostly hurts IFR (shield leak 26 -> 8 -> 0), ACD (swarm 45 -> 21 -> 6), FRZ (fast 13 -> 7 -> 3) | no change (AA5 the safe option if Wai wants IFR / ACD stronger late) |
| ARMOR_K 4 / 8 (live 1) | the armor curve's hit weight | K4: armor-type leak FRZ 91 -> 48, CRR 62 -> 26, IFR 94 -> 66, distance 24, RULE FAIL (CRR); K8 distance 30, RULE FAIL x3. Flattens the armor column | dropped |
| R85 / R70 | every non-ARC tower's fire rate x0.85 / x0.70 at the same dps (Wai's ARC-swarm lever) | RULE FAIL (CRR); ARC's swarm cell never moves - fewer, bigger hits pop fewer shields and overkill drops, so the others leak LESS swarm (ACD 45 -> 14) | dropped |
| ARC A0 | burn 12 ticks, same total | same marks (ARC live 0 / 0 / 66 / 0) | dropped |
| ARC A1-A3 | damage x0.7 / x0.5, chain carry x1.25-1.5 | shield -3 -> -2 but armor +2 -> +1, distance 24; ARC leaks ~0% swarm / fast / armor even at half damage | dropped |
| ARC damage x0.5 / x0.3 / x0.2 / x0.1 | damage only | x0.5 0/2/56/0; x0.3 2/48/79/26, marks +1 0 -2 +1, distance 20; x0.2 10/68/90/49, distance 20; x0.1 RULE FAIL. ARC's late damage is ~3x what it needs vs swarm | x0.3 (a 70% cut) not shipped: goes to Wai with a good-model wins run first |
| GRV G0 | void tick 0.5 s | moves the wrong way (fast leak 25 -> 29) | dropped |
| GRV G1 / G2 / G2T | Gravity Well slow at tiers I-II | no change - tiers I-II are never in the marks build (above) | unmeasurable; dropped |
| ACD Q0 | Flow carry 0 / .15 / .3 / .4 / .5 / .5 | 56/91/20/17 (live 45/82/14/12), distance 24 | dropped |
| ACD Q1 | ramp cap 32, floor x2, ramp 1.5x slower | 62/94/32/22, distance 24 | dropped |
| ACD Q2 / Q3 | ramp variants | Q2 47/..; Q3 57/89/26/30 - weaker everywhere by the same share, the row holds; distance 24 | dropped (boss checks queued: Wai's ACD brief was about bosses, which marks cannot see) |
| IFR I1 | 8 shards a burst, 12 at the capstone | 1/35/10/91 (live 2/44/26/94), distance 24 | dropped |
| IFR I2 / I3 | I1 + shards 0.5 speed / 0.5 speed only | I2 1/32/6/84; I3 no change; distance 24 | dropped |
| CRR E0-E5 (old SOL, `492f6b7`; each on top of 1-2 bolts a volley at the same damage per volley) | E0 same reload; E1 reload x1.5; E2 x2; E3 hangar x0.75; E4 reload x1.5 + ammo x1.5; E5 ammo x0.5 | leaks (baseline 7.5.0 9/10/0/61): E0 8/8/0/52, E1 10/12/0/55, E2 14/16/0/60, E3 15/18/0/60, E4 8/6/0/44, E5 12/24/0/70 - all six RULE FAIL; fewer bolts reaches armor -1, swarm never passes 15% (a minus needs ~20%), fast and shield trade the one check. E2 / E3 rerun on 7.6.0: the same | dropped |

### 13.9 Look and demo numbers, 2026-11-07 (7.7.111 .. 7.7.115; Visual) (was 12.r)

Draw and card-demo values only - none touches the board's balance (fp IDENTICAL on each).

| what | value | where | why |
|---|---|---|---|
| Hypernova's second ring | pure white, full alpha, glow `GRV_SUPER_FLASH` 40 (at least half from its start) | aspira-grv-draw.js | Wai: "bigger whiter flash"; it read as a grey band (67540a6) |
| a nova in the card demo | both rings x one factor so the widest fits the canvas from its centre, `GRV_FIT_PAD` 1.1 | `grvNovaFit` | the 1.5x ring (345 u at Nova V) is wider than the ~520 u box |
| Nova layout's lanes | `dy` 0.2 x the range (default `DEMO_LANE_DY` 0.45) | aspira-demo-layouts.js | room for the flash |
| demo walkers' health | the wave `30 + DEMO_WAVE_PT` (7) a point, to 119, never a boss wave; size of a wave-30 body | `demoWave`, `demoSizeK` | a 13-point ACD's goo (16.7k a hit) one-shot wave-30 walkers: no pools after 2 s (572715f) |
| the demo's wave hold | one inert spawn, timer Infinity | `demoScene` | an empty field sent real waves 2-3 onto the board's lanes (ARC, FRZ, ACD ...) |
| Undertow in the demo | not shown (the layout declares no reels) | `DEMO_LAYOUTS.grv.radiation` | the voids sit on the entering cluster, upstream; a tower 0.15 box heights from the entry edge fired 1-3 reels in 4 s, 0.2-0.5 none |
| the acid lake | one fill over the lake pools' union, one outline (uncovered arcs only); per pool over `POOL_LOD` | `drawLake`, `lakeArcs` | Wai: "overlapping pools merge" (21c2591) |
| pool bubbles' seed | `fixedRand` of the pool's x/y x8 rounded | `poolSeed` | no Math.random in draw (eadf950) |

### 13.10 The capstone mechanics' numbers (2026-11-07, live 7.7.121; Wai's picks 2026-11-06) (was 12.q)

The mechanic knobs only (the tier tables' V leaps are `CAPSTONE_NUM`, aspira-capstone.js). What each does: ARCHITECTURE §4.5b.

| capstone | knobs, as live | history |
|---|---|---|
| ARC Grounding | `ARC_GROUND_R` 40 u | |
| ARC Storm | `ARC_STORM_EVERY` 5, `ARC_STORM_FORK` 3 | |
| ARC Superstorm (Shock V) | `ARC_SHOCK_PASS_R` 80 u, `ARC_PASS_DEPTH` 3 | the radius was Balance's call |
| FRZ Zero Point (Fracture V) | `FRZ_LINGER_S` 2 s | |
| FRZ Ice Age (Permafrost V) | `FRZ_DEEP_S` 0.5 s, `FRZ_DEEP_CD` 6 s | bosses cut by `bossSlowMul` (Leader) |
| SOL Solar Flare (Scorch V) | `SOL_FLARE_SHARE` 1, `SOL_FLARE_MAX` 4, `SOL_FLARE_I` 3 | share 1 = IFR's flare (7.7.109) |
| SOL Corona (Reflection V) | `SOL_SUB_SPLIT` 2 (8 x 2 = 24 beams) | |
| ACD Oblivion (Corrosion V) | `ACD_CORR_TAKE` 0.2, `ACD_CORR_TAKE_S` 0.5 s | Wai: "start ~20%" |
| ACD Extinction (Spill V) | `ACD_LAKE_K` 1.25, `ACD_LAKE_R` 149 u | lake capped under 150 u with the pool shrink (7.7.112: `ACD_POOL_R` 100 115 130 140 149, `ACD_POOL_MORE` 4, `ACD_POOL_LIFE` 0.3) |
| GRV Event Horizon (Void V) | `GRV_EH_GROW` 1.1, `GRV_EH_MAX` 1.5, `GRV_EH_FADE` 3 s | |
| GRV Hypernova (Nova V) | `GRV_SUPER_EVERY` 4, `GRV_SUPER_R` 1.5, `GRV_SUPER_GAP` = `GRV_NOVA_T` 0.8 s | |
| GRV Undertow (Gravity Well V) | `GRV_REEL_T` 0.6 s, `GRV_REEL_CD` 4 s | full reel to the void's centre (Leader) |
| CRR Full Wing (Hangar V) | `CRR_RETARGETS` 2, `CRR_RETARGET_R` 300 u | |
| CRR Autopilot (Armament V) | `CRR_BURST_N` 10, `CRR_BURST_K` 1.125 td | bursts on every return, lost target too |
| IFR Impact (Meteor V) | `IFR_BIG_EVERY` 3, `IFR_BIG_HIT_K` 4, `IFR_BIG_DRAW_K` 2 | every 3rd = a fixed stand-in for Wai's 1/3 chance |
| IFR Hellfire (Hellfire V) | `IFR_CHAINS_N` 5 (the pentagram), `IFR_CHAIN_K` 1 | 3 random chords 60-180 deg until 2026-11-07; IV's flare count kept (33) |
| IFR Mega Firaga (Flare V) | `IFR_V_SPAN` 300 u; the ring 0.6 up the spokes, its own hit | two flares 2026-10-31 .. 11-06 |

### 13.11 The paths pass, 2026-11-07 .. 11-09 (Balance; numbers as Leader relayed them)

The brief (owner, 2026-11-07: "each upgrade path leaks roughly the same amount across types"; "Make sure balanced when playing"; 2026-11-08:
"check all, not just one axis at a time"): a TEAM path test - the tower at every legal build beside a fixed panel of partner pairs, same seeds
and waves, team leak per type; a path's usefulness is the marginal team-leak drop of a point moved into it; tolerance +-3 team-leak points.

| tower | what the test found | lever | result |
|---|---|---|---|
| CRR | Full Wing (Hangar V) worth 50 points of leak, Armament V 15, Tether V 4 | interceptors fly home when the target dies (owner, 11-01) and carry up to 40 volleys (11-07 "Ok no ammo limit"), so a retarget spends a full sortie; fewer retargets or a shorter reach barely helped | owner, 2026-11-09: one retarget, carrying part of the leftover ammo (the share from the sim) |

### 13.12 The boss pass, 2026-11-09 .. 11-12 (Death on five lanes, Judgement on six; mates lead)

Bosses are tuned to the towers, never the reverse; each fix is per-unit HP, never a count (owner, 2026-11-10: "raise per-unit HP (escort or hers), never the count"). Runs: `players3b.mjs`, good model, 40 games, bosses on; "depth" = the boss's progress over her neighbours' (1.0 = a normal wave), "ends" = runs that end at her.

| Boss | Change | Old | New | Measured |
|---|---|---|---|---|
| Judgement | her own HP (`BOSS_HP.judgement`) | 5.7 | 45.6 (x8) | six lanes left her at depth 0.50; escort HP x2 / x4 / x8 moved nothing (0.50-0.53); her own HP x2 / x4 / x8: depth 0.75 / 0.70 / 1.00, ends 0 / 0 / 3% |
| Death | escort share per type (`FLEET_SCATTER.death`) | 1/3 | 1/6 | five lanes doubled the runs she ends (one lane 9%, five 16-17%); 1/4 and 1/6 left ends at 16% but cut the lives she costs 32% -> 24%; every run she ended was Death herself reaching the core, not her escort |
| Death | her own HP (`BOSS_HP.death`) | 1.79 | 0.9 (x0.5) | with the 1/6 escort: x0.5 ends 3%, lives lost 19%, depth 0.45; x0.4 ends 3%, 11%, 0.42; x0.3 ends 0%, 8%, 0.38 (escort 1/3: x0.8 18%, x0.6 14%) |

Dropped: `DEATH_ESC_HP` (a sim lever on the old scatter path; her five-lane escort spawns through `deathEscorts`, toughened on the `w.heft` line). The answered questions: docs/answered-questions.md, 11-11.

### 13.13 Gravity's Nova catches up, 2026-11-13 (mates lead)

The paths rule (owner, 2026-11-07: "make it so that, each upgrade path leaks roughly the same amount across types"): on 7.15.0 Gravity's Nova was the weakest path of any tower after Ifrit's. Lever: Nova's own hit table `GRV_NOVA_RATE` (Gravity's three parts are per-tier tables). Team path test, leak points vs Gravity's average, 13 / 9 points:

| `GRV_NOVA_RATE` III / IV / V | Void | Nova | Gravity Well | Gravity's marks |
|---|---|---|---|---|
| 1.9 / 2.4 / 3.1 (old) | -6.4 / -2.9 | +11.7 / +4.2 | -5.3 / -1.3 | swarm +1, fast +1, shields -3, armor +1 |
| 2.0 / 2.8 / 4.0 | -5.1 / -2.1 | +8.1 / +2.7 | -3.0 / -0.6 | the same |
| 2.1 / 3.2 / 4.8 | -4.2 / -1.6 | +5.3 / +1.7 | -1.1 / -0.1 | the same |
| 2.2 / 3.6 / 5.8 | -4.7 / -1.1 | +4.5 / +0.6 | +0.2 / +0.5 | the same |
| **2.3 / 4.0 / 6.8 (new)** | -2.4 / -0.6 | +2.7 / -0.1 | -0.3 / +0.7 | the same; no other tower's mark moved |
