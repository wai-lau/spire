# IFRIT - the seventh tower (design, 2026-10-19)

The owner's design, 2026-10-19 (quoted rules are hers). Based on Ifrit, the fire aeon of
Final Fantasy X (Meteor Strike, Hellfire, the Fire line). Orange. Version **6.2.0** - the owner keeps it within 6 (overrides "a new
tower is a new major", ARCHITECTURE.md 9.4: the next MINOR after 6.1.0). Id `ifr`, shown **IFR**, name "Ifrit".

## 1. Why: the gap the sim shows

countermx 6.0.1 (three 6-point towers of one kind, waves 61-69, % leaked): armor is held by
SOL alone (ARC 94, GRV 81), shield by ARC and CRR (ACD 48, SOL 57). The trio diagnostic on
6.0.4 (committed sim, 3 seeds, lives lost over waves 60+): the ARC-less trios bleed to
**swarm first, shield second** (SOL+ACD+GRV 36 swarm / 10 shield; ACD+GRV+CRR 48 / 3;
FRZ+SOL+ACD dies to Temperance's shield fleet x3). Every trio with ARC finishes at full lives.

**Ifrit's slot (owner): main swarm + shield, neutral armor, weak to fast.** Not the
six-tower square: it doubles the swarm and shield mains (`COUNTERS.swarm.main` gains `ifr`,
`COUNTERS.shield.main` gains `ifr`; no `help` entries). Fast beats it because the ball is
slow and aimed with no lead; armor bites every hit as usual (no pierce, no bonus).

## 2. The ball (the mechanism)

![The ball's life](../../arch/ifrit-ball.svg)

| Part | Rule |
|---|---|
| **charge** | "Visually build up a ball close to itself (slowly gets bigger until a size). Always be charging while there are free slots." One ball charges at a time, `charge` 0..1 over the charge time; full, it sits in its slot. A tower with free slots is never idle: it stockpiles balls between waves |
| **slots** | balls sit **centred on the hex's corners**, so the limit is **6**. By slot count: 1 = a random corner (fixed per tower, `fixedRand`-free: picked at build, stored on the tower); 2 = that corner and its opposite; 3 = an equidistant triangle (every other corner); 6 = all. **4 and 5 never occur** (Meteor's ladder skips them) |
| **launch** | a charged ball + an enemy in range -> it flies at that enemy's position NOW (no lead). With several charged, one launches every `IFR_LAUNCH_GAP` **0.05 s** (a dump). Targeting default **Near** |
| **flight** | slow (`IFR_BALL_V`), small (`IFR_BALL_R`); it hits every enemy it passes through once for the **en-route hit** and keeps going. The charge ball is drawn big; in flight it is drawn small ("it's small") |
| **impact** | at the aim spot the ball bursts: a **ring** expands quickly (`IFR_RING_V`) to the blast radius, hitting each enemy it passes once for the **blast hit**; at the same instant `pellets` **pellets** fire, one at each of up to `pellets` units inside the blast radius (random picks; fewer units = pellets double up), non-homing, with travel time (`IFR_PELLET_V`, radius `IFR_PELLET_R`) - they can miss |
| **flare** | where a pellet stops (the first enemy it touches, else its aim spot - **a miss still bursts where it was aimed**) it bursts into a **flare of six beams** 60 degrees apart (a hexagonal star like the tower's own hex; world axes: 3D is a view), each `beamLen` long and `beamW` wide, burning for `burnS`: every `tickS` a quiet tick of `tickDmg` on every enemy touching a beam; each tick pops a shield charge. Beams are a flat effect on the board; they obey `EFFECT_MAX_S` 10 s |
| **shields** | the ring pops one charge per enemy; every burn tick pops one; the en-route hit pops one. A shield wave standing in flares melts |
| **armor** | every hit (ring, pellet, tick, en-route) takes the armor bite like any other tower's: neutral |
| **fast** | no lead, slow flight: a fast enemy is gone before the ring opens; the flares burn where it was |
| **Relay** | x`RELAY_MUL` the charge rate (`relayStats`), like the others |

## 3. The chart (starting values - the simulator sets the final ones)

Per-tier tables index 0 (untaken) .. 5 (tier V); `aspira-capstone.js` pushes index 6 (VI).
Purchases I II III IV read indices 1 3 5 6 (`SKILL_STOPS`).

| axis | job | buys | capstone (VI) |
|---|---|---|---|
| **Meteor** | DEPTH + TEMPO of the ball | **slots** `[1, 2, 2, 3, 3, 3]`; **charge time** s `[2.0, 1.6, 1.3, 1.0, 0.8, 0.6]`; **ball speed** u/s `[140, 170, 200, 240, 280, 320]`; **en-route hit** x blast `[0.25, 0.5, 1, 2, 4, 8]` ("a lot to make up for the faster travel speed"); range x `[1, 1.1, 1.2, 1.3, 1.4, 1.5]` | **Impact**: 6 slots; charge time 0.1 s ("near the launch rate"); speed 360; en-route x16 |
| **Hellfire** | the FLARE | beam length u `[50, 65, 80, 100, 120, 140]`; width u `[10, 12, 14, 16, 18, 20]`; burn s `[1.5, 2, 2.5, 3, 4, 5]`; tick s `[0.3, 0.27, 0.24, 0.2, 0.17, 0.15]`; tick x blast `[0.08, 0.12, 0.18, 0.27, 0.4, 0.6]` | **Hellfire**: the beams run to the play-box edges (`phoneBox()`), burn 10 s |
| **Firaga** | the BLAST | blast radius u `[60, 70, 80, 95, 110, 130]`; blast hit x `[1, 1.5, 2.3, 3.5, 6, 10]`; pellets `[5, 6, 7, 8, 9, 10]`; slide x `[1, 1.3, 1.6, 2, 2.2, 2.4]` (the fire roams) | **Backdraft**: every pellet bursts into a **smaller ring** too (half the blast radius, half the hit) |

Tier names: Meteor = Pebble, Stone, Rock, Boulder, Meteor, **Impact**; Hellfire = Kindle,
Flare, Blaze, Inferno, Conflagration, **Hellfire**; Firaga = Ember, Fire, Fira, Firaga,
Pyre, **Backdraft**. Each axis is one lever a tier (ARCHITECTURE.md 4.5: no tier lowers a
stat; words change only when behaviour changes).

Base (`TOWERS.ifr`): cost 40, `dmg` 60 (the blast hit; SOL-grade), `rate` = 1 / charge
time, range 200 (a mortar: between CRR 160 and SOL 260), `MOVE_BASE` 200 (medium).
`KEY_STATS`: Damage, Slots, Charge, Blast, Pellets, Burn.

## 4. The seven hues

Seven OKLCH slots 360/7 = 51.4 degrees apart (the six were 60 apart, 2026-10-16), each
tower keeping its own OKLCH lightness and chroma, gamut-mapped to sRGB, neighbours checked
by CIEDE2000 (smallest pair 25, the six's smallest was 28). Ifrit takes orange at h50; ARC
moves to yellow (lifted to L 0.88 for a clean lightning yellow instead of khaki).

| tower | OKLCH h | token (hsl) | hex |
|---|---|---|---|
| SOL | 359 | `339 91% 77%` | `#fa8fb4` |
| **IFR** | **50** | `23 100% 65%` | `#ff904c` |
| ARC | 101 | `55 63% 67%` (L 0.88) | `#eada69` |
| ACD | 153 | `140 61% 65%` | `#6fdd94` |
| FRZ | 204 | `184 95% 48%` | `#06e1f1` |
| CRR | 256 | `212 91% 55%` | `#2484f5` |
| GRV | 307 | `278 85% 43%` | `#8811cb` |

Ink tokens shift by their tower's delta: `--asp-violet-ink-hsl` 272 -> 264, `--asp-blue-ink-hsl`
216 -> 218. Enemy colours untouched. The script that computed these: `scripts/aspira-sim/hues.py`
(to be added; prints the ring and the dE table for any anchor).

## 5. Look and sound

- Charge balls: filled discs on the corners, radius growing with `charge`, the tower orange
  with a white-hot core at full; a dump staggers visibly (0.05 s apart).
- Ball in flight: a small orange disc with a short trail (stroked line, like CRR's hairlines).
- Ring: a stroked circle growing at `IFR_RING_V`, thinning and brightening as it opens (GRV's
  nova inverted).
- Pellets: tiny discs; a flare: six stroked beams, orange at low alpha with a bright hairline
  down the middle, fading over the burn.
- Everything is fills, strokes and single lines: the moving layer turns them into GL instances;
  no gradient on the board context (ARCHITECTURE.md 11). Pure-decoration draws check `lowQ`.
- Sfx: `ifr` (launch: a low thump, cap 3) and `ifrblast` (the ring: a crackle, cap 3).
- Damage numbers: the tower orange, no ink token (orange reads on the board).

## 6. Code plan

| Where | Change |
|---|---|
| `web/aspira-ifrit.js` (new, < 500 lines; split on a seam if not) | the tables, `ifrSkillStats`, `stepIfr` (charge, launch, flight, impact, pellets, flares, burns), `drawIfr`; loaded after `aspira-crr.js` |
| `aspira-defs.js` | `TOWERS.ifr`, `COUNTERS` swarm + shield mains, `BOSS_KILLERS` unchanged |
| `aspira-game.js` | the tower loop dispatch `if (t.kind === "ifr") { stepIfr(t, dt); continue; }` |
| `aspira-towers.js` | `MOVE_BASE.ifr` 200; the corner geometry helper (hex corners at `TOWER_K`) |
| `aspira-core.js` | `relayStats`: x3 charge rate |
| `aspira-capstone.js` | `CAPSTONE_NUM` entries for every new table; `CAPSTONE_TIERS` names; `SKILL_MOVE.ifr` |
| `aspira-stats.js`, `aspira-sliders.js` | the stat rows and `KEY_STATS` |
| `aspira-desc.js` | the `DESCRIBE` template (fire words: ball, ring, flare, beams, burn; never "jets"/"pools"; NEVER "cross"); regenerate `docs/spire-descriptions.md` |
| `aspira-sfx.js` | the two sounds, `SOUND_MAX` |
| `aspira-chooser.js` | `VS_MARKS.ifr` (from countermx); the build chooser shows seven cards, two columns (a last row one short is allowed) |
| `aspira-floats.js` | `DMG_INK` none |
| `aspira.css`, `aspira-ascend.css`, `aspira-endstats.css`, `templates/aspira.html` | the seven hue tokens, `.asp-sw.tifr`, the `[data-kind="ifr"]` rules, a swatch; palette lint baseline updated (`lint-colors.py --update`) |
| `api/spire_board.py` | `TOWER_KINDS` + `ifr` (team validation and order) |
| `scripts/spire-smoke/smoke.mjs` | `ifr` in both kind loops |
| `scripts/aspira-sim/sim.mjs` `FILES`; `countermx.mjs`, `trios.mjs`, `tribal.mjs`, `solo.mjs` | the new file; `ifr` in the kind lists (`KINDS=` defaults) |
| `tests/test_spire_board.py`, `test_spire_sliders_browser.py` | the seventh kind |
| `web/aspira-version.txt` 6.2.0 (the next minor after 6.1.0; owner: stay within 6); `aspira-changelog.js` | "Ifrit: ..." lines |
| `ARCHITECTURE.md` 4.1 (seven kinds), 4.6 (the matrix row), new 4.6e Ifrit, 10.1 (colours: seven tokens); `ARCHAEOLOGY.md` the starting numbers | docs |

Traps to honour: no mid-line `//`; a new top-level name must not collide (prefix `IFR_` /
`ifr`); `G` structured-cloneable (balls, pellets, flares are plain objects on the tower or
in a module list rebuilt from `G`); per-tier tables exactly 6 before capstone.js; durations
in game s, cooldowns in waves; `fixedRand` only for wave-shaping (the corner pick is per
tower, `Math.random` is fine - the sim seeds it).

## 7. Tests and balance gates (before 6.2.0 ships)

1. `node scripts/spire-smoke/smoke.mjs`: Ifrit builds, fires, draws; 3D frame.
2. `.venv/bin/pytest apps/spire/tests` (board accepts `ifr`; sliders at both sizes).
3. `solo.mjs`: a lone L1 Ifrit clears waves 1-11; every L1 pair (Ifrit with each kind) beats
   the Star.
4. `countermx` 61-69 spread: swarm and shield low (the mains), fast high (the weakness), armor
   middling. Then `marks.py --write`.
5. `tribal.mjs` on the 35 trios of seven kinds (or the 15 with Ifrit first): Ifrit's factor
   near 1; the ARC-less trios improve with it; no previously winning trio loses.
6. Phase margins (`axis.mjs` summary) early / mid / late: Ifrit's factor within 0.9-1.1.

## 8. Settled questions

- Split payload: NO - full splash (owner: good vs swarm).
- A missed pellet bursts where it was aimed (owner, confirmed).
- Slots 1 / 2 / 3 / 6 on the hex corners; 4 and 5 never (owner).
- Firaga capstone: pellets also burst into a smaller ring (owner).
- Lands after exec-fn-f8's 6.1.0 balance patch (SOL weak vs swarm via the Refraction angle).
- **No cross, in shape or word** (owner, 2026-10-19): the burning shape is a FLARE of SIX beams; "burning cross" is Klan imagery. Names `ifrFlare` / `t.ifrFlares`; the card says "a flare of six beams".
