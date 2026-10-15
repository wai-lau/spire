# THE SPIRE — game design document

A spiral tower-defence game at `wai-lau.net/spire`, played on a phone first. This is
the CURRENT design, organised by topic and verified against the code (2026-10-14;
game version 4.3.x). How we got here, superseded values and the incidents behind the
traps are in **ARCHAEOLOGY.md** (its sections mirror this one's numbering). The
verbatim pre-rewrite text of this file is in git: `git show f00d730:ARCHITECTURE.md`.

Reading notes. "The owner" is Wai (she/her); a short quoted owner rule stays where it
is the reason for a design. The game moved out of exec-fn's ARCHITECTURE.md (old §22)
into this repo (`wai-lau/spire`, submodule `apps/spire`) on 2026-10-14. **Code
comments, `scripts/aspira-sim/README.md` and the parent's CLAUDE.md that say
`ARCHITECTURE.md §22` mean this whole document.** A bare `§N` in an exec-fn
context means exec-fn's ARCHITECTURE.md (how it serves this app: its §1e). File names
keep `aspira-*` (the game's first name); the player-facing name is THE SPIRE, and the
in-game title reads `the source`, `ascendant` after a win, or the boss's name while one
is out. Units: "world units" are the 1000 x 1000 chart; "s" is real seconds at 1x
speed unless it says "game s" (game time follows the speed setting).

## 1. Overview and pillars

**The game.** Enemy dice crawl inward along spiral lanes toward a hexagonal core; up
to three towers shoot them. Every 12th wave is a boss from the Major Arcana, with a
fleet of escorts. The game is **won when the 10th boss (wave 120, Death) and its fleet
fall**; it is **lost when the core's lives hit 0**, and any boss that reaches the core
ends it at once. A full run is 120 waves.

**The loop.** Tap an empty slot to build (the first tower starts wave 1) -> waves warp
in on a timer, or at once when the field clears -> kills pay credits, which fly home to
the core -> spend them on a new tower or on tier points on a tower's three-axis chart
-> bosses hand out the core's two powers (waves 24 and 48) and extra lives.

**Pillars (each is an owner rule, and each constrains later changes).**
1. **Phone first.** The whole board lives in one fixed "play box" every standard phone
   shares (§2.4, §7.1): no zoom, no pan. Design and verify at 430x932 and 382x700 first.
2. **Three towers, four kinds.** `MAX_TOWERS` 3 on three open slots; which three kinds
   is the strategy. Every trio of kinds must be winnable (owner: "for every combination
   of 3 towers, it is possible to win"), which means no kind is required.
3. **Towers are moved by hand.** Drag any tower, any time, inside its leash; it keeps
   firing and coasts on release. Nothing moves itself, except under Auto-move, which a
   win unlocks and which disqualifies the game from TOP PLAYERS (§4.1).
4. **Every upgrade is a choice.** Each tower has THREE axes of six tiers, and a tower may
   take only ONE axis to the sixth (capstone) tier. No upgrade ever lowers a stat.
5. **Only behaviour is told.** Card text changes words only when behaviour changes; a
   tier that just moves a number changes the stat row, not the sentence (§7.4).
6. **Counters, not a best tower.** Each enemy type has a main counter tower (§4.6).
7. **The 3D view is a view, never a rule.** Ranges, hits and timing are 2D; 3D only
   changes how the same game is drawn (§8.1).
8. **Waves are fixed.** Wave type, lane split and bonus drops come from a hash of the
   wave number, so every game is the same sequence; only crits, swarm jitter and speed
   jitter are random.
9. **Honour system leaderboard.** The game runs in the browser, so nothing can be
   proven; TOP PLAYERS guards only shape and rate (§9.1).

## 2. Board and geometry

### 2.1 The chart
- World 1000 x 1000 (`W`), core at `CX`=`CY`=500, `CORE_R` 25. Twelve lanes enter every
  30 degrees. A fixed star field (`STARS`, white, seeded once, twinkling), a graduated rim
  (`RIM_R` 482), a sparse polar graticule and a ruler (`RULER_R` 2000) decorate it; the
  board is FIXED, not random.
- The core is a white hexagon whose lives are drawn as shield segments (§2.5), the
  credits as a number on it (centred, with a small `CRED`), the interest payout and
  "X lives left" just under its rings.

### 2.2 Lanes
- Lanes are mirror pairs (2j, 2j+1) winding opposite ways with the same turn count. Only the
  odd (clockwise) twin is ridden: **everything rides clockwise**. Each lane starts with a
  straight radial lead-in (`LEAD_R` 2400 -> `R0` 760), then an Archimedean spiral to
  the core. Winding is driven by pitch, not angle-vs-t (`theta = turns*2pi*F(t)/F(1)`,
  `F' = t^TANGENT_Q / (r + LANE_SOFT_R)`, `TANGENT_Q` 2, `LANE_SOFT_R` 200), so lanes
  leave the lead-in without a hook and coil gently near the core. Pairs 1, 3, 5 are
  ellipses stretched by `ELLIPSE` 0.7 along their own mirror axis. The drawn lane runs on
  under the core to its centre; the walked path ends at `R1` = `CORE_R`.
- **Each enemy type has its own pair** (`TYPE_PAIR`, `PAIR_TURNS`), so the type fixes the
  path length and every enemy moves at the same base speed along it:

  | pair | type | turns | note |
  |---|---|---|---|
  | 0 | armor | 0.2375 | the most direct |
  | 1 | boss | 2.1975 | elliptical |
  | 2 | swarm | 0.05 | almost straight |
  | 3 | shield | 0.6 | elliptical |
  | 4 | fast | 0.4 | still a curve |
  | 5 | spare | 0.9025 | elliptical, unused |

- Enemies **spawn where the lane first crosses `SPAWN_R` 600** from the core (all spawns
  equidistant, whatever the screen). `FIRE_R` 250 is the radius the "time under fire" of
  a lane was measured in.
- A wave's group is split over **rotated copies of its lane** (360/k degrees apart about
  the core): swarm 20 or 24 copies, fast 3 or 5, shield 2 or 3, armor always 2, a boss 1
  (Lovers 2 opposite, Devil 6), a Judgement's escorts 12 — and **nothing ever rides
  exactly four** (`NO_LANES`). The whole set is then turned (`laneBestTurn`: of 24
  candidate turns, the ones within 2% of the most lane length on the phone's screen,
  then the one nearest the wave's usual turn `(5n mod 12) x 30 degrees`) so lanes stay on
  screen as long as possible and waves still come from new directions.
- A lane lights only while it has live enemies, as `alive / sent` for that copy, fading
  in over `LANE_FADE_IN_MS` 2 s; a boss lane is wider (`BOSS_LANE_W` 3.5x) with a halo and
  waits for the inverted sky before it fades in (§5.6). Lanes are quiet when idle; the
  lit layers rebuild at most every `LIT_MIN_MS` 200. Lane numerals (Roman) sit on an even
  ring (`LABEL_R` 430) at each lane's nominal 30-degree slot, 14 px in the rider's colour
  while lit and 11 px when idle; labels never overlap (`placeLabels` steps a colliding one a
  line down in the lower half, up in the upper).

### 2.3 Slots and towers' footprint
- A hex lattice of cells (`CELL_S` 32) with the core as centre hex; only the six
  neighbours (`SLOT_ANGLES`) are built and only **three are open**: `OPEN_SLOTS` -120, 0,
  120 degrees (`cellOpen`). The simulator can open all six for bigger test teams.
  `SLOT_R` 78 from the core (snug, a sliver clear of the core's outer ring).
  `CORNER_SLOTS` is empty: the corner-slot machinery (`unlock`, `CORNER_IN`, `G.opened`)
  is dormant code.
- A tower is a hex of `TOWER_K` 0.85 cells; two towers stay `towerGap()` = 2 x CELL_S x
  TOWER_K + 4 apart; the core blocks a tower only where their outlines would touch
  (`coreKeep`). Building on a lane is allowed (towers and enemies never collide).

### 2.4 The play box (phone first)
- `PHONES` lists the browser page sizes of standard phones (360x640 .. 430x740 CSS px);
  at `PHONE_ZOOM` 0.72 css px per world unit the tightest of them gives the **play box**:
  `VIEW_SIDE` 250 either side of the core, `VIEW_UP` = 1.5 x VIEW_SIDE = 375 above,
  `VIEW_DOWN` ~506 below (`aspira-positioning.js`). **Every screen zooms to fit that box
  to the window** (`resize`, centred on the other axis). It is also the towers'
  **movement cap** (`legalSpot` -> `phoneInside`, `MOVE_EDGE` 12): a desktop player gets no
  more board than a phone player. In 3D the box is the same rectangle on the screen.
- The box's rounded outline appears only as three thin lines on an edge that holds a tower
  back for no reason (a box edge inside this screen, a tower within `PHONE_NEAR` 20).

### 2.5 Shields as segments
An enemy's shield charges and the core's lives each draw as one segment per point: a side
of a ring in the shape's own outline, rings stacked outward, ring r holding `sides x r`
segments (a hex core: 6, 12, 18...). Losing one removes a random remaining segment;
gaining one enters at the innermost slot and pushes the rest out; rings dim outward and
all breathe with the core (`shieldPulse`). A lost core segment flashes red (the boss red,
Hack cyan inverted) for `SEG_FLASH_T` 0.8 s. The core shows up to `LIFE_RINGS` 5 rings.

## 3. Economy and flow

- **Start:** `START_MONEY` 120, **18 lives** (two full rings), interest 2%. Lives come in
  steps of `LIFE_STEP` 6.
- **Waves:** wave 1 is sent by the first tower. After that a wave warps in when
  `WAVE_TIMER` 6.4 s runs out or **the moment the field clears**. The timer **holds while a
  boss or any of its fleet is alive or queued** (`bossUp`, which includes `G.fleetQ`) and
  while Temporal Drive runs. A **boss wave never comes on the timer**, only on a clear
  field. After a boss the next wave also waits for the boss sky to finish closing (§5.6)
  and then for the player's **Challenge** button (below). Counts and money curves read the
  wave as its 10-cycle equivalent (§5.2).
- **Interest:** paid on the credits held at the moment a wave is SENT, `floor(money x
  interest)`, **uncapped**. Base 2%; a boss drop can add +1%. Saving beats spending
  early, and late money is compounding interest — the owner tunes it down repeatedly
  ("97% of a run's money was interest").
- **Kills pay** `bountyBase(w) x type bounty x BOUNTY_MUL 0.7`, with `w` the 10-cycle
  equivalent wave (§5.2): `bountyBase = 2 + 0.35 x min(w, 30) + 0.1 x max(0, w-30)`, x1.1
  early (full to 20, easing to 1 by 30). Type bounties: fast 0.8, swarm 0.36, shield 1.6,
  armor 2, boss 3. Bounties are fractional; money shows rounded down. A kill's credits
  **fly home** as a gold dot (`creditDot`: still for `COIN_HOLD` 3 s, then accelerating
  `COIN_ACC` 25) and are banked when it lands on the core, with a small "+Nc" pop-up
  above the core. Credits read `Nc` with the `c` in the surrounding colour; they shorten
  past 99,999 (`short()`: 123k, 4.0M). An interest payout shows "+Xc (+r%)" in green just
  under the core's rings for `CREDITS_FX_T` 2.5 s, the old total counting up to the new.
- **Tower prices:** `TOWERS[k].cost` 40, **x1.5 per tower standing** (40, 60, 90); the
  slot price is shown inside each free slot. Upgrades are priced as multiples of the
  build price (§4.1). **Sell** returns 95% of what was spent (`sellValue`), on a second
  tap within 2 s.
- **Lives:** a leaked enemy costs its type's `leak` (swarm 2, boss 10, others 1); a boss
  leak sets lives to 0 and names the boss in the game-over title (`BOSS_BREACH`).
  Lives come back from: a boss's drop (+6 lives or +1% interest, half and half by
  `fixedRand(wave, 4)`), and **score**: a life block (+6) at 50,000 score then every
  100,000, **earned any time but paid when the wave's last boss falls** (`G.lifeOwed`,
  owner: "all rewards should come after boss levels"). Score is `round(bounty x 10)` per
  kill and +1000 per life left on a win; it is not shown —
  BEST is the furthest wave.
- **Challenge:** after waves 12, 24 ... 108 (a boss dead, not the last), the next wave
  waits for a "challenge the X" button under the core (X = the next boss), shown 2 s
  after the sky finishes turning back.
- **Speeds:** 1x, 1.5x, 2x, 3x (keys 1-4; +10x for the owner, key 5); 1x is real time.
  The simulation steps in 0.02 s slices. Temporal Drive runs at 1x whatever is chosen.
- **Auto-wait** (on by default): the game slows to 0.5 / 0.25 / 0.125 of the chosen
  speed when a live enemy is within 6 / 2 / 1 game s of reaching the core (`AUTO_WAIT_*`,
  leaving a stage only past 1.25x its line, and a slower speed holds 1.5 s real before it
  may speed up). It only ever slows.
- **Pauses:** a tower's or the core's card, the upgrade chooser and an armed Relay pause
  the game and restore the previous pause on close — **except the build dialog, which
  always unpauses when it closes** (built or cancelled). Tower grabs, drags and coasting
  are frozen while paused and while the boss sky turns (`towersFrozen`). The game does NOT
  pause on focus loss; a hidden tab simply freezes (no animation frames) and the slow logs
  ignore it.

## 4. Towers

### 4.1 Shared rules
- **Four kinds**, each one hit-scan or aura design; display names ARC, FRZ, SOL, ACD (ids
  `arc frz sol acd`; axis ids are the display names except where the card renames them,
  below). Colours: ARC orange, FRZ cyan, SOL pink, ACD chatsubo green. The legacy
  path/form tree (`aspira-upgrades.js`) and the L1-L4 tables in `aspira-defs.js` are
  **dormant**: every kind has a chart (`hasSkills`), so they only matter to old saves.
- **Base stats** (table values; range is multiplied by `RANGE_BONUS` 1.165):

  | | ARC | FRZ | SOL | ACD |
  |---|---|---|---|---|
  | `dmg` | 24 per hit | 15 (tick = 15 x 2.4 x 0.5 = 18) | 73 per beam | 23, x`ACD_BASE_DMG_MUL` 2 = 46/s at x1 |
  | `rate` | 3 / s | tick every 0.5 s | 1.5 / s | 4 ticks / s |
  | range | 115 -> 134 | 88 -> 102 (the aura IS the range) | 260 -> 303 | 88 -> 102 |
  | leash (`MOVE_BASE`) | 200 | 240 | 74 | 280 |
  | default targeting | Near | Fresh | Biggest | Biggest |
  | `GOOD_VS` (build card) | swarms | fast, shields | armor, bosses | shields, bosses |

- **The chart.** Each kind has **three axes of six tiers** (I-V, then the capstone VI);
  `SKILL_TIERS` 6, `SKILL_POINTS` 16 (5 + 5 + 6), `maxLvl` 18. Every point is a tier on
  one axis (`t.skills`), priced by `SKILL_STEP_COST` x the build price 40:
  2.5, 4, 7, 11, 16, 22, 29, 37, 46, 56, 67, 79, 92, 106, 121, 137, 154 (a full chart is
  986.5 build prices, ~39,460c). **The capstone is TWO levels and two ladder steps**
  (owner: "should cost the same as increasing the level by 2"). **One capstone per tower**
  (`axisCap`: V while another axis is at VI, `capstoneHolder`; the card says "One capstone
  per tower · X VI holds it"). `aspira-capstone.js` appends tier VI to EVERY per-tier table
  in one place (`CAPSTONE_NUM`), so no index-6 lookup is undefined.
- **Upgrading.** A tower's card shows its chart as a triangle plus three `[-] pips [+]`
  steppers (§7.4). Several points may be pulled into the **basket** before buying; the
  card previews the result, the button prices the basket and locks it in. A step below
  the locked tier is refused with a note; the bank is no limit to a pull (a basket it
  cannot cover shows its cost red on a disabled button). A card closed without buying
  drops its pulled points.
- **Moving.** Press a tower and drag: it follows the finger at once, firing all the while,
  any time except while placing, with the Relay armed, paused, or during the boss-sky
  turn. It stays inside its **leash**: a circle round its own slot of radius
  `MOVE_BASE x min(slide, SLIDE_MAX 3)`, clear of the core and of other towers and
  **inside the play box** (§2.4); no legal spot = it stays put. The leash and its
  outward-gliding chevrons show for 4 s after a tower is built or its leash grows.
  Released with speed, a tower **coasts** (`aspira-fling.js`: speed decays by e every
  0.35 s, max 1400/s, keeps 60% off a wall) and bounces off its leash, neighbours, the
  core and the box. A tower that cannot stay where it stands glides home. A moved tower
  leaves a faint hex in its colour on its home slot (the selected or held one also shows its
  leash dashed), and a slot another tower has been dragged onto cannot be built on
  (`canPlace`). Two fingers
  move two towers at once. A press picks by the whole drawn shape, a tower's at 1.7x its
  size (`PICK_GROW`; in 3D the screen outline of the prism, `aspira-pick.js`). Slide tiers
  grow the leash (`SKILL_MOVE`); range tiers grow the range.
- **Auto-move** (a checkbox, **only after the game has been beaten**, `best.ascended`):
  the simulator's positioning (`bestSpot`, every 0.5 s) but the tower glides at
  `HUMAN_V` 450 units/s of REAL time (the game speed `speedX()` reads 1 during a Temporal Drive freeze, which plays at 1x - the glide crawled at 1/10 at 10x until 2026-10-14). Arming it takes a second tap, and **any time on it disqualifies
  that game from TOP PLAYERS** ("(DQ)").
- **Targeting** is a slider on the card: **Fresh** (an enemy with no debuff first — slow,
  stun, breach, burn, corrosion, charge... — then nearest the core), **Biggest** (most HP
  left; a boss always counts biggest), **Near** (nearest the CORE, not the tower). Ties go
  to whoever is furthest along the spiral. ARC's jumps, Capacitance bursts' picks and
  SOL's refraction hops use the tower's own mode (`chainPick`).
- **Tower look.** The level shows as the hex's glow and rings (`shownLvl` folds 17
  levels onto 4 looks); a chart tower shows its stat triangle on the board (its corners
  are hex corners, tier 0 a small inner triangle, no tier spokes). An affordable upgrade
  flashes an up-chevron on the hex and one extra outline per upgrade the bank covers
  (up to 6). Labels are three letters.
- **Positioning for the simulator and Auto-move** (`bestSpot`): every `POS_EVERY` 0.5 s a
  tower scores 36 spots (3 rings x 12 angles) on predicted enemy positions 5 s ahead
  (`POS_HORIZON`), weighted by urgency (x1 at entry .. x7 at the core, `POS_URGENCY` 6) and
  its targeting (full mix), hits further ahead counting `exp(-t/1s)`; it moves only for a
  spot 10% better (`POS_SWITCH`).

### 4.2 ARC — chain lightning (the swarm answer)
A hit-scan tree: the strike hits a target, then forks.
- **Conductivity** (all the branching): per attack `s` strikes (separate first targets,
  each its own tree) x `j` jump layers x `f` forks, jump reach x`r`: tier 0 `1/1/2 r1`
  (3 hits), I `1/2/2 r1.2` (7), II `1/2/3 r1.4` (13), III `2/2/3 r1.6`, IV `2/2/3 r1.8`,
  V `3/2/3 r2.0`, VI `4/3/3 r2.4` (each tree 40). From III a jump may return to a struck
  enemy (`v` 1, 2, 3, VI 4 extra hits per enemy). "Hyperstorm" is VI.
- **Voltage** (raw power): damage x `ARC_VOLTAGE_DMG` 1, 3.64, 8.16, 15.55, 26.14, 40.76,
  VI 69.9; each jump keeps `ARC_VOLTAGE_FALL` 0.5, 0.65, 0.8, 1, 1.1, 1.25, VI 1.6 of the
  hit before it (so from IV a jump hits harder than the strike); jump reach x1, 1.15 ..
  1.75, VI 2. **Conductivity and Voltage each also buy range**, x1.02 .. 1.12 (VI 1.15)
  apiece (they multiply).
- **Capacitance**: a hit leaves `n` charges (0, 1, 2, 3, 4, 5, VI 8) worth `frac` 0.14 of the
  hit each (VI 0.2); the next hit on that enemy **from anything** — ARC itself included — or
  its death sets them ALL off, each a burst of radius `ARC_BURST_R` 70 hitting everything
  inside, slowing it `ARC_STAT_SLOW` 0.25 .. 0.45 (VI 0.55) for 0.6 s. Bursts are quiet:
  they neither charge nor set off charges (no chain reaction). Slide x1.3 .. 2.4 (VI 3).
- Mechanics: `ARC_JUMP_BASE` 234 reach, x`ARC_SHRINK` 0.7 per jump, damage per jump x
  `arcFall^depth`; a jump never goes back up its own branch; arcs land a quarter of the
  shot interval after their parent. **Armor grounds the arc**: an arc that strikes an enemy
  with armor above 0 stops there (`ARC_GROUND`) — this is ARC's weakness; Corrosion/Breach
  strip armor to <= 0 and let arcs through again.
- Names: Conductivity Transfer / Conduit / Superconductor / Lattice / Storm / Hyperstorm;
  Voltage Spark / Fry / Vaporize / Arc Flash / Plasma / Gigavolt; Capacitance Static /
  Charge / Overload / Discharge / Tempest / Superstorm.

### 4.3 FRZ — the aura (fast, and armor via Permafrost)
An **aura** (no shots): everything inside the tower's range is slowed (the slow lasts
only while inside, `FRZ_AURA_HOLD`) and takes a quiet tick.
- **Temp** (card name **Sublimation**; id `temp`): aura slow `FRZ_TEMP_SLOW` 0.40, .41 ..
  .45 (VI .55); **tick interval** shortens 0.5, .44, .39, .34, .30, .26 (VI .2) s; **Brittle**:
  an enemy the aura holds takes x`FRZ_BRITTLE` 1, 1.15, 1.3, 1.45, 1.6, 1.75 (VI 2) from
  EVERY tower while slowed (damage credited to the FRZ); aura range x1 .. 1.5 (VI 1.7).
  A tick is quiet but **armor bites it** and it hurts x(1 + `FRZ_CHILL_K` 6 x the enemy's
  slow now) — "the colder, the harder", so fast enemies (slowed twice as hard) take most.
- **Rime** (card name **Permafrost**; id `rime`): every `FRZ_RIME_PERIOD` 1, 1, .85, .7,
  .6, .5 (VI .35) s a ring pulses out to the aura's edge over `FRZ_RIME_GROW` 2.4 game s,
  leaving a **permanent stacking slow** `FRZ_RIME` .02, .035, .06, .085, .11 (VI .15) per pulse (rate doubled, effect and ring opacity halved 2026-10-14: same frost a second)
  and **frost that takes armor** (`FRZ_RIME_CRACK` .25 .. .85, VI 1.2 x the wave's armor
  reference, past zero). At full frost (`FRZ_RIME_FULL` 0.7) the pulse's rime **spreads to
  the nearest enemy not yet full**. Slide x1.33 .. 2.4 (VI 3).
- **Moons**: 1 / 2 / 3 / 3 / 3 (VI 4) moons orbit the tower (circle of 140,
  `MOON_SPIN` 2/3 rad/s) as weaker copies of its aura (`FRZ_MOON_BY` .85 .. .95, VI 1 of
  everything; their slows are separate sources so they multiply); IV gives each moon 1
  small moon, V 3, VI 4 (`FRZ_SUBMOON`: radius 84, aura x0.2, the other way round).
- **Weakness: shields.** A shielded enemy cannot be slowed (no chill, no brittle, and a
  Permafrost pulse does NOTHING to it: no slow, no frost, no pop) — only
  Temporal Drive stops it. A tick on a shielded enemy pops one charge.
- Names: Temp Chill / Freeze / Absolute Zero / Permafrost / Heat Death / Zero Point; Rime
  Frost / Glacier / Cryosphere / Ice Sheet / Glaciation / Ice Age; Moons Moon / Twin Moons
  / Desolation / Satellites / Eclipse / Constellation.
- Card text matches the code (2026-10-14): Temp "makes them brittle" (every slowed enemy;
  shields escape only by not being slowed); Moons claim no armor effect. The Moons armor
  crack, `FRZ_HARD` and the per-type bite tables were removed as dead code (ARCHAEOLOGY.md).

### 4.4 SOL — the focused ray (armor and bosses)
A tower with **locks**: it locks a target in range (a lock may start inside `range`,
holds out to `SOL_HOLD` 2x), charges for the whole reload (`1/rate`), then fires. A target
dying mid-charge restarts the charge; a lost lock hands its charge on only to a new
target inside its Refraction cone, else starts from empty; a full charge re-aims by the
tower's targeting before it fires.
- **Focus**: beams per shot 1, 2, 3, 4, 5, 6 (VI 8), converging on the target, **each a full
  hit** that pops `SOL_SHIELD_POP` 1 .. 6 (VI 8) shield charges (+`SOL_REFRACT_POP` 0,
  1, 1, 2, 2, 3, VI 4 on refraction hops); beam strength `SOL_FOCUS_DMG` 1 .. 1.176 (VI 1.3);
  range x1 .. 2 (VI 2.3).
- **Refraction**: the shot bends on to `SOL_REFRACTION` 1, 3, 6, 10, 13 more enemies, **V
  every enemy ahead** and then out of sight (`solOutOfSight`), VI two opposite cones. The
  cone starts at the FIRST enemy struck, points where it holds the most enemies, half-angle
  `SOL_CONE_BY` 8, 24, 24, 32, 32, 32 (VI 40) degrees; every hop goes FORWARD (further
  from the first enemy than the last hit). Hops hit x`SOL_REFRACTION_DMG` 1, 1, 1.3, 1.84,
  2.43, 3 (VI 4); range x1 .. 1.55 (VI 1.7).
- **Breach** (SOL's own): every hit strips armor **for good, below zero too** (a flat bonus
  on every later hit from every tower): `SOL_BREACH_ARMOR` 80, 200, 350, 550, 800, 1100
  (VI 1500) a hit; crit multiplier `SOL_CRITMUL` 3, 4, 5, 7, 8, 9 (VI 12) at the base 10%
  crit chance. A breached enemy's death **fires shrapnel** (up to 8 pieces within 90, each
  the armor it lost, credited to the SOL). Slide x1.3 .. 2.4 (VI 3).
