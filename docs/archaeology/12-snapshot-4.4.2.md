## 12. Snapshot: the tuned numbers at 4.4.2 (2026-10-15; 12.1-12.13)

Every value ARCHITECTURE.md stopped carrying when it became a principles-only design doc (2026-10-15),
as they stood at 4.4.2. **Superseded the moment a balance commit lands - the code is the truth**; this
is the dated record. Columns `I (1) | II (3) | III (5) | IV (6)` are the four purchases with the table
index they rest on (ARCHITECTURE §4.2). Range and leash are world units; x = multiplier.

**Since 4.4.2** (this snapshot is NOT restamped: the four-kind tables below are the 4.4.2 values): GRV and ATC and their constants,
§4.6b; the trio-scaled `dmg` (ACD 34.32, ATC 15, FRZ 16.68, SOL 61.54, GRV 24.38, ARC 24), §4.6d; `SKILL_STEP_COST` x1.6, §4.4.

### 12.1 Board and lanes

| pair | type | turns | shape |
|---|---|---|---|
| 0 | armor | 0.2375 | the most direct |
| 1 | boss | 2.1975 | ellipse |
| 2 | swarm | 0.05 | almost straight |
| 3 | shield | 0.6 | ellipse |
| 4 | fast | 0.4 | still a curve |
| 5 | spare | 0.9025 | ellipse, unused |

| Rule | Value |
|---|---|
| spawn | where the lane first crosses `SPAWN_R` 600 (every spawn equidistant, whatever the screen) |
| time under fire | measured inside `FIRE_R` 250 |
| lane copies a wave (`k`, rotated 360/k about the core) | swarm 20 or 24 · fast 3 or 5 · shield 2 or 3 · armor 2 · boss 1 (Lovers 2 opposite, Devil 6) · Judgement's escorts 12 · **never exactly four** (`NO_LANES`) |
| the set's turn (`laneBestTurn`) | of 24 candidate turns, those within 2% of the most lane length on THIS screen, then the nearest to the wave's usual `(5n mod 12) x 30` degrees |
| lit | only with live enemies, `alive / sent` per copy, fading in over `LANE_FADE_IN_MS` 2 s; a boss lane is `BOSS_LANE_W` 3.5x with a halo and waits for the sky (§5.5); lit layers rebuild at most every `LIT_MIN_MS` 200 |
| numerals | Roman, on the ring `LABEL_R` 430 at the nominal slot; 14 px in the rider's colour lit, 11 idle; `placeLabels` steps a collision a line down (lower half) or up (upper) |

`CELL_S` 32, `SLOT_R` 78, `TOWER_K` 0.85, `towerGap()` = 2 x CELL_S x TOWER_K + 4; `PHONE_ZOOM` 0.72,
`VIEW_SIDE` 250, `VIEW_UP` 375, `VIEW_DOWN` ~506, `MOVE_EDGE` 12, `PHONE_NEAR` 20; `LIFE_RINGS` 5, `SEG_FLASH_T` 0.8 s.

### 12.2 Economy