- Names: Focus Convergence / Crux / Disintegration / Lance / Supernova / Solar Flare;
  Refraction Lens / Prism / Spectrum / Halo / Aurora / Corona; Breach Pierce / Sear /
  Flare / Brand / Sunfire / Starfire.
- **Weakness: swarms** (one lock). Strength: armor and bosses. SOL's hits are cut by armor
  like any other (it ignored armor until 2026-10-07; its damage rose x1.3 when that ended).

### 4.5 ACD — acid jets and pools (shields and bosses)
Continuous **jets** on enemies whose burn **ramps exponentially while held**: doubles
every `ACD_DOUBLE[0]` 0.5 s up to x`ACD_BASE_MAX` 32, in 4 ticks/s, each a real hit
(armor cuts it, a shield eats `ACD_SHIELD_POP` 1 charge). A jet resets when its enemy
dies or leaves range (no carry at the base); jets never share an enemy. **Pools from the
start:** each jet drips a pool every `every` s that burns at `ACD_PUDDLE_HEAT` of the jet's
dps when it fell (ramp capped x`ACD_PUDDLE_CAP` 8).
- **Corrosion**: each tick strips `ACD_CORRODE` 0, .1, .2, .3, .45, .6 (VI .9) of its own damage
  from armor **below zero without limit** (jets only, not pools). **The goo:** every armor
  point eaten drips (real armor counts x`DRIP_REAL` 3) as drops of `DRIP_UNIT` 0.3 x the
  wave's armor reference; a drop is flung back up the lane (~80-320 units), lies
  `DRIP_LIFE` 40 s, **homes on the nearest other enemy within `ACD_DRIP_PULL`** 50, 65, 80, 100,
  120 (VI 150) and on pickup strips `DRIP_TAKE` 2x its value from that enemy and burns it
  for the same, credited to the ACD. Max `DRIP_MAX` 1000 drops.
- **Flow** (card name for id `spray`): jets `ACD_LINES` 2, 3, 4, 6, 7, 8 (VI 11); a jet
  keeps `ACD_FLOW_CARRY` 0, .3, .5, .7, .9, .9 of its ramp when its enemy dies **or
  escapes** (the fast answer) and slows what it burns `ACD_FLOW_SLOW` 0, .05 .. .17 (VI .2,
  doubled on fast); range x1 .. 1.3 (VI 1.5).
- **Contagion**: pools `{every, life, r}` 1.2 s/6 s/55 (tier 0), 1.2/9/62, 1.18/12/70,
  1.18/16/80, 1.18/20/92, 1.18/25/105, VI **1/40/150**; heat .10, .11 .. .15 (VI .20). From I
  **an enemy killed in a pool leaves a pool** (0.8 r, 0.5 life, at most 240 a tower).
  Slide x1.15 .. 1.8 (VI 2.1).
- Names: Corrosion Etch / Corrode / Dissolve / Erode / Annihilate / Oblivion; Flow Mist /
  Downpour / Torrent / Deluge / Cascade / Monsoon; Contagion Blister / Plague / Pandemic /
  Epidemic / Blight / Extinction.
- **Weakness: fast and shields** (a bare ACD is "a tank killer": cold jets on each new
  enemy, a charge popped per tick). Flow buys the fast back, Contagion the shields.