| Lever | Value |
|---|---|
| start | `START_MONEY` 120 · **18 lives** (two full rings; `LIFE_STEP` 6) · interest 2% |
| wave timer | `WAVE_TIMER` 6.4 s, or **at once when the field clears**; wave 1 is sent by the first tower |
| interest | `floor(money x rate)` on the credits held when a wave is SENT, **uncapped**; base 2%, a boss drop may add +1% (the owner keeps tuning it down: "97% of a run's money was interest") |
| kill bounty | `bountyBase(w) x type bounty x BOUNTY_MUL 0.7`, `w` the 10-cycle equivalent wave (§5.2); `bountyBase = 2 + 0.35 x min(w,30) + 0.1 x max(0, w-30)`, x1.1 to wave 20 easing to x1 by 30; fractional, shown floored |
| type bounty | fast 0.8 · swarm 0.36 · shield 1.6 · armor 4/3 · boss 3 |
| tower price | `TOWERS[k].cost` 40, **x1.5 per tower standing** (40, 60, 90), shown in each free slot; upgrades are multiples of 40 (§4.1); **sell** 95% of spend (`sellValue`), a second tap within 2 s |
| leak | its type's `leak`: swarm 2, boss 10 (= game over; `BOSS_BREACH` names the boss), others 1 |
| lives back | a boss drop (+6 lives OR +1% interest, half and half by `fixedRand(wave, 4)`); **score** blocks of +6 at 50,000 then every 100,000, earned any time but **paid when the wave's last boss falls** (`G.lifeOwed`; "all rewards should come after boss levels") |
| score | `round(bounty x 10)` a kill, +1000 a life left on a win; never shown (BEST = the furthest wave) |
| speeds | 1x · 1.5x · 2x · 3x (keys 1-4), 10x for the owner (key 5); the sim steps 0.02 s; Temporal Drive always runs at 1x |
| credit fx | a kill's credits fly home as a gold dot (`creditDot`: still `COIN_HOLD` 3 s, then `COIN_ACC` 25), banked on landing with a "+Nc" pop; `Nc` with the `c` in the surround colour, `short()` past 99,999 (123k, 4.0M); interest "+Xc (+r%)" in green under the rings for `CREDITS_FX_T` 2.5 s, the total counting up |

Auto-wait `AUTO_WAIT_*` 6 / 2 / 1 game s -> x0.5 / 0.25 / 0.125; leave a stage past 1.25x its line; 1.5 s real hold.

### 12.3 Tower base stats

| | ARC | FRZ | SOL | ACD |
|---|---|---|---|---|
| design | hit-scan chain lightning | an aura, no shots | a focused ray with locks | continuous jets and pools |
| colour | orange | cyan | pink | chatsubo green |
| `dmg` | 24 a hit | 15 (a tick = 15 x 2.4 x 0.5 = 18) | 73 a beam | 23 x `ACD_BASE_DMG_MUL` 2 = 46/s at x1 |
| `rate` | 3 / s | a tick every 0.5 s | 1.5 / s | 4 ticks / s |
| range (x1.165) | 115 -> 134 | 88 -> 102 (the aura IS the range) | 260 -> 303 | 88 -> 102 |
| leash `MOVE_BASE` | 200 | 240 | 74 | 280 |
| default targeting | Near | Fresh | Biggest | Biggest |
| `GOOD_VS` (build card) | swarms | fast, shields | armor, bosses | shields, bosses |
| main counter of | swarm | fast | armor | shield |
| weak to | armor (grounds the arc) | shields (cannot be slowed) | swarms (one lock) | fast and shields (cold jets) |

- Price: `SKILL_STEP_COST` x the build price 40, one step a level: 2.5, 4, 7, 11, 16, 22,
  29, 37, 46, 56, 67, 79, 92, 106, 121, 137, 154 (a full chart 986.5 build prices, ~39,460c;
  `SKILL_POINTS` 16 = 5 + 5 + 6 tiers, `maxLvl` 18). The capstone costs "the same as
  increasing the level by 2".

| kind | axis | lever | I (1) | II (3) | III (5) | IV (6) |
|---|---|---|---|---|---|---|
| ARC | Conductivity, Voltage | range, each | 1.02 | 1.07 | 1.12 | 1.15 |
| ARC | Capacitance | slide | 1.3 | 2 | 2.4 | 3 |
| FRZ | Sublimation | range | 1.1 | 1.3 | 1.5 | 1.7 |
| FRZ | Permafrost | slide | 1.33 | 2 | 2.4 | 3 |
| SOL | Focus | range | 1.2 | 1.7 | 2 | 2.3 |
| SOL | Refraction | range | 1.1 | 1.35 | 1.55 | 1.7 |
| SOL | Breach | slide | 1.3 | 2 | 2.4 | 3 |
| ACD | Flow | range | 1.02 | 1.06 | 1.3 | 1.5 |
| ACD | Contagion | slide | 1.15 | 1.5 | 1.8 | 2.1 |