### 4.6 The counter matrix (design intent)
Each enemy type has a main counter and two helpers: **swarm** — ARC main, FRZ + ACD help,
SOL weak (one lock); **fast** — FRZ main, ARC + SOL help, ACD weak (cold jets);
**armor** — SOL main, ACD + FRZ help, ARC weak (armor grounds arcs); **shield** — ACD main,
ARC + SOL help, FRZ weak (shield holds off slows). Its levers are the mechanics above:
FRZ's chill bite, shield pops per hit (ACD 1/tick, SOL by Focus tier), armor that scales
with HP, the ARC ground rule, negative armor as a flat bonus. `scripts/aspira-sim/
countermx.mjs` measures it (N towers of one kind against one forced enemy type).

### 4.7 The core and its two powers
The core is **free**: no price, no tiers to buy. Bosses hand its powers out **outright, at
full strength** (`CORE_GRANTS`): **Temporal Drive** when the 2nd boss falls (wave 24) and the
**Orbital Relay** when the 4th falls (wave 48), the button flashing when the next wave
starts. (The pick flow — `CORE_PICKS`, `pickPower` — is dormant code.) Both are buttons
above the title (`aspira-powers.js`) showing a recharge bar and the **cooldown in waves
sent** (`tickPowerCooldowns`).
- **Temporal Drive** — hold the core 400 ms (or tap the button): every enemy on the board
  stops dead (a 100% slow, source `core:time`) for **6 game s**, cooldown **3 waves**
  (`TEMPORAL[3]`). Rings pulse out for the look (`TEMPORAL_R` 560). It **holds the wave
  clock and spawns**, **cannot be used on an empty board and ends when the board empties**,
  and does not stop Strength (a boss rule). The core slams into the floor in 3D as the
  first ring leaves.
- **Orbital Relay** — tap the button then a tower, or drag the core onto a tower: that tower
  acts as three (`RELAY_MUL` 3) for **11.25 s**, cooldown **4 waves**, and **stays on that
  tower**: ARC fires its attack 3x, SOL has 3x locks, ACD 3x jets (so pools), FRZ 3x moons
  and 3x tick (a plain FRZ 3x tethers). An armed Relay pauses the game and flashes a ring
  on every tower.

### 4.8 Dormant code (kept on purpose, nothing reaches it)
The path/form tree (`aspira-upgrades.js`, `LVL_*` tables, `STEP_COST`, the `UPGRADES`
chooser branch); the corner slots (`CORNER_SLOTS`, `G.opened`, `drawSlotFlash`); the
core's pick flow (`CORE_PICKS`, `grantPick`, `pickPower`); the old power bar (`POWERS`
SCR/RNG/MNY/DAM/FRZ/BOM, `usePower`, `G.charge`); the Kepler moon orbit (`MOON_ECC` 0 = a
circle); `BOSS_ARMOR` / `BOSS_SPEED` / `BOSS_SHIELD*` tables (all neutral except Justice's
speed 0.75). The simulator still builds on some of it (`UPGRADES` in `sim.mjs`).

## 5. Enemies and waves

### 5.1 Types (dice)
Each enemy is its die seen from above (3D: a real solid): **fast d4** (triangle), **swarm
d6** (hexagon), **shield d8** (diamond), **armor d10** (ten corners, five pulled in to
0.78), **boss d20** (decagon with a pentagon). Table values (before the global
multipliers `ENEMY_HP_MUL` 0.225 on HP and `BOUNTY_MUL` 0.7 on bounty):

| | speed (x76 `ENEMY_BASE_SPEED`) | hp | bounty | special |
|---|---|---|---|---|
| swarm | x1.1 | 0.112 x1.15 | 0.36 | leaks 2; wander; HP and size jittered 50-300% of average; speed x0.5-1.5, its own roll (not tied to size) |
| shield | x0.933 | 0.6 | 1.6 | 4 base charges, scale with the wave |
| armor | x0.7 | 1.25 | 1 (was 2; x2 bodies, 2026-10-14) | armor 15 x`ENEMY_HP_MUL` base, scales with HP (`armorGrow`) |
| fast | x1.5 x1.037 x1.1 | 0.65 | 0.8 | trails a long tracer |
| boss | x1.0 | 3.5 | 3 | leaks 10 = game over |

Enemy speed is then x`ENEMY_SPEED` 1.125 x per-body jitter x the speed curves below. A
**shield** takes one charge per hit whatever its size and **holds off every slow**
(Temporal Drive aside); **armor** is a flat bite off every hit (never below 10% of it;
negative armor adds to the hit); an enemy shrinks with its HP (to 5%, a boss to 10%) and
grows with log HP (`SIZE_LOG` 0.25). Dead enemies become invisible **ghosts** that keep
drifting so beams can follow them, and are removed at the core with no life lost.

### 5.2 Scaling (the curves)
Many curves read a wave as its **10-cycle equivalent** `eqWave(n) = n x 10/12` (the boss
cycle was 10 waves and the curves were tuned on it).
- **HP:** `enemyHp = (9 x hpPow(w) + 2w) x type hp x 2 x [plain HP factors]`; `hpPow` =
  `HP_GROWTH`^(min(w,20)-1) x `HP_LATE`^(max(0, min(w,80)-20)) x `HP_END`^(max(0, w-80))
  with `HP_GROWTH` = `HP_LATE` = 1.13 and `HP_END` 1.07 (knees `HP_KNEE` 20,
  `HP_END_KNEE` 80, in equivalent waves: real waves 24 and 96). The endgame eases because
  towers are fully built by about wave 80.