Positioning `POS_EVERY` 0.5 s, 36 spots (3 rings x 12 angles), `POS_HORIZON` 5 s, `POS_URGENCY` 6 (x1 .. x7),
`POS_SWITCH` 10%; `HUMAN_V` 450 u/s game time; `PICK_GROW` 1.7; coast: decay by e per 0.35 s, max 1400/s, 60% off a wall.

### 12.4 ARC

A strike hits a target, then forks. A jump never goes back up its own branch; arcs land a
quarter of the shot interval after their parent; reach `ARC_JUMP_BASE` 234 x `ARC_SHRINK`
0.7 a jump; damage x `arcFall^depth`. **Armor grounds the arc**: a strike on armor > 0 stops
there (`ARC_GROUND`); Corrosion or Breach stripping armor to <= 0 lets arcs through again.

| axis | lever | 0 | I (1) | II (3) | III (5) | IV (6) |
|---|---|---|---|---|---|---|
| **Conductivity** (the branching) | strikes / jump layers / forks, reach x | 1/1/2 x1 (3 hits) | 1/2/2 x1.2 (7) | 2/2/3 x1.6 | 3/2/3 x2.0 | 4/3/3 x2.4 (40 a tree) |
| | returns to a struck enemy `v` (from III) | 0 | 0 | 1 | 3 | 4 |
| **Voltage** (raw power) | damage x `ARC_VOLTAGE_DMG` | 1 | 3.64 | 15.55 | 40.76 | 69.9 |
| | a jump keeps `ARC_VOLTAGE_FALL` of the hit before it (> 1 from IV: jumps out-hit the strike) | .5 | .65 | 1 | 1.25 | 1.6 |
| | jump reach x | 1 | 1.15 | 1.45 | 1.75 | 2 |
| **Capacitance** (charges) | charges a hit `n`, each `frac` of the hit | 0 | 1 x .14 | 3 x .14 | 5 x .14 | 8 x .2 |
| | burst slow `ARC_STAT_SLOW` for 0.6 s | - | .25 | .35 | .45 | .55 |

`ARC_BURST_R` 70; burst slow lasts 0.6 s. Tier names (I-VI): Conductivity Transfer / Conduit / Superconductor / Lattice / Storm /
**Hyperstorm**; Voltage Spark / Fry / Vaporize / Arc Flash / Plasma / **Gigavolt**;
Capacitance Static / Charge / Overload / Discharge / Tempest / **Superstorm**.

### 12.5 FRZ

| axis | lever | 0 | I (1) | II (3) | III (5) | IV (6) |
|---|---|---|---|---|---|---|
| **Sublimation** (id `temp`) | aura slow `FRZ_TEMP_SLOW` | .40 | .41 | .43 | .45 | .55 |
| | tick every (s) `FRZ_TEMP_TICK` | .5 | .44 | .34 | .26 | .2 |
| | **Brittle**: a slowed enemy takes x from EVERY tower (credited to the FRZ) `FRZ_BRITTLE` | 1 | 1.15 | 1.45 | 1.75 | 2 |
| **Permafrost** (id `rime`) | a ring pulses to the aura's edge (over `FRZ_RIME_GROW` 2.4 game s) every (s) `FRZ_RIME_PERIOD` | 1 | 1 | .7 | .5 | .35 |
| | permanent stacking slow a pulse `FRZ_RIME` | 0 | .02 | .06 | .11 | .15 |
| | frost that takes armor, x the wave's armor reference, past zero `FRZ_RIME_CRACK` | 0 | .25 | .55 | .85 | 1.2 |
| **Moons** | moons orbiting at 140 (`MOON_SPIN` 2/3 rad/s) as weaker copies of the aura (separate slow sources: they multiply) `FRZ_MOON_COUNT` | 0 | 1 | 3 | 3 | 4 |
| | moon strength `FRZ_MOON_BY` | - | .85 | .95 | .95 | 1 |
| | small moons each (`FRZ_SUBMOON`: radius 84, aura x0.2, the other way round) | - | 0 | 0 | 3 | 4 |

`FRZ_CHILL_K` 6, `FRZ_RIME_GROW` 2.4 game s, `FRZ_RIME_FULL` 0.7, moon orbit 140, `MOON_SPIN` 2/3 rad/s, `FRZ_SUBMOON` radius 84 at aura x0.2. Tier names: Sublimation Chill / Freeze / Absolute Zero / Permafrost / Heat Death / **Zero
Point**; Permafrost Frost / Glacier / Cryosphere / Ice Sheet / Glaciation / **Ice Age**;
Moons Moon / Twin Moons / Desolation / Satellites / Eclipse / **Constellation**.

### 12.6 SOL

| axis | lever | 0 | I (1) | II (3) | III (5) | IV (6) |
|---|---|---|---|---|---|---|
| **Focus** | beams a shot, converging, **each a full hit** `SOL_BEAMS` | 1 | 2 | 4 | 6 | 8 |
| | shield charges popped a beam `SOL_SHIELD_POP` (+ `SOL_REFRACT_POP` on hops: 1 / 2 / 3, IV 4) | 1 | 2 | 4 | 6 | 8 |
| | beam strength `SOL_FOCUS_DMG` | 1 | 1 | 1 | 1.176 | 1.3 |
| **Refraction** | more enemies the shot bends on to `SOL_REFRACTION`, every hop FORWARD | 1 | 3 | 10 | **all ahead**, then out of sight (`solOutOfSight`) | two opposite cones |
| | a hop hits x `SOL_REFRACTION_DMG` | 1 | 1 | 1.84 | 3 | 4 |
| | cone half-angle (deg) `SOL_CONE_BY`: starts at the FIRST enemy struck, points where it holds the most | 8 | 24 | 32 | 32 | 40 |
| **Breach** (SOL's own) | armor stripped **for good, below zero too** a hit `SOL_BREACH_ARMOR` | 80 | 200 | 550 | 1100 | 1500 |
| | crit x `SOL_CRITMUL` at the base 10% chance | 3 | 4 | 7 | 9 | 12 |

`SOL_HOLD` 2x range; shrapnel up to 8 pieces within 90. Tier names: Focus Convergence / Crux / Disintegration / Lance / Supernova / **Solar
Flare**; Refraction Lens / Prism / Spectrum / Halo / Aurora / **Corona**; Breach Pierce /
Sear / Flare / Brand / Sunfire / **Starfire**.

### 12.7 ACD

| axis | lever | 0 | I (1) | II (3) | III (5) | IV (6) |
|---|---|---|---|---|---|---|
| **Corrosion** | a tick strips this share of its own damage from armor, **below zero without limit** (jets only) `ACD_CORRODE` | 0 | .1 | .3 | .6 | .9 |
| | goo drops home on the nearest other enemy within `ACD_DRIP_PULL` | - | 50 | 80 | 120 | 150 |
| **Flow** (id `spray`) | jets `ACD_LINES` | 2 | 3 | 6 | 8 | 11 |
| | a jet keeps this of its ramp when its enemy dies **or escapes** `ACD_FLOW_CARRY` | 0 | .3 | .7 | .9 | .9 |
| | slows what it burns `ACD_FLOW_SLOW` (doubled on fast) | 0 | .05 | .11 | .17 | .2 |
| **Contagion** | pools `every` s / `life` s / radius `ACD_CONTAGION` | 1.2 / 6 / 55 | 1.2 / 9 / 62 | 1.18 / 16 / 80 | 1.18 / 25 / 105 | **1 / 40 / 150** |
| | pool heat `ACD_PUDDLE_HEAT` | .10 | .11 | .13 | .15 | .20 |
| | an enemy killed in a pool leaves a pool (0.8 r, 0.5 life; at most 240 a tower) | no | yes | yes | yes | yes |

Ramp doubles every `ACD_DOUBLE[0]` 0.5 s to x`ACD_BASE_MAX` 32; `ACD_SHIELD_POP` 1; pools capped x`ACD_PUDDLE_CAP` 8; goo `DRIP_REAL` 3, `DRIP_UNIT` 0.3, `DRIP_LIFE` 40 s, `DRIP_TAKE` 2x, `DRIP_MAX` 1000. Tier names: Corrosion Etch / Corrode / Dissolve / Erode / Annihilate / **Oblivion**; Flow
Mist / Downpour / Torrent / Deluge / Cascade / **Monsoon**; Contagion Blister / Plague /
Pandemic / Epidemic / Blight / **Extinction**.

### 12.8 Core powers

Temporal Drive: hold 400 ms, 6 game s, cooldown 3 waves (`TEMPORAL[3]`), `TEMPORAL_R` 560. Orbital Relay: `RELAY_MUL` 3 for 11.25 s, cooldown 4 waves.

### 12.9 Enemies and curves

| type | die | speed (x `ENEMY_BASE_SPEED` 76) | hp | bounty | leak | special |
|---|---|---|---|---|---|---|
| swarm | d6 | x1.1 | 0.112 x 1.15 | 0.36 | 2 | wanders; HP and size jittered 50-300%, speed x0.5-1.5 on its own roll |
| shield | d8 | x0.933 | 0.6 | 1.6 | 1 | 4 base charges, scaling with the wave; one charge a hit whatever its size; **holds off every slow** |
| armor | d10 | x0.7 | 1.25 | 4/3 | 1 | armor 15 x `ENEMY_HP_MUL`, scaling with HP (`armorGrow`); a flat bite off every hit (floor 10% of the hit; negative armor adds) |
| fast | d4 | x1.5 x 1.037 x 1.1 | 0.65 | 0.8 | 1 | a long tracer; takes every slow double |
| boss | d20 | x1.0 | 3.5 | 3 | 10 = game over | §5.4 |

`ENEMY_SPEED` 1.125; size to 5% of HP (a boss 10%), `SIZE_LOG` 0.25.

| Curve | Formula |
|---|---|
| HP | `(9 x hpPow(w) + 2w) x type hp x 2 x plain factors`; `hpPow = HP_GROWTH^(min(w,20)-1) x HP_LATE^(max(0,min(w,80)-20)) x HP_END^(max(0,w-80))`, `HP_GROWTH` = `HP_LATE` 1.13, `HP_END` 1.07 (knees at eq 20 and 80 = real 24, 96: the endgame eases because towers are built by ~80) |
| plain (non-boss) HP | x1.0 to wave 12, x1.2 to 24, x1.5 after (`plainHpMul`); then `plainHpGrow`: / `speedGrow^0.75`, a **mid-game hump** of up to +50% on waves 48-72 eased in from 24 and out to 96 (`MID_HP`); early shields x0.6 HP and early armor x2 HP, both easing to x1 by eq 30; swarm waves x1.5 total HP |
| speed | non-boss x `speedGrow` = 1 + 0.5 x smoothstep over waves 12..84, +0.01 a wave after; every enemy x `speedRamp` (+0.2% a wave past 49) |
| shields | `shieldsOf`: 4 charges x `(1.15^(n-1) + 4n/18)^SHIELD_EXP 0.29`, HP compensating the charges taken |
| armor | `armorGrow`: the HP curve ^ `ARMOR_EXP` 0.4 to wave 49 (`ARMOR_HP_FROM`), then HP growth ^ `ARMOR_HP_EXP` 0.9 |
| late traits (from `LATE_FROM` 49) | swarms x(1.3 + .006/wave) bodies; fast x(1.15 + .004/wave) faster |
| hybrids (from 97) | swarms carry 10% of a shield unit's charges; fast 10% of an armor unit's armor (outline in that type's colour) |
| counts | base `10 + floor(0.5 x eqWave)`, swarm x6, all /2, x `WAVE_COUNT_MUL` (waves 1-11 hand-tuned so one L1 tower clears them: 2 x.5, 1 x.75, 3 x.67, 4 x.75, 6 x.67, 7 x.75, 10-11 x.5) x `TYPE_COUNT_MUL` (swarm 0.1625 x0.8 · shield .99 · armor 1.07 x1.5 · fast 2; all x0.9); swarms x2 from eq 11 (`SWARM_X2_FROM`) and x2 more over eq 11-60, x1.5 after (`swarmMul`); fast x0.65 past eq 80; a swarm WAVE never under `SWARM_WAVE_MIN` 12 bodies (after lane rounding; fleets keep their own); rounded to whole formations (§5.3) |
| order | swarm (1), shield (2), armor (3), fast (4); from wave 5 a type by hash, never the same as the wave before (a boss does not break the alternation) |

Spawn gaps: a swarm body every `0.024 / ENEMY_SPEED` s, others 0.8 s, `BOSS_INTRO` 2 s. Formations: `FORM_FADE_R` 160, `FAST_PAIR` 26, `FORM_SPIN` 160, `V_N` 5, `V_BACK` 28, `V_LAT` 24, `ARMOR_W` 3, `ARMOR_PITCH` 36, `e.jit` 18-63, `JIT_FADE_R` 400.

### 12.9-bis Late armor against raw hits (7.5.3, 2026-11-05)

Measured on the game code (`spawnEnemy` at each wave, the most armor of six spawns; scratch probe `armor-probe.mjs`). "Raw at cap" is the
largest raw tower hit that loses the full `ARMOR_CAP` 90% (hit x `scaleOf` <= R / 9); the last columns are the share a raw hit loses.

| wave | `scaleOf` | armor: swarm / fast / shield / armor | raw at cap: armor | shield | swarm | raw 1000 loses: armor / shield / swarm | raw 100 loses: armor / swarm |
|---|---|---|---|---|---|---|---|
| 60 | 1.000 | 7 / 7 / 11 / 319 | 35 | 1 | 1 | 24% / 1% / 1% | 76% / 7% |
| 70 | 0.450 | 8 / 8 / 13 / 380 | 94 | 3 | 2 | 46% / 3% / 2% | 89% / 15% |
| 80 | 0.213 | 11 / 11 / 16 / 479 | 250 | 8 | 6 | 69% / 7% / 5% | 90% / 34% |
| 90 | 0.113 | 15 / 15 / 23 / 678 | 665 | 23 | 15 | 86% / 17% / 12% | 90% / 57% |
| 100 | 0.060 | 18 / 18 / 27 / 795 | 1,471 | 50 | 33 | 90% / 31% / 23% | 90% / 75% |
| 110 | 0.035 | 18 / 18 / 27 / 782 | 2,451 | 85 | 56 | 90% / 43% / 34% | 90% / 84% |
| 119 | 0.022 | 17 / 17 / 26 / 764 | 3,855 | 131 | 86 | 90% / 54% / 44% | 90% / 89% |

Fast's armor is swarm's (`ARMOR_ALL` 10% each). The scaled armor itself stops growing near wave 100; the cap point keeps climbing because
`scaleOf` keeps shrinking the hit.

### 12.10 Bosses

| wave | boss | `BOSS_HP` | `BOSS_FAR` | trick | fleet (escort type) |
|---|---|---|---|---|---|
| 12 | Star | 32 | | none (needs two towers or an upgrade) | fast, x3, behind and tight |
| 24 | Empress | 6.8 | 3.5 | sheds `EMPRESS_BROOD` 12 swarmers each fifth of HP lost | shield |
| 36 | Strength | 2.2 | 3.5 | no slow touches her, Temporal Drive included | armor |
| 48 | Chariot | 3.4 | | sprints x3 for 1 s every 4 s, fleet with her | fast |
| 60 | Lovers | 2.4 | | a pair on two opposite lanes; kill one and the other heals full and runs x1.5 | swarm |
| 72 | Temperance | 1.22 | | regenerates 6% HP a second | shield |
| 84 | Devil | 0.76 each | | six full bosses on six lane copies; the reward paid once by the last | swarm |
| 96 | Justice | 6.4 | | no hit takes more than 2% of her HP; slowed (speed x0.75) | armor, x0.75 |
| 108 | Judgement | 3.4 | | rises once at 50% HP; her swarm spreads over 12 lanes | swarm |
| 120 | Death | 3.2 | 2.8 | none: a juiced-up Star | all four |

HP = `enemies.bonus.hp` x `BOSS_HP` x `BOSS_HP_K` 1.4 (not the Star) x `BOSS_FAR` x `BOSS_LANE_HP` 1.107; a boss's shield 0.5 of a shield enemy's charges; size x1.1 .. x2; `FLEET_GAP` 10, `FLEET_TO_BOSS` 0.2; `BOSS_INV_T` 3 s, `BOSS_BAR_R` 400.

### 12.10b IFR at 6.5.0 (2026-10-20, the axes redone)

Index 0 (untaken) .. 5 | VI. x = TOWERS.ifr.dmg (60). Battery: solo.mjs 16 seeds (lone L1 0-3 lives lost on waves 1-11; untuned
14-22); countermx spread 61-69 @6 pts 4 seeds IFR 28/88/57/78 swarm/fast/shield/armor (6.4.x: 7/59/12/47) - marks swarm +2,
fast -2, shield +1, armor -1; focus N=1 @8 pts, 81-89 / 101-109: Meteor VI 4/1/30/0 | 50/2/86/0, Hellfire VI 3/11/2/51 |
17/96/80/100, Blk Magic VI 3/9/0/55 | 10/96/19/100.

| table | 0 .. 5 | VI |
|---|---|---|
| charge s (Meteor) | 1.0 .95 .9 .8 .7 .6 | 0.3 |
| meteor radius u (Meteor) | 27 30 33 37 42 47 | 54 |
| en-route hit x (Meteor) | 1.5 2 4 10 60 400 | 8000 |
| fire max radius u (Hellfire; floor: the meteor) | 0 40 60 85 110 130 | 160 |
| fire speed u/s / linger s | 60 .. 180 / .5 .. 3 | 220 / 5 |
| fire tick x, every 0.05 s (Hellfire) | .1 .15 .3 1 2.5 5 | 15 |
| pellets / pellet hit x (Blk Magic) | 4 5 6 7 8 10 / .5 .6 .8 1.1 1.6 2.5 (6.5.1: halved, owner "reduce flare counts, increase flare sizes"; were 8 .. 20, VI 24) | 12 / 4 |
| flare size `IFR_FLARE_K` | 12 (6.5.1: x2; was 6) - solo 0-2 lost; focus 81-89 / 101-109 Meteor 4/1/27/0 / 43/2/87/0, Hellfire 4/11/2/39 / 20/96/79/100, Blk Magic 2/9/0/59 / 12/96/34/100; spread 25/88/55/78 | |
| 6.5.2 spread fix (owner: "fix" the spread build) | fire tick [.1 .6 .7 1 2.5 5], fire r [0 60 60 85 110 130], linger [.5 2 2 2 2.5 3] VI 7, pellet hit [.5 1.5 1.6 1.7 2 2.5], flare tick [.41 1.5 1.55 1.6 1.8 2.27] - spread 61-69 4 seeds IFR 6/63/9/73 (marks swarm +1 fast -1 shield +2 armor -2); focus 81-89 / 101-109 Meteor 4/1/14/0 / 35/2/73/0, Hellfire 3/9/1/41 / 12/96/53/100, Blk Magic 2/9/0/65 / 13/96/33/100; solo 0-2 | |
| fires a tower | uncapped (6.5.1, owner: "dont cap fire stacks"; 6.5.0 capped them at 10) | |
| flares (Blk Magic): length, width, burn, tick | the 6.4 Hellfire tables | |
| giant flare | x4 a VI flare's size and hit | |

### 12.11 Damage, slows, numbers

`SLOW_KNEE` 0.4, `SLOW_CAP` 0.7, `TOWER_SLOW_MAX` 0.95, `FAST_SLOW_MUL` 2; `VIS_DMG` 2; `POOL_LOD` 24; `DMG_HOLD` 0.1 s, `DMG_FLY` 90 u/s; crit base 10%.

### 12.12 Interface and rendering budgets

`DRAG_PX` 6, `HOLD_SLOP` 18 css px, `CHART_MIN` 140, `CHART_FLOOR` 80, landscape >= 700 px; wave list `WAVE_ICON` 5-18 px, `WAVE_ROW_H` 22, `WAVE_SPAN` 110 (95 phones), threat marks within 4 s; sell arms 2 s.

3D: `WARP.tilt` 0.55 rad, `fov` 0.9, `depth` 0; prism height `18 + 12 x (level-1)`; fog over 30 units in 8 slices; far-detail radius 1600 -> 600 past 28 ms frames; auto step-down past 34 ms for 3 s; `LOW_RES` 0.5.

| Layer / budget | Value |
|---|---|
| board (background, graticule, lanes) | redrawn and uploaded at most every `WARP_STAT_MS` 150 |
| moving (beams, shots, ranges, coins, goo, threats) | every frame on a layer `WARP_DYN_K` 0.5 of the picture a side; the shader lays it over the board |
| instances | hits, sparks, flashes, plain rings as GPU instances in one batch (`aspira-fxgl.js`); `aspira-glctx.js` is a 2D-context stand-in turning circles, gradient discs and straight strokes into instances |
| picture | a square `WARP_TEX_R` 860 units from the core, at most `WARP_TEX_MAX` 2048 px, at `WARP_RES` 0.75 of the 2D canvas, density capped `RES_CAP` 2 (`canvasDpr()` is the only density read) |
| text | drawn once and stamped (`aspira-textcache.js`): a 6M px ~24 MB budget, least-recently-used out, evicted canvases zeroed so iOS frees them |
| live caps | `DMG_MAX` 120 damage numbers, `SPARK_MAX` 300, 240 pools a tower, 1000 goo drops |

| Visual | Value |
|---|---|
| tracers | star 320, fast 120, shield/armor 80, swarm none; taper along the lane's curve; a point every 10 u (was 6, 2026-10-28) |
| beams | last 2x their asked life at 2x brightness; width log of the hit (`BEAM_MIN` 0.4 + 1.6/decade, max 10) |
| core hit | the screen shakes 14 px over 0.35 s (re-armed, not stacked) with a shutdown sound |
| Temporal Drive rings | octagons on the floor, no `shadowBlur` |

Audio: 24 voices; shots 0.6, bosses / upgrades / builds 2, kills 0.4; volume 0-2.

iPhone slow logs (2026-10-28, 15 sessions of 6.15.0-6.15.4, the baseline before the 6.15.41-6.15.46 perf work): frames ~17 ms
(vsync-bound), GL 4.5 ms median of which texture binding 3.1 (up to 9.2), entity drawing ~1.1 ms; 20-45 Mpx/s of canvas uploads,
nearly all the moving layer; a frame after an upload went over 40 ms 1.30% of the time (764 / 58916), 0.49% without (379 / 77828) -
2.6x. The fallbacks behind them: GRV's nova glow in another colour (`stroke:shadow`, ~35 a second with GRV out) and the boss sky's
triangle clip, both on the batch since 6.15.45 / 6.15.46; GRV's overlapping-aura cap (`drawImage`, ~5 a second) is still the canvas's.

### 12.13 Meta

TOP PLAYERS: `ASC_MAX` 6 posts an IP an hour, `SHOW_MAX` 500, a win `1 <= lives <= 100000`, wave 11..1000, a team of 1-5 kinds, `OWNER_SHOWN_FROM` 2026-10-14 00:00 ET. Slow logs every 180 s, 30 posts an IP an hour, 16 KB, 400 files kept. Smoke: 22 checks.