- **Plain (non-boss) HP factors:** x1.0 to wave 12, x1.2 to wave 24 (the first power), x1.5
  after (`plainHpMul`); then `plainHpGrow`: /`speedGrow^0.75`, a **mid-game hump** of up to
  +50% on waves 48-72, eased in from 24 and out to 96 (`MID_HP`). Early shields x0.6
  HP and early armor x2 HP, both easing to x1 by (eq) wave 30; swarm waves x1.5 total HP.
- **Speed curve:** non-boss enemies x`speedGrow` = 1 + 0.5 x smoothstep over waves 12..84,
  +0.01 a wave after 84; every enemy x`speedRamp` (+0.2% a wave past 49).
- **Shields:** `shieldsOf`: a base of 4 charges following the steep curve `(1.15^(n-1) +
  4n/18)` to the power `SHIELD_EXP` 0.29, with HP compensating the charges taken away.
  **Armor** follows `armorGrow`: the HP curve to the power `ARMOR_EXP` 0.4 up to wave 49
  (`ARMOR_HP_FROM`), then HP growth to the power `ARMOR_HP_EXP` 0.9.
- **Late traits** (from wave `LATE_FROM` 49): swarms bring x(1.3 + .006/wave) the bodies, fast
  run x(1.15 + .004/wave) faster. **Hybrids** from wave 97: swarms carry 10% of a shield
  unit's charges, fast carry 10% of an armor unit's armor (their outline wears that
  type's colour).
- **Counts:** a plain wave's base is `10 + floor(0.5 x eqWave)`, swarm x6, all /2, then x
  `WAVE_COUNT_MUL` (waves 1-11 hand-tuned so one L1 tower can clear them: 2 x.5, 1 x.75,
  3 x.67, 4 x.75, 6 x.67, 7 x.75, 10 and 11 x.5) x `TYPE_COUNT_MUL` (swarm 0.1625 x0.8 — 2026-10-14, "easier for humans", no HP back — shield
  .99, armor 1.07 x2 — 2026-10-14, twice the bodies at half the bounty (1, was 2) — fast 2, all x0.9);
  a swarm WAVE is never under `SWARM_WAVE_MIN` 12 bodies, applied after the lane rounding
  (`wavePlan`; boss fleets keep their own counts); swarms x2 from (eq) wave 11 (`SWARM_X2_FROM`) and a
  further x2 over (eq) waves 11-60, x1.5 after (`swarmMul`), x the late swarm trait; fast
  x0.65 past (eq) wave 80. Counts are rounded to whole formations (§5.4). (`WAVE_COUNT_MUL`
  keys are real waves; the rest read the equivalent wave.)
- **Order:** types unlock in the fixed order swarm (wave 1), shield (2), armor (3), fast (4);
  from wave 5 a type picked by hash, never the same as the wave before (a boss does not
  break the alternation).

### 5.3 Spawning
Each lane copy's list spawns in order: a swarm body every `0.024 / ENEMY_SPEED` s, other
types every 0.8 s, fast pairs `FAST_PAIR` apart at their speed, formations all at once.
A boss arrives `BOSS_INTRO` 2 s into its wave (its voice line plays). The wave list's
"upcoming waves" shows exactly what is coming (waves are fixed).

### 5.4 Formations
A formation is a sideways offset (`e.lat`) and a head start (`e.ahead`) laid across the lane
at its heading each step, fading to nothing inside `FORM_FADE_R` 160 of the core.
- **Fast:** side-by-side pairs `FAST_PAIR` 26 across, each pair 26 behind the one before,
  **spinning flat about their midpoint** (one radian per `FORM_SPIN` 160 units).
- **Shield:** Vs of `V_N` 5 (a leader, pairs fanned back `V_BACK` 28 and out `V_LAT` 24),
  then a V of 3, then single ones; counts round up to fill lanes.
- **Armor:** one tight square lattice `ARMOR_W` 3 abreast, rows `ARMOR_PITCH` 36 apart; a
  short last row sits centred at the back. Armor always splits in whole rows over 2 lanes.
- **Swarm:** no formation; the wander (`e.jit` 18-63 across the lane, fading squared inside
  `JIT_FADE_R` 400 of the core so it funnels in).

### 5.5 Bosses
Waves 12, 24 ... 120: **Star, Empress, Strength, Chariot, Lovers, Temperance, Devil, Justice,
Judgement, Death** (`ARCANA`; each has a haiku shown above the title). A boss wave is the
boss alone plus its fleet; every boss has a little shield (0.5 of a shield enemy's charges
at its wave), armor 0, its size a step bigger than the last (x1.1 .. x2). HP =
`enemies.bonus.hp` x `BOSS_HP` x `BOSS_HP_K` 1.4 (not the Star) x `BOSS_FAR` x
`BOSS_LANE_HP` 1.107; `BOSS_HP`: star 32, empress 6.8, strength 2.2, chariot 3.4, lovers 2.4,
temperance 1.22, devil 0.76 (each of six), justice 6.4, judgement 3.4, death 3.2; `BOSS_FAR`
(bosses that stayed far out): empress 3.5, strength 3.5, death 2.8. Tricks:
- **Star** none (needs two towers or an upgrade); **Empress** sheds `EMPRESS_BROOD` 12
  swarmers each time she loses a fifth of her HP; **Strength** no slow touches her (Temporal
  Drive included); **Chariot** sprints x3 for 1 s every 4 s (her fleet with her); **Lovers**
  a pair on two opposite lanes — kill one and the other heals to full and runs x1.5;
  **Temperance** regenerates 6% of her HP a second; **Devil** six full bosses on six lane
  copies, the reward paid once by the last; **Justice** no hit takes more than 2% of her HP,
  and she is slowed (speed x0.75); **Judgement** rises once at 50% HP, her escort swarm
  spreads over 12 lanes; **Death** has no trick (a juiced-up Star).
- **Fleets:** each boss brings ONE plain wave's worth (`FLEET_MUL`; the Star 3, Justice .75)
  of its escorts — Star fast, Empress shield, Strength armor, Chariot fast, Lovers swarm,
  Temperance shield, Devil swarm, Justice armor, Judgement swarm, Death all four — at plain
  HP and bounty, flying in formation round the boss at its pace with `FLEET_GAP` 10 clear
  (shields in layers of Vs five wide, armor in a lattice with the boss at its centre; fast
  and swarms on 3 or 5 parallel tracks; the Star's pack follows behind and tight). **20% of
  every escort's HP moves onto its boss** (`FLEET_TO_BOSS`, not Temperance). The fleet enters
  one unit at a time at the lane's mouth (`G.fleetQ`), and the sky holds until all of it dies.
- **Rewards:** +6 lives or +1% interest; the pending score lives; at waves 24 / 48 the
  core's powers. The game ends on a boss reaching the core.

### 5.6 The boss sky
When a boss warps in, a colour **inversion** spreads from the core over `BOSS_INV_T` 3 s and
collapses back the same way after the last boss-kin dies; the game **holds still while it
turns** (both ways). The title becomes the boss's name; the boss's HP is a long line along
the horizon through the core (`drawBossBar`, `BOSS_BAR_R` 400 each way), and the boss lanes
fade in once the sky is full. The next wave waits for the sky to close. The inversion costs
nothing per pixel: a full sky is the frame drawn in the inverted palette (`withPalette`) in
2D and one blended triangle in GL in 3D (`warpFlip`); only the spreading circle is flipped
by a fill (`skyFlip`). **Towers keep their own colours** under it.

## 6. Damage model, statuses, targeting
`damage(e, amt, tower, quiet, crit, st)` runs, in order: (1) a charge on `e` is set off by
this hit (ARC Capacitance); (2) a **shield** takes the whole hit and pops `st.shieldPop`
charges (quiet hits bounce off) — nothing else applies; (3) bleed crit (inert now: Breach
gives no crit chance); (4) damage-taken
**marks** (x`shredMul`); (5) **Brittle** x while slowed; (6) **armor**: the hit minus
`trunc(armor - frost)` but never below 10% of the hit; **negative armor adds** to the hit;
this applies to EVERY hit, quiet ones too; a boss's armor goes no lower than minus its
wave's armor reference; (7) `bossHitCap` (Justice); (8) the hit is floored to a **whole
number, at least 1 if it landed**. Credit for the part a debuff added goes to the tower that
caused the debuff (`damageCredit`: Brittle -> the FRZ, stripped armor -> the Breach/
Corrosion/Rime sources).
- **Whole numbers everywhere:** HP, armor and every hit are integers rounded down. Card
  numbers are real values rounded down (`dmgUnits`); hit flashes and beam widths scale by
  `VIS_DMG` 2 so they look as they did before the damage scale was halved.
- **Slows:** held PER SOURCE with a shape — `refresh` (times out, a re-hit resets), `once`
  (permanent, a re-hit does nothing), `stack` (every hit adds a permanent stack). Different
  sources combine **multiplicatively** (two 30% slows leave 49%), then the total is
  **shaped**: linear to `SLOW_KNEE` 0.4, easing toward `SLOW_CAP` 0.7 without reaching it. A
  tower slow alone is capped at `TOWER_SLOW_MAX` 0.95 before shaping. **Fast enemies take
  every slow double** (`FAST_SLOW_MUL`), shaped toward `fastSlowCap()` so a fully slowed
  fast enemy is no slower than any other. Only Temporal Drive (`core:`) is a full stop.
  Shields block all slows; Strength shrugs all of them.
- **Armor reductions are permanent** and may go negative (Breach, Corrosion, goo, Rime
  frost while it lasts).
- **Quiet** hits (ticks, pools, splash) show no flash; ACD pool hits past `POOL_LOD` 24
  pools show one summed number an enemy per 0.5 s.
- Crits are marigold (`orange`) numbers; damage numbers are sized by the hit before armor, grey in
  proportion to the armor's share, and a shield-soaked "0" is the size of the hit it
  swallowed, in cyan. A number holds whole for `DMG_HOLD` 0.1 s, then shrinks and fades together, flying
  away from the tower that dealt it at `DMG_FLY` 90 units/s.

## 7. Interface and controls

### 7.1 Layout (phone first, 430x932)
- The page is full screen with **no nav bar, no CRT stack** (`show_nav=False`, `crt=False`
  in the parent), the canvas filling it and the board fitted to the play box (§2.4).
  Nothing bumps the board: it refits only when the canvas itself resizes.
- Top: a home button (the site favicon, to `/`) and a stats row — LIVES, INTEREST, WAVE, BEST
  (furthest wave), V (the version: tap = the changelog card), FPS — then a row with
  auto-wait, auto-move (ascendants only) and the quality slider. Top-right: mute over a
  vertical volume slider (0-2, boosted x2).
- Bottom: a speed bar (pause + speeds, the pause button flashing while paused by the
  button; a tap on the bar's EMPTY part, right of the buttons on a wide screen, closes the
  open chooser or tower card); above it bottom-left the "upcoming waves" list; centred, the boss's haiku, the
  core-power buttons and the title. Under 700 px the wave list drops numbers and names to
  icons plus the countdown. Cards sit at `--z-bubble`, above the bar, the wave list and the
  spend bar, and **never scroll** (`fitPop` shrinks the chart to a floor `CHART_MIN` 140,
  then `CHART_FLOOR` 80 against the window). One **spend bar** — credits above the open
  cards, `(-Xc)` in red, one cancel/close below — is the same spot on every screen that
  spends. The tower card's own close is a square **X right of the upgrade button**, on its
  line (`#asp-upbox` never wraps): with points pulled it drops them, else it closes. Wide screens (landscape, >= 700 px) put the tower card's description and control
  side by side.
- Never put an Exec bubble, a modal or an inset on the board: pages lay out as if no
  overlay exists.
- **While the upgrade/build chooser is open the game is paused AND the board stops
  redrawing** (`frame` skips `render` when `chooser.t`), so the CSS blur and darken on the
  canvas (`#asp.asp-choosing`) costs nothing per frame. The tower's and the core's cards sit
  centred above the bottom bar and lift clear of the wave list and title (`cardLift`).

### 7.2 Building, selecting, dragging
Tap an empty open slot: four tower cards (name, price, "good vs", flavour line; keys 1-4)
and a cancel; too poor = the card shakes and stays up. Tap a tower (or its home slot):
its card. A tap on the core: its card. A press that moves under `DRAG_PX` 6 is a tap; a
press on a tower and a drag is a move (§4.1). An unaffordable slot or button stays tappable
but dimmed (`.poor`): a tap shakes it and says "need Nc more" (and a placement the credits
cannot cover floats "need Nc"; a blocked one "blocked"). Before the first tower, the free slots flash
and a white triangle bobs over the top-left one.

### 7.3 Keys
1-4 speeds (5 = 10x, owner), Space pause, M mute, U lock in the upgrade basket, Esc cancel;
with a chooser open 1-4 pick a card. No build shortcuts (by choice).

### 7.4 The tower card
- **Description:** ONE prose per tower composed from its chart (`aspira-desc.js`
  `DESCRIBE`): one template where each axis swaps a few words. **Only behaviour is told**
  ("a tier that just moves a number changes no words"). Pulled points show as **track
  changes** (`wordDiff`: removed words struck red, added underlined green). Thematic words
  where they fit (acid: "jets", "pools", never heat). `docs/spire-descriptions.md` is the
  generated graph of every chain (`scripts/aspira-desc-graph.mjs`) — rebuild it after
  editing a sentence or a number.
- **Control:** three `[-] pips [+]` steppers (axis full name and tier above, `0->II` while
  pulled; pips filled = locked, half = pulled, hollow = to buy, the sixth orange and red
  once another axis holds the capstone) and the chart beside them; the + flashes while the
  bank covers a point. A confirm button priced `Arc VI (-440c)` (one line, the cost in the
  spend bar's red; bold and its own colour when affordable) locks in, pulsing while a basket
  waits; sell sits smaller
  under it (two taps); the targeting slider is small; stacked (phone) the "Targeting
  priority" caption is hidden.
- **Stats:** two columns — the rows that matter for the kind left and bigger (`KEY_STATS`),
  the rest right and small — each `now -> next`, worse in red (`worse`, with
  `LOWER_BETTER`), rows a tower does not have yet left out; kills and damage dealt live.
- Tiers have no names on the card; the full axis names sit by the steppers, the short ones
  (first four letters) at the chart's corners.

### 7.5 Wave list and HUD details
Ten rows: every wave still alive plus upcoming ones (at least 3), one icon per enemy sized
by log HP (`WAVE_ICON` 5-18 px), long rows tessellating into 2-3 rows, all rows
`WAVE_ROW_H` 22 x `WAVE_SPAN` 110 (95 on phones); live waves sit in one rounded green box;
the headings read "warped in" / "warping in..." and the next wave's countdown ("5s") rides
the second heading, hidden while a boss holds the timer or is next. A **threat mark** (circle and two
triangles on the enemy) shows on the three closest enemies within 4 s of the core, and a
leak's ring bounces out from the core (showing the lives left in pink).

### 7.6 End screens
Game over (a loss) and the win share one overlay: the title (`ascendant` for a win, else
the breaching boss's phrase or `core breached`), the furthest wave, a line per tower ranked
by damage dealt (kills, damage, share, named by its build — the tier names of its two
strongest axes — in its own colour; `aspira-endstats.js`), above it a scrolling line per
wave that TOOK lives (what it was and how many, from `G.planLog`/`G.leaks`, counted by the
wave the enemy came from), "Play again", and below that TOP PLAYERS (§9.1): the entry form
on a win or a loss past wave 10, else the board alone.

## 8. Rendering, audio and performance

### 8.1 Views and quality
Quality is a three-stop slider (`spire.quality`): **low / high / 3D** (**3D is the default**).
- **High** is the 2D picture. **Low** draws at `LOW_RES` 0.5 device px per css px, mutes
  `shadowBlur` on the context prototype, and skips decoration at its draw sites (`lowQ`:
  damage numbers, hits, sparks, cones, flashes, gradient discs, stars, lane glow, faint
  ranges, puddle bubbles; the boss sky snaps). A new pure-decoration draw site should check
  `lowQ`.
- **3D** (`aspira-warp.js` and its helpers) lays the same game out as a **flat board seen
  from a perspective camera** — `WARP.tilt` 0.55 rad (32 degrees off straight down), `fov`
  0.9, `depth` 0 — drawn on a WebGL canvas `#asp-gl`; the 2D canvas still takes every
  pointer event (opacity 0 under it). Towers and the core are **hexagonal prisms** (a tower's
  height `18 + 12 x (level-1)` world units, the core's the sum of the tower heights / 6 plus
  the tallest; empty slots dotted prisms), enemies are **real dice** (`aspira-solids.js`,
  rolling about their axis of travel, nose forward, centred on the floor, fainter with
  distance), shields are lines on the floor, pop-up text is flat with no perspective. All
  geometry **below the floor fades** over 30 world units (`aspira-fog.js`, 8 slices);
  towers and core fade down their own height. The light comes from the core. Taps map back
  through `unwarp`; leash rings are dashed in screen pixels.
- A slow machine **steps down automatically** while the player has not picked a quality
  (3D -> high -> low when frames average over 34 ms for 3 s; a pick on the slider pins it).
  Separately the 3D **far-detail radius** shrinks from 1600 to 600 units (no tracers,
  flashes or numbers farther out; swarmers flat) while frames average over 28 ms. **Never
  lower resolution or reallocate the big canvases during play** (§11).

### 8.2 The 3D pipeline (what the performance budget forced)
Two layers: the **board** (background, graticule, lanes) is redrawn and uploaded at most
every `WARP_STAT_MS` 150; what **moves** (beams, shots, ranges, coins, goo, threats) is
drawn every frame on a layer `WARP_DYN_K` 0.5 of the picture's size a side, and the shader
lays it over the board. Hits, sparks, flashes and plain rings are gathered as GPU
instances and drawn as one batch (`aspira-fxgl.js`); `aspira-glctx.js` is a 2D-context
stand-in that turns circles, gradient discs and straight strokes into those instances. The
picture is a square `WARP_TEX_R` 860 world units from the core, at most `WARP_TEX_MAX` 2048
px, drawn at `WARP_RES` 0.75 of the 2D canvas, density capped at `RES_CAP` 2 (`canvasDpr()`
is the only way to read the density). Text is drawn once and stamped (`aspira-textcache.js`,
a 6M px ~24 MB budget, least-recently-used out, evicted canvases zeroed so iOS frees them).
Live caps: `DMG_MAX` 120 damage numbers, `SPARK_MAX` 300, 240 pools a tower, 1000 goo drops.

### 8.3 Other visuals
2D draw order (`drawSceneBase` / `drawSceneTop`): background, damage numbers (under
everything), the board (graticule, rim, lanes), tower ranges, stars (over lanes and range
fills, which would tint them), tethers / acid / aims / shots, the core's struts and beams,
leash rings and the play-box lines, towers (and the Relay's arm rings), slot flash / goo /
coins / up-chevrons / threat marks, the placement ghost, the core and its credits, then the
ENEMIES (over the towers and the core), the core HUD, pop-up text, the banner. In 3D the
towers, core, enemies, shields and text are drawn flat on layers over the floor
(`warpEntities`) and only the board, ranges, beams and effects ride the picture.
Enemy tracers (star 320, fast 120, shield/armor 80, swarm none) taper along the lane's
curve; beams last 2x their asked life at 2x brightness, their width log of the hit
(`BEAM_MIN` 0.4 + 1.6/decade, max 10); the screen shakes 14 px over 0.35 s when the core
is hit (re-armed, not stacked) with a shutdown sound; Temporal Drive's rings are octagons
on the floor with no `shadowBlur`.

### 8.4 Audio
All sound is synthesised WebAudio through a limiter (`aspira-sfx.js`), created on the
first gesture, 24 voices, per-sound minimum gaps, **at most 3 copies of a tower's sound at
once**. Tower shots play at 0.6, bosses/upgrades/builds at 2, kills at 0.4; sounds keep
their density at any game speed. The player can mute (`aspira.mute`) and set volume
(`aspira.vol`, 0-2). Optional **Brood War samples** from Wai's own install live only in
`api/data/aspira-sfx/` (gitignored — the repo is public — mapped by its `index.json`,
served to the guest tier by `/aspira-sfx/{file}`, `is_relative_to`-guarded); they replace
the synth sound of the same name, and `LEGACY_SFX` maps old names. Each boss has its own
voice line (`bossvoice.<arcana>`).

## 9. Meta: leaderboard, slow logs, saves, version

### 9.1 TOP PLAYERS (`spire_board.py`, `/api/spire/ascendants`)
- A **win** may post three letters (`[A-Z]{3}`), lives left, the team's kinds and the wave
  (120); a **loss from wave 11 on** may post too (lives 0). Server shape checks: initials,
  `1 <= lives <= 100000` for a win, a wave 11..1000, a team of 1-5 real kinds. The
  Ascendants (wins, gold rows) rank first by lives left, then everyone else (green) by wave
  reached then lives, ties to the earlier. The board shows 10 rows and scrolls; `SHOW_MAX`
  500 are returned. Rows render with `textContent`.
- **Honour system by decision:** the only guards are the shape and `ASC_MAX` 6 posts per IP
  per hour (in memory; skipped for the test suite's exemption). A game that used **auto-move**
  is barred client-side (the board shows, the form does not) — honour again.
- **Never lose an entry.** An append-only fsynced journal `data/spire_ascendants.jsonl` is
  written FIRST, then the board `data/spire_ascendants.json` (newest first) is rewritten
  atomically from journal + old board merged; a missing or corrupt board is REBUILT from
  the journal, never overwritten; a torn journal tail cannot swallow the next line;
  nothing is trimmed. `python spire_board.py mark-owner|hide ...` (run in the container)
  names games as the owner's or hides them everywhere without touching the journal.
- **The owner's own games** from before 2026-10-14 00:00 ET (`OWNER_SHOWN_FROM`) are hidden
  from guests (the `owner` flag on posts from her full session, plus the marks in
  `spire_ascendants_owner.json` for older ones); her games from that moment on show to
  everyone. `hide` removes games for everyone.

### 9.2 Slow logs (`spire_perflog.py`, `aspira-perflog.js`)
Every 180 s of unpaused play a session posts a frame-time and audio summary (buckets
<16.7/33/50/100 ms, worst frames, sim / draw / 3D / GL / entity splits, GPU name, quality,
auto-step count, canvas pixel counts, text-stamp memory, audio state, version+build).
`POST /api/spire/perflog` (guest, 30 per IP per hour, 16 KB); `GET` is owner-only (the
newest `n`). Files go to `data/spire-perflog/` (**survives deploys**, capped at 400, oldest
dropped). Failures are swallowed; it must never be in the game's way.

### 9.3 Saves
- Browser: `aspira.best` `{score, wave, ascended}`, `spire.quality`, `spire.qpick` (a slider
  pick), `spire.autowait`, `spire.automove`, `aspira.mute`, `aspira.vol`.
- **Autosave** (`aspira-autosave.js`): the whole `G` is put in IndexedDB (`spire` / `run`)
  as each wave starts, cleared when a game ends; on load a card offers **resume wave N** or
  **new game** (a resumed run may still sign TOP PLAYERS). Any private window or full disk
  just means no save. Everything in `G` must be structured-cloneable.
- No other server state. There are no accounts.

### 9.4 Version and changelog
`web/aspira-version.txt` is hand-kept `major.minor.tiny` (a new day in the changelog = the
next minor; every deploy bumps tiny). `spire_build()` is the newest `aspira*` mtime as
`MMDD.HHMM`; both are substituted into the template and sent with every slow log. The
changelog card (`aspira-changelog.js`, opened by tapping the version, pauses the game)
lists each day's player-visible changes as facts only, in two groups (Balance, Perf/UI) —
add a line with every change a player would notice.

## 10. Tech

### 10.1 Files and load order (the template's `<script>` order; same global scope)
`defs` (geometry, tables, `towerStats`) -> `sfx` -> `upgrades` (dormant tree) -> `game`
(state `G`, combat, damage, slows) -> `formations` -> `floats` (damage numbers, coins) ->
`waves` -> `bosses` -> `positioning` (also the play box) -> `towers` (ARC, SOL, moons,
leash) -> `acid` -> `skills` (the three charts and ARC) -> `frz` -> `desc` -> `capstone`
(tier VI appended to every table) -> `chart` -> `stats` -> `sliders` (tower card) -> `core`
-> `core-fx` -> `powers` -> `endstats` -> `ascend` -> `quality` (just before draw: `lowQ`) ->
`threat` -> `draw` -> `textcache` -> `effects` -> `enemies` -> `lanes` -> `camera` ->
`fling` -> `fog` -> `warp` -> `warplayers` -> `fxgl` -> `glctx` -> `pick` -> `solids` ->
`walls` -> `chooser` -> `wavelist` -> `ui` (HUD, input, the frame loop) -> `perflog` ->
`changelog` -> `autosave`. Stylesheets: `aspira.css` (the page, the chart, cards),
`aspira-endstats.css`, `aspira-ascend.css`, `aspira-changelog.css`. Files are capped at 500
lines (exec-fn's pre-commit), which is why logic is split by seam (e.g. `acid`, `frz`,
`floats`, `wavelist`, `chooser`, `warplayers`).
- **Colours never live in JS.** The template carries hidden `.asp-sw` swatches styled from
  exec-fn's `chrome.css` tokens; `resolveColors()` reads their computed colour once into
  `COL`. A new colour or alpha is exec-fn's palette lint's call. Fonts come from the same
  tokens.
- Python: `api/routes_aspira.py` (page, redirect, sfx, ascendants, perflog),
  `api/spire_board.py`, `api/spire_perflog.py` (stdlib-only), `api/templates/aspira.html`.

### 10.2 exec-fn integration
A git **submodule** at `apps/spire` mirroring exec-fn's layout (exec-fn ARCHITECTURE.md
§1e): `api/*.py` on exec-fn's `sys.path`, `api/templates/` via `pages._tmpl`, `web/aspira-*`
served flat at `/` (`/aspira-game.js`), tests collected by exec-fn's pytest, runtime data
in exec-fn's `api/data/`. Routes: `GET /spire` (**guest tier**, Turnstile), `GET /aspira`
(**public 301** to `/spire`), `/aspira-sfx/{file}`, `/api/spire/ascendants` GET+POST (guest),
`/api/spire/perflog` POST (guest) and GET (owner). The page is rendered with
`full_height=True, show_nav=False, crt=False`, `data-owner` set for the full session (it
adds the 10x speed). The guest page set lives in three places in the parent
(`_GUEST_NEXT_ALLOWED`, the 401 handler's guest prefixes, the router tier); `/spire` is in
all three. Commit INSIDE this repo; exec-fn's hook pushes it and bumps the pointer. The
lint/hooks are exec-fn's (the shim `scripts/pre-commit` here).

### 10.3 Tests and the smoke
- `tests/test_spire_board.py`, `test_spire_perflog.py` (stdlib units) and
  `test_spire_sliders_browser.py` (WebKit; needs exec-fn's fixtures; pins the stepper rules
  and the card grids at 1280x800 and 430x932 — its docstring still speaks of six slots and
  picks at waves 30 and 60).
- **The game smoke** `node scripts/spire-smoke/smoke.mjs` (22 checks): loads every script the
  template loads, in order, into one node vm over a fake DOM (`dom.mjs`) whose canvas
  RECORDS calls, drives the real frame loop and checks things **draw**: boot, 2D / low / the
  3D fallback, each kind built through `placeTower`, a fought wave, the boss sky spreading
  and full, towers keeping their colours, a capstone (a second VI refused, every tier
  table covers VI), Temporal Drive, two fingers moving two towers, a fling coasting and
  bouncing, "X lives left", game over / a loss past wave 10 / a win and the Ascendants,
  play again. A new browser global a script starts using needs a stub in `dom.mjs`.
  exec-fn's pre-commit runs it whenever `web/aspira-*.js`, the template or the harness is
  staged.

### 10.4 Simulator and balance tooling (`scripts/aspira-sim/`, README there)
Runs the REAL game code (the files listed in `sim.mjs` `FILES`: defs, upgrades, game,
formations, floats, waves, bosses, towers, acid, skills, frz, desc, capstone, positioning,
core) in a Node vm with drawing, sound and input stubbed, every tick as fast as it can,
with scripted players (opening, kind mix, upgrade appetite, interest reserve, chart axis
per point, core use). `ASPIRA_WEB=<dir>` pins a run to a snapshot of the game files; a
`patch` file run after load changes `TOWERS` / `ENEMIES` numbers or redefines a function to
try a change without touching the game. Scripts (see the README for arguments): `wave1`,
`solo`, `trios`, `combos`, `curve`, `rand`, `style`, `eval`, `late`, `waverep` (real trio
games per type, per boss, curve), `countermx` (the counter matrix), `isolation`/`tierfit`/
`chartvalue` (axis tier value), `bossbal` / `bossfleet` / `bossvs`, `typebal` / `wavebal`,
`swap`, `stuck` (gliding players never stuck), `corevalue` / `corepower`, `pool`/`playjob`
(a worker pool; resumable `out.jsonl`). Run one at a time with `nice -n 19` on the droplet.
`formvalue.mjs` and `latesearch.mjs` are pre-chart and no longer run. **Balance rules the
owner set** (keep when changing numbers): a lone L1 tower of any kind clears waves 1-11
(`solo.mjs`; `WAVE_COUNT_MUL`), and the Star (wave 12) needs two towers or an upgrade (SOL
and ACD may solo it); every trio of kinds must be winnable by the scripted styles (so no
kind is required); no tier lowers a stat; each kind has a niche. The simulator holds
players to `MAX_TOWERS` (`strategy.towerCap` lifts it for the one-of-each + 1 team
scripts).

## 11. Traps (every one load-bearing)
**Code shape**
- **No mid-line `//` comment** in the game JS: it swallows the rest of the line (it blanked
  2D, killed the bell shader, ate the slow log's fields, swallowed a sim brace — four
  times). Use `/* */`; exec-fn's `lint-swallowed.py` flags it. Likewise no `//` inside a GLSL
  expression line (the program fails to link; 3D goes blank).
- The files share ONE global scope and ESLint's `no-undef` is off: a dropped `const` throws
  at run time. Verify placement in a browser (or run the smoke) after touching `placeTower`
  — a dropped `const b` once threw AFTER paying and left placing mode open.
- The simulator loads only the game-logic files: UI-only code that logic reaches needs a
  `typeof X === "function"` guard (and `typeof document.getElementById`-style checks); a new
  script that logic needs goes in `sim.mjs` `FILES`; a browser global needs a `dom.mjs` stub.
- Every per-tier table needs exactly 6 entries before `aspira-capstone.js` loads (it appends
  index 6 to tables of length `SKILL_TIERS`); a new table or axis needs a capstone entry and a
  `CAPSTONE_TIERS` name.
- `fixedRand(wave, salt)`, never `Math.random`, for anything that shapes a wave; changing a
  salt or count changes the sequence for everyone (and every sim seed).
- Whole numbers: HP, armor and hits are floored; a landed hit is >= 1; fractions are banked
  (Temperance's `regenBuf`, goo drips). A spawned enemy must never have 0 HP (early swarms
  vanished).
- `G` must stay structured-cloneable (autosave): no functions, DOM nodes or closures in it.
- The boss rules read `document`/`ui` only behind guards: the simulator never waits for the
  Challenge button or the closing sky (`afterBoss`, `bossInv.phase`).
- Do not set `G.lives` huge in a test: the core draws a segment per life and freezes the page.
- Cooldowns count WAVES (`sendWave` ticks them); durations are game seconds; timers that must
  not follow the game speed use real time (`stepFloats`, flings, the boss sky's 3 s).

**Views and performance**
- **3D is a view, never a rule**: do not read the projected position for game logic; taps go
  back through `unwarp`/`pickAt`; ranges, hits and timing stay 2D.
- **Never lower resolution, or resize/reallocate the big 3D canvases, during play**: slow
  logs showed 1024<->2048 and 0.5<->0.75 hitches of 380-540 ms and likely iPhone crashes;
  only the far-detail radius adapts. iOS dies past its canvas memory around wave 62-70 —
  keep text stamps on their budget and zero evicted canvases.
- Every density read goes through `canvasDpr()`. New pure-decoration draws check `lowQ`.
- Safari has no canvas `filter` (it reads undefined): a fill with a filter set must not
  assume the canvas path. A gradient on a NaN throws and aborts the whole overlay's frame:
  skip tracers whose ends are not finite.
- Never put a `backdrop-filter`/blend layer over animated content; the board's own boss
  sky already avoids it (a full-canvas `difference` makes the GPU copy the canvas).
- The ACD pool and goo loops are bucketed (`POOL_CELL` 128) and capped; do not loop
  all-enemies x all-pools.
- Damage numbers age in REAL time but the game runs up to 10x: keep the `DMG_MAX` cap or
  thousands pile up.
- Headless WebKit renders ~1 fps: a screenshot before the first frame is blank, not a bug.

**UI**
- `.asp-ov { display:flex }` beats the UA `[hidden]` rule, so `.asp-ov[hidden] { display:none }`
  is load-bearing — without it the overlay never leaves and swallows every tap.
- `--fs-xs` does NOT exist in chrome.css: use `--fs-2xs`.
- Cards never scroll and sit at `--z-bubble`; the build dialog always unpauses on close, every
  other card restores the player's pause; a card closed unbought drops its basket.
- iOS: `#asp` needs `user-select: none` with the PREFIXED `-webkit-user-select` (iOS reads only
  that) plus `-webkit-touch-callout: none`, and the canvas must preventDefault `touchstart`
  (non-passive), `contextmenu` and `selectstart` — pointer events still arrive. A power's hold
  survives `HOLD_SLOP` 18 css px of finger drift. The no-funds red uses a timer (not
  `animationend`, which a throttled tab never fires).
- Nothing on the page may shift the board (no insets or media queries to clear an overlay).
- Wave-list rows are all the same size; the list rebuilds 4x a second, the HUD 10x.

**Game rules**
- A shield holds off every slow; Strength shrugs all of them (Temporal Drive too); Temporal
  Drive is the only full stop and is never "shaped".
- Armor reductions are permanent and may go negative: that is a flat bonus for every tower.
- `ARMOR_ONE_BLOCK` must stay false (one armor block on one lane made armor free).
- The Relay stays on the tower it was given (it used to ride the last dragged tower).
- A boss wave never rides the timer; the fleet queue counts as the boss being up; a time stop
  holds the wave clock and spawns.
- Score lives are paid only when the wave's last boss falls (they were paid mid-wave).
- Auto-move is for Ascendants only and disqualifies the game; arming needs a second tap.
- `FLEET_TO_BOSS` is live (a comment swallowed it for three days); raising it above 0.2 lost
  trios to the wave-120 boss.
- Never commit the sound samples (public repo) or `graphify-out/`.

**Process**
- The version and changelog are bumped by hand; `docs/spire-descriptions.md` is regenerated by
  script after any card text or number edit.
- A balance claim needs a simulator run (`waverep` for the curve, `trios` for every trio,
  `countermx` for the matrix); change one lever at a time and say what moved.
