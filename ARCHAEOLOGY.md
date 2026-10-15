# THE SPIRE — ARCHAEOLOGY

Incidents, superseded designs, balance measurements and perf history: the "why it's like
this". The current design is in [ARCHITECTURE.md](ARCHITECTURE.md); **the top-level sections
below mirror its numbering** (§2 here = history of ARCHITECTURE §2, and so on; §0 is the
timeline; sub-numbers are local to this file). Created 2026-10-14 when /spire became its own repo (`wai-lau/spire`,
submodule `apps/spire`); rewritten the same day when ARCHITECTURE.md became a current-state
design document. exec-fn's own ARCHAEOLOGY.md holds no /aspira history. Sources: this repo's
`git log` (1,177 commits, 2026-10-01 first) and the dated owner-command log that
ARCHITECTURE.md used to be — **the verbatim old ARCHITECTURE.md is in git:
`git show f00d730:ARCHITECTURE.md`** (every entry below was condensed from it; go there for
the full wording). Values here are SUPERSEDED unless a line says "still". Owner quotes are
the owner's (Wai, she/her) words from the commit log.

## 0. Timeline

2026-10-01 `/aspira` born owner-only (star-chart board, a build disc of ~270 hex cells, lanes
through it to the core). 10-02 guest tier + nav entry, the first overnight balance day (EXC ->
SOL, six slots, fixed waves, the ten Arcana bosses, core upgrades). 10-03/04 towers move along
spokes; renamed THE SPIRE for players, page at `/spire`. 10-05..06 skill charts, simulator-driven
bosses, perf rounds 1-3. 10-07 free core, five tiers an axis, upgrade sliders. 10-08 +/- steppers,
tier fits, ONE SPEED. 10-09 three towers; 3D view; the game renamed THE SOURCE. 10-10..11
drag-the-towers, trios, Ascendants, capstones. 10-12 the 12-wave cycle. 10-12..14 GPU 3D layers,
slow logs, autosave, changelog card. The shipped version stamp reads this back as majors: 1.0 the
game (Oct 1), 2.0 skill charts, 3.0 3D, 4.0 the three-tower game (`3cd5877`); the in-game
changelog card (`aspira-changelog.js`) keeps the per-day facts for players.

## 1. Overview history

- **Names.** `/aspira` ("Spira Defence" / "Spira 2", the Android genre, was the reference for
  mechanics only — all code and art original) -> THE SPIRE for players 10-04 (route, files and
  ids kept) -> briefly THE SOURCE in the title 10-09 (still the in-game title). The win screen
  was "the core holds" until 10-06 ("ascendant"); the title reads ASCENDANT after a win.
- **Run length.** WIN_WAVE was 100 with a boss every 10th (waves 10..100). 10-12 the cycle became
  12 waves ("add 2 waves before each boss"): every curve (HP, counts, money) reads a wave as its
  10-cycle equivalent so each boss is as strong as before with two more waves ahead of it. The
  powers moved from 20 / 40 to 24 / 48 with it.
- **Early shape of the game.** Normal enemies were removed 10-02 (swarm / fast / shield / armor
  remain); a wave once mixed 1-5 types (`pickK`, `TYPE_STAGGER` 2 s) before becoming ONE type;
  bosses were REMOVED 10-01 then returned as "the star" every 10th wave (size x10 -> x2, HP x10,
  leak 10 lives), becoming the ten Arcana the next day.
- **Rules once in force.** 10-02 an intro card (gone: the page opens on the board and the first
  tower starts wave 1); a Rapid (RPD) tower existed, then Stopper, Pusher, Gold, Reaper — "four
  towers (owner cut the rest)"; towers had 15 levels (condensed to L1-L4, then replaced by charts).
- **Wave-1 rule.** "ANY 2-tower opening must clear wave 1 with no leak" was amended 10-02: a lone SOL
  may leak a swarmer ("a good way to learn not to use SOL first"); 10-12 replaced by "a lone L1
  tower of any kind clears waves 1-11".

## 2. Board and geometry history

**Lanes, three generations.** (1) Each type k of wave n rode lane `(5n + 7k) % 12`, at its own
speed and with a per-lane `pace = (len/shortest)^0.6` (10-01..07; `PACE_EXP`, now 0). (2) 10-08
**ONE SPEED, THE SPIRAL IS THE SPEED**: every type moves at the base speed (76) except fast (x1.5),
and each type rides its own spiral pair (`TYPE_PAIR`), `PAIR_TURNS` `[1.9, 5.86, 2.06, 7.22, 8.78,
7.22]` solved so each type keeps the time under fire (path inside `FIRE_R` 250) it had before —
fast 9.3 s, swarm 10, boss 27.3, shield 33.4, armor 41.7 — with at least 1.5 turns under fire
on every lane (fast exactly 1.5, which set the speed). (3) 10-11 "towers drag twice as far, so quarter
all lane distances, then halve the orbits again": an eighth of the turns (fast 1.9 -> 0.24, armor
8.78 -> 1.1, boss pair 0.7325 -> 1.465 -> 2.93 -> 2.1975), the radial lead-in unchanged, so the
distance walked inside `FIRE_R` fell to about a fifth; the mix that paid for it was `ENEMY_SPEED`
1.5 -> 1.125, HP x0.225, bounty x1.25 (-> x0.7 on 10-12), counts x0.9, `HP_LATE` 1.115, ARC range
130 -> 115, ACD 115 -> 80. 10-12 fast and armor SWAPPED pairs ("fast more windy, armor more
direct"), swarm made almost straight (0.2575 -> 0.05), shield -6.7%, fast -18% lane (0.4).
10-14 "rotate all paths to maximise time on screen" (`laneBestTurn`). Earlier: lane dash styles
per pair (`LANE_DASH`) were removed for solid lines; bosses briefly rode counter-clockwise lanes
(everything is clockwise since 10-05); lane coils were softened near the core (`LANE_SOFT_R`);
`angle = t^2.2` hooked ~50 degrees right after the lead-in, hence the pitch-driven winding.

**Split waves.** A type's group was split k = 1..6 ways onto rotated copies (10-02). Per-type lane
counts: swarm 5-6 -> 20/24 (10-12/13, "mostly a visual change... keep the counts", then half the
bodies on 10-14 "no same number of lanes"), fast 2-3 -> 3-5, shield 3-5 -> 2-3, armor 1-3 -> always
2, and "nothing rides exactly four" (10-13).

**Slots.** The build disc was tessellated into ~270 pointy hexes (`BUILD_R` = `RIM_R` - 6, then
`CELL_PITCH` 2 -> 60 cells), a tower snapping to any free one; 10-02 "limit slots to only 6, the ring
around the centre". Three corner slots (10-05, a top-heavy triangle opening when the boss of wave
20 / 40 / 60 fell, with a "new slot unlocked" float and a 12 s flash) were dropped 10-07; the code
stays dormant (`CORNER_SLOTS` empty, `CORNER_IN` 145 -> 171). 10-09 three slots (`SLOT_ANGLES`)
and sliding through the core; 10-10 six again, each a tower's SPAWN for dragging; 10-11 "remove 3
slots entirely (except for testing)": `OPEN_SLOTS` -120/0/120, `MAX_TOWERS` 3. Slot distance:
`SLOT_R` 110.85 -> 65.5 (10-09, "snug, still tiny gap") -> 78 (10-11, bigger core and towers). The
core: `CORE_R` 34 -> 25.5 -> 29 -> 22 -> 25; towers `TOWER_K` 0.66 -> 0.94 -> 0.705 -> 0.85;
`TOWER_GAP` 3 tiles was tried and replaced by the lattice spread.

**Camera.** The first game had zoom to 4x (wheel and pinch), pan, double-click refit, and a
`DEFAULT_ZOOM` 1.25 -> 1.5625 -> 1.953 start. 10-11 "no zoom, no pan"; 10-13 the play box (every
screen fits the tightest standard phone, "the zoom should be adjusted so either the top and bottom
touch or the sides"; the core 1.5 side-distances from the top, `VIEW_UP_K`) and it became the towers'
movement cap. `PHONE_ZOOM` 0.5 -> 0.6 -> 0.72. The core once sat at the canvas's middle, then 400 /
520 / 416 below the stats row ("set from an iPhone screenshot").

**Shields.** Enemy and core shields went from outlines (up to 3 concentric) to one segment per point
(10-05), then rings that subdivide outward (ring r holds sides x r), with random-segment loss,
inward gain and a red flash. Lives start at 18 (two full rings) in steps of `LIFE_STEP` 6: a boss's drop was +10, then +12, then +6; a score milestone +1, then +6.

**Credits on the core, five placements (10-03..04).** A DOM stat row; then drawn BELOW the core
(`CREDITS_DY` 150, between the bottom slots' spokes — over the core it sat on the top slots'
towers); a two-line "CREDITS / number" on the hexagon; one line "CREDITS 12,345" (the `c` made
gold, then un-golded: "don't make it gold unless already gold"); finally just the number, centred,
with a small `CRED` (white halo then plain outline).

## 3. Economy and flow history

- **Start money:** 100 -> a 10,000 playtest start (`PLAY_MONEY`, 10-02) -> 120.
- **Waves:** a "send wave" button with an early bonus (3 credits per second skipped), a 15 s
  countdown only while the field was clear, then auto-send, then a fixed `WAVE_TIMER`: 10 -> 13 ->
  16 s (10-02, "thin the field"), halved to 8, 20% shorter to 6.4 (10-12). The send button and the
  Tab key went with the early bonus. An "every-8th-wave bonus" (credits / interest / lives) was cut.
  The first four waves were fixed (swarm, shield, armor, fast) from the start; the 1-5 type mix died.
  After a boss: no wait -> wait for the sky -> the Challenge button (10-12), delayed 2 s (10-13).
  The boss holds the timer (10-02) and a boss wave never rides it (10-09).
- **Interest:** 3% base, +1% from bonuses; paid on money at the moment of sending; payout capped at
  4 x the wave, then 20 x the wave, then uncapped (10-12 "no interest cap pls"); base cut to 2% on
  10-14 ("balance the money": at 3% uncapped, 97% of a run's money was interest, ~350k banked by
  wave 91). The boss drop was +10 lives or +5% interest, then +12 / +1%, now +6 / +1%. The star
  once dropped score or credits. Credits flew as "+N" pop-ups until 10-09 (now dots).
- **Tower prices:** all 40; x2 per tower standing (10-02), x1.5 (10-04). Sell returned 70%
  (-> 95%, 10-13). The first upgrade was 5.9 x build price, halved to 2.95.
- **Upgrade ladder:** `SKILL_STEP_COST` 2 / 3.5 / 5.5 / 8 / 10.5 / 13 (a full six-point chart 42.5
  build prices), 2.5 / 4 / 7 / 11 / 16 / 22 (10-06 "more expensive and more powerful": 62.5), nine
  points ~6,980c (10-07), fifteen ~27,820c, sixteen with the capstone ~39,460c.
- **Core price ladder (10-06..07):** `CORE_COST` 1000 .. 5000 a level, 27k in all (76.5k before it was
  flattened). Measured 10-07: 0 of 192 scripted games won while saving for it, the same players won
  76% without it — the "cliff at wave 60" was the core's price. Hence the free core (§4).
- **Bounty:** `BOUNTY_KNEE` 60 -> 30, late slope 0.2 -> 0.1, `BOUNTY_MUL` 1 -> 1.25 -> 0.7
  ("way too much money in the game", 10-12); swarm bounty 0.18 -> 0.09 -> 0.18 -> 0.36 as its count
  halved. The interest payout cap and the "money run phase 7" (a spender was tight late, only a saver
  loose) are why the curve is what it is.
- **Speeds:** 1x/2x/3x -> 0.5x added -> 10x for testing -> 1/4x -> `BASE_SPEED` 2 (1x was the old 2x)
  and back to 1; now 1 / 1.5 / 2 / 3 (10x owner-only), keys 1-4. Auto-wait: 8 s / 3 s then 6 / 2 / 1;
  stages 1x / 1/2x / 1/4x then shares of the chosen speed; auto-SPEED (3x when no enemy near)
  existed 10-09..12 and was removed.
- **Score:** shown in the HUD until 10-05 ("no one cares about score"); extra lives at 50,000 then
  every 100,000 were paid mid-wave until 10-14.
- **Time:** the sim ran at a hidden 3x at "1x" until it was rescaled so 1x is real time (every rate
  x3, every duration /3).

## 4. Towers history

### 4.1 The first towers and trees (10-01..05)
RPD (Rapid), CHN (Chain), SLW (Slower), RPR (Reaper/Ray) -> ARC, FRZ, EXC -> SOL, plus ACD (10-02).
Each had an L2 PATH (3) and L3 FINAL FORM (6) and an L4 SUPER, in `aspira-upgrades.js` (still in
the tree, dormant). Records: ARC **Storm** (Tempest, Overcharge, Static slows) / **Ion** (x3.1, ignores
shields and half armor; Rail, Fork, Crescendo) — Ion and Array were nerfed x0.8 after the build search
took them 29 times in the top 30; ACD **Catalyst** (Rain / Pour / Residue) / **Plague** (Bloom /
Corrosion / Contagion); SOL (EXC) **Charge** (Longshot, Supernova, Execute) / **Array** (Grid,
Ricochet, Refund); FRZ **Shatter** / **Stasis** (Deep Freeze, Whiteout -> Moons, Permafrost). Colours
were swapped and swapped back on 10-02 (ARC pink/EXC orange then ARC orange/SOL pink). Tower
labels once followed the newest form name (`towerAb`, 3 letters). Ids renamed to display names
10-06 (`rename.py`: chain/slower/reaper/acid -> arc/frz/sol/acd; axes cond/volt/static ->
conductivity/voltage/capacitance, frost -> temp, refract/scorch -> refraction/breach, catalyst/pour/
seep -> corrosion/spray/contagion; core powers fortify/empower -> relay/overcharge/temporal); axis
display renames 10-12: Temp -> **Sublimation**, Rime -> **Permafrost**, Spray -> **Flow**.

### 4.2 Base stats over time
Ranges: ARC 173 -> 86.7 (halved 10-06) -> 130 -> 115; FRZ 176 -> 88; SOL 350 -> 175 -> 200 -> 260;
ACD 230 -> 115 -> 80 -> 88. `RANGE_BONUS` 1.2 -> 0.6 (a halving meant as 75%) -> 0.9 -> 1.035 -> 1.553
(x1.5 for three towers, "don't let range go over 1.5x") -> 1.165 (10-12, "reduce all tower ranges by 25%").
Damage: ARC 28 -> 34 -> 42 -> 48 -> 96 -> 48 (the damage scale halved 10-08, "made real") -> 24 at rate 3
(10-12, "2x the rate at half the hit"); SOL 110 -> 88 -> 110 -> 140 -> 189 -> 170 -> 220 -> 110 -> 73 at 1.5/s;
FRZ 1.5 -> 7.5 -> 2.5 -> 5 -> 12 -> 30 -> 15; ACD 8 -> 12 -> 18 -> 26 -> 46 -> 23. SOL ignored armor
until 10-07 (its damage x1.3 when that ended); FRZ and ACD got x1.5 damage / x1.2 range 10-02 after
"the build search never picked either". The tower DEFAULT targeting was all-close, then by role.

### 4.3 The skill charts
**ARC (10-05..).** Three axes, first guesses fitted to +25 / +50 / +100% team damage (`arcfit.mjs`).
Conductivity was all branching (3 / 7 / 13 hits); Static was an EXPLOSION on every hit, reworked
twice 10-05 and again 10-07 to "hits charge the target, charged targets arc once when hit by
anything" (arcs to `STATIC_ARC_REACH`), then 10-08 to BURSTS ("too much like Conductivity — circle
AoE instead of arcs; hits add more and more charges"): `n` charges at frac 0.1 (-> 0.14 on 10-12),
radius 70; its slows 30/35/40% -> `ARC_STAT_SLOW` .15-.2 -> .25-.45 from tier I. Voltage: damage +
range, 142%->105% "a dud" 10-07 -> each jump keeps `ARC_VOLTAGE_FALL` of the hit before it; it
pierced armor for a day (10-11) and now is damage only (10-13). Conductivity IV/V: "chains twice /
three arcs" -> strikes cut 3/4 -> 2/3 ("nerf ARC and boost others", 10-11) -> revisits (10-08 `v`).
Jumps must never go back up their branch; a hit can return from III (10-08). "Armor grounds the arc"
(10-08, the counter table: ARC held every type at 0% leaks) is current. ARC's base deeper tree
(1-2-4, 7 hits) was tried and reverted the same day (10-02).
**FRZ.** Tethered rays (3 targets, then 1, then 3, slow 40% at L1 and 20% weaker, Deep Freeze 95%)
-> an AURA (10-05): Frost (wider, colder; `FRZ_TEMP_SLOW` .3/.38/.46/.55 -> .33 .. -> .4 .. .45), Rime
(pulses, stacking slow 3/5/8%, `FRZ_RIME_EVERY` 2 s, growth 0.6 -> 2.4 s), Moons (1/2/3 copies at 0.5 -> 0.78
scale; orbit 42 -> 126 -> 70/58/46 -> 70 -> 140 (twice as far, 10-08); IV/V 4 and 5 moons -> 3 moons
with 1 / 3 small moons; an elliptical Kepler orbit (`MOON_ECC` 0.5) reverted to circles the same day).
Brittle: from tier III (x1.15..1.25) -> from tier I (x1.15 .. 1.75, 10-11) -> "takes armor" for an hour
-> back to extra damage (10-12). Rime: shattered shields (10-11) -> took armor (10-12; "rime should not
strip shield"). Moons: cracked armor 10-11 -> removed 10-12 (a dead stat remains, see ARCH §4.3).
The enemy-type "bite" (`FRZ_BITE_BY` fast 9, swarm 4.5, shield 1.3, armor 2) replaced the
speed-ratio bite 10-11 and was itself replaced 10-12 by "the colder the harder" (`FRZ_CHILL_K` 6,
"get rid of all enemy-based damage multis"). A shield was once immune to ticks, and FRZ ticks
ignored armor until 10-12. FRZ was a pure SUPPORT tower "by design"; its tick has ticked quietly.
**SOL.** Tree rework 10-03 (Impale: every hit bleeds -3 armor and +3% crit, stacking, permanent;
Pinpoint / Stake->Gore->Haemorrhage / Ricochet; Charge: x2 damage, 2 half-beams; Grid / Quad / Smasher->
Nova; Supernova) -> chart 10-05 (Focus / Refract / Pierce) -> Focus = full beams (`SOL_SHARE` gone, base
dmg 215 -> 170 to match) -> Refraction "from the start" and "forward only" (10-08: hops used to go
backwards for an afternoon; cone half-angles 25 -> 8 flat -> 12..26 -> 20/60/80 -> "x0.6, narrow SOL"
-> "x2/3, tighten the refraction angle" (current 8 / 24 / 32)) -> the cone starts at the FIRST enemy
struck and points where the most are (10-12). Breach: `SOL_BREACH` stack counts (gone), `BREACH_ARMOR` 2 ->
1.5 stack -> flat per hit 3 / 24 / 72 / ... -> 80 .. 1100 (10-12, "don't scale breach with enemy armor"
after it scaled for an hour); crit chance per Breach tier removed 10-12. Shrapnel on a breached
death 10-12. "No stat goes down" floored `SOL_FOCUS_DMG` and `ACD_SPRAY_MUL` at 1.
**ACD.** A line that ramps (x64 cap -> x32; halved to x16 and RESTORED 10-08 after `bossvs.mjs`
showed SOL out-bossed ACD at every cap), placeholder tree, then chart 10-05: Catalyst (doubling every
0.75 .. 0.4 s) / Pour (2/3/5 lines) / Seep (puddles). Puddles: none at tier 0 (10-07) -> pools from the
start (10-12); bubbles and a liquid pool look; Contagion slow (Pandemic 30%) moved to Flow's jets
10-12. Pools: `ACD_PUDDLE_CAP` x32 -> x8; heat 30% -> 10% -> .1 .. .15; "spread" (kill in a pool leaves a
pool, 10-13). **Corrosion**: stripped armor in the legacy tree; dropped by the chart rework, restored
10-10 (`ACD_CORRODE`, "every trio winnable"); no floor 10-13; **the goo** 10-13: drops that home
and take armor, life 8 s -> 40 s (10-14), `DRIP_UNIT` 0.1 -> 0.3 ("reduce goo pellet count"). Roles
rework 10-12 ("what is ACD weak to now? seems op"): base burn x2, Corrosion = the strip alone, Flow =
carry + slow, Contagion = coverage. ACD ramp "dissolve carries ALL of it" was an overnight pick
(10-06). ACD `ACD_LINES` 1/2/3/5 -> 2/3/4/6.

### 4.4 Tiers and the chart
Three tiers -> five (10-07) -> six with the **capstone** (called the "giga capstone" until 10-14) (10-11: "add a 6th level to each of
the axes", "you can only get 1/3 of the giga capstones"); `SKILL_POINTS` 6 -> 9 -> 15 -> 16; a capstone
costing two levels (10-12). Reach by tier (`SKILL_MOVE`): range, slide extent and slide SPEED (speed
gone 10-12) were all axes' levers; ARC's range tiers x4.3 maxed were cut to x1.25 (10-11,
"late-game players don't need to move towers"). The overnight tier fit (10-08, `tierfit.mjs`, waves
40-70): every axis tier fitted to the median curve of all 12 axes (110 / 125 / 150 / 170 / 190% at I..V)
— a 125..300% target needed absurd values for weak axes (Voltage x22, Breach 217 armor); iteration 2
(drop-one-kind): ARC REQUIRED, Judgement (90) the wall for every mix; iteration 3 "no kind required" cut
ACD pool heat to ~15% and every mix without ARC lost (FRZ+SOL+ACD 0/6); restored on purpose (heat .17 ..
then .1 .. .15); the isolation run (10-08) pulled Capacitance (weakest ARC axis, 136%) up and FRZ Moons
/ Temp (499% / 438%) down.

### 4.5 Upgrading: UI history
Two clicks (select, then confirm) -> the chooser (cards, one per option) -> chart axes DRAGGED on the
card (10-07) -> three real RANGE SLIDERS stacked left of the chart (10-07) -> **+ / - steppers** (10-08;
the touch drag `dragAxis` gone). The basket / track-changes / word-diff card, the "sell to undo" note
(removed 10-12), a spend bar, a stat triangle on the board (with tier spokes until 10-09), and the card
as two halves (landscape) or stacked are all 10-06..07. Cards once "sat bottom centre and lifted over the
wave list"; the heading line became one small line; card type sizes (`--fs-xs` never existed).

### 4.6 The counter matrix and role fits
10-08 "each tower has 1 main and 2 helpers" (a Latin square; countermx 61-69): FRZ leaked 73-79% of
fast -> frost bite; ARC held every type -> armor grounds the arc; ACD put at "weak to fast and
shields"; SOL weak to swarm. Levers added 10-11/12: shield pops per hit (ACD 3 -> 1; SOL by Focus tier),
"frost cracks armor" (gone), armor scaled with `ENEMY_HP_MUL` (it had been left out of the x0.225 HP cut
and ate 4.4x too much of each hit), armor scaling with HP (10-13).

### 4.7 The core and its powers
10-02: click the core, from wave 30 (`CORE_UNLOCK`), for Zen (a slow pulse) / Nullify -> Space (slots
pushed out, range +100) / Sinter (+30% damage), L2 / L3 options, repeatables (Overclock, Amplifier, Lens),
costs 1,500 / 3,000 / 6,000 -> 1000 .. 5000. 10-06 replaced by "core powers": Fortifications (a copy of a
tower) / Empower / Temporal Manipulation, renamed Orbital Relay / Overcharge Uplink / Temporal Drive
("planetary-defence names"). 10-07 THE CORE IS FREE: bosses give PICKS (waves 30, 60); the Relay and
Overcharge merged into ONE Orbital Relay ("the tower as three"; the core-copy, Overcharge and
`coreTowers` removed). 10-08 powers as BUTTONS above the title (was a dial of arcs round the core). 10-11
"no picking": GRANTED at the 2nd and 4th boss; cooldowns counted in WAVES; Relay 22.5 -> 45 -> 22.5 -> 11.25 s
and it RODE the last dragged tower (10-11..14); Temporal duration 5/8/12 -> 2.5/4/6 s (10-12), cooldown
90/65/50 s -> 4/4/3 waves, ring look slower (10-11), "end when no enemies left" and "no screen shake"
(10-14). Overcharge-from-wave-1 (an early sale) measured: one early point harmless, II / III starved the
towers (71.7 / 40.3 avg wave vs 97.7).

### 4.8 Movement, 10-03 to 10-13
Towers once did not move; 10-03 they SLID along a spoke toward the enemy their targeting picked
(`chaseTarget`, `TOWER_MOVE` 80/s, sticky target, predicted lane, dead zone, eased motion: reversals 99 ->
7.7 per tower-minute); drag-to-rest (`t.rest`) removed within a day; 10-04 positioning by scoring spots on
the spoke (urgency 1 + 20 p^2, targeting mix 0.3 -> 1 with urgency 6, horizon 3 -> 5 s, `POS_SOON` 1 s,
rest outermost) and per-kind speed / reach (`TOWER_SPEED`, `TOWER_REACH`); "FRZ and ACD roam, ARC and SOL
anchor" (10-06). 10-09 sliding through the core (inner end a span further in), reverted the same day for a
range bonus. **10-10 "all of the towers can be dragged"**: towers teleport, drag any time, "limit movement by
distance from spawn" (the leash round the slot, radius = the old spoke travel), "while dragging the tower
still shoots"; spokes, `TOWER_SPEED` and eased sliding gone; the leash shown 4 s after build. 10-11 span 1.5
-> 1 -> back; the screen cap ("fixed zoom 0.5, 0.6, 0.72 tried in a day") became the only limit; two fingers at
once; the fling / bounce (10-11/12); the leash by kind (10-13 audit: 434 / 519 / 869 -> 200 / 240 / 280 /
74, `SLIDE_MAX` 2 -> 3). 10-13 auto-move (the simulator's mover at human speed; DQ).

### 4.9 Targeting and sizes
Targeting: Hard / Fast / Close -> Fresh / Biggest / Near (10-03); "Tagged" came and went 10-07;
defaults all-close -> by role. Sizes: towers 25% smaller (10-05/06) and bigger "to press" (10-11).

## 5. Enemies, waves and bosses history

- **Shapes:** triangle fastest, more sides slower, hexagons reserved for towers (10-01); armor a heptagon,
  shield a pentagon; bosses an octagon -> **dice** (10-09): fast d4, swarm d6, armor d8 / shield d10 (swapped
  later that day: shield d8, armor d10). Enemies once spun / faced nose-first (a draw-only `FACING`).
- **Speeds:** fast 135 -> 270 -> 220 -> 187 -> 150 -> 130-ish; shield 75 -> 37.5; armor 60 -> 30; swarm 95 -> 125; boss
  100 -> 50 -> base. `ENEMY_SPEED` 0.5 -> 1.5 -> 1.125. 10-14 "generally reduce HP ramp, increase speed ramp
  instead", "mid game feels a bit easy": the speed S-curve + the HP hump.
- **HP curve:** x1.15 a wave (quadrupled every 10) -> x1.10 (10-02) -> x1.13 to wave 20 then x1.11 (10-09) ->
  x1.115 (10-11) -> x1.13 / `HP_END` 1.06 -> 1.07 past wave 80 ("the end game eases", 47 of 48 lives were
  lost in waves 80-100). x1.5 plain HP from 25 (10-12) stepped x1.0 / x1.2 / x1.5. Armor from sqrt -> power 0.4
  -> flat -> scaled with HP past 49 (10-13). Shields 5 -> 8 -> 4 charges, `SHIELD_EXP` 0.4 -> 0.335 -> 0.29.
  Enemy HP once halved on the display (`VIS_DMG`) then made real ("update visual and back end", 10-08), and floored
  to whole numbers ("ints rather than floats"). 10-08 harder after wave 20; 10-09 the steeper early ramp (the
  owner wanted "randomly picking to lose around 30": `rand.mjs`); late traits and hybrids 10-12/13.
- **Counts:** `TYPE_COUNT_MUL` swarm .75 / shield 1.51 / armor 2.63 / fast .48 (the first, closest-approach fit) ->
  .52 / .99 / 1.07 / 1.47 (enemy-seconds fit, `typebal.mjs`) -> swarm .26 -> .325 -> .1625 (half the bodies,
  10-14); fast 1.47 -> 2. Counts uncapped (10-11, "the R10 battery, cap 28 left the late game easy"). Early waves:
  wave 1 doubled (10-09) then weaker than wave 2 (10-12).
- **Formations (10-11):** swarms wander (`jit` 6-21 -> 12-42 -> 18-63), fast pairs spinning, shields in Vs, armor
  in a lattice; fast flew the Vs "for an afternoon"; armor spun for an hour then "remove armor spin"; armor in one
  block made armor free (36/36 won) so it splits in whole rows; shield Vs of 5 only -> 3 -> any count (10-12).
- **Bosses.** HP table refit 10-05 (`bossbal.mjs`: each boss vs the four waves around it on CLOSEST approach),
  10-07 (Chariot / Temperance breached, Lovers got to 47), x2 on 10-12, `BOSS_HP_K` 1.4 and `BOSS_FAR` 10-13;
  Star 3.4 -> 2.7 -> 5.4 -> 32 ("require 2 towers"); bosses scaled with lane length until the boss had one lane;
  "bosses stay full size whatever their HP" tried and reverted (10-12). Early bosses had double HP "up to
  Temperance", Temperance regen 2% -> 6% at x5 HP -> 1.22, Empress brood 10 x -> 30 -> 12, Devil halved then x1.5,
  Death "a juiced-up Star". 10-09 FLEETS ("each boss should come with a fleet, thematically"; "don't reduce boss
  HPs"; "maybe the equivalent of 1 wave"): `bossbal.mjs` closest approach before -> after: star 246 -> 234, empress
  156 -> 125, strength 198 -> 130, chariot 284 -> 271, lovers 227 -> 224, temperance 251 -> 198, devil 130, justice
  315 -> 327, judgement 315 -> 340, death 246 -> 229. 10-11 `FLEET_TO_BOSS`; 10-12 fleet formations, the Star's
  pack (x3, behind, tight), escorts enter one at a time, only the Judgement spreads (12 lanes); 10-13 3 or 5 tracks.
  Each boss's mythic hint became a haiku (10-05). Boss waves once opened a corner slot / a core pick on the kill.
  Lovers once shared one lane. The Fool and the Tower are left out of the Arcana.
- **Boss sky, rounds 1-5 (10-02..11).** A CSS-inverted overlay -> draw the scene twice (once inverted) with a
  second set of lane layers (10-05, "very laggy") -> one draw + `skyFlip` (CSS `invert` / full-canvas `difference`,
  10-09) -> no pass at all: 2D draws in the inverted palette (`skyPal` / `withPalette`), 3D flips inside GL with one
  `1 - dst` triangle (`warpFlip`, 10-11, "invert has huge cost"). The sky spread from where the boss spawned, then
  from the core; it collapsed onto the last boss, then the core. The game holds while it turns (10-12) and the next
  wave waits for it (10-09). Flushed timing at 3x: full sky 482 ms vs 387 without (overlay 1038 vs 620).

## 6. Damage model history

Slows: ONE at a time (strongest wins) -> logarithmic stack across towers (`1 + 0.5 ln n`) -> per-source
multiplicative with debuff SHAPES (10-05) -> shaped (`SLOW_KNEE` / `SLOW_CAP`, 10-11, "waves don't take as
long to kill"). Fast's slow cap 0.9 -> 0.99 -> 0.96 -> 0.88 -> derived from its speed (0.84 at 1.91x; 10-12, after
fast enemies "froze in place" under stacked slows); a slow can never fully stop an enemy (`f902400`). A shield
once held off only hits, not slows; 10-12 "shielded units cannot be slowed while they have shields". Armor: a flat
bite, floor 10%, 12% a wave -> power curves; "SOL ignores armor" until 10-07; reductions permanent and
negative-able (10-03); quiet hits skipped armor until 10-12 ("allow negative armor to apply to everything").
Damage numbers: every hit shows (10-06), culled by size at `DMG_MAX` 120, sized by the pre-armor hit, grey by
the share armor took (10-09), flying away from the tower (`DMG_FLY` 30 -> 90). Credit for debuff-added damage goes
to the debuffer (10-12). Crits were a CRIT label, then a pink number, then marigold (the `orange` token; current).

## 7. Interface history

Wave list: first a header line previewing the next wave ("type x count, lanes, star") -> the next ten in a column ->
Roman numerals -> no numbers (10-06) -> icons sized by HP on a log scale -> a swarm tessellating in a three-row
lattice (back from a jittered single line) -> rows all the same width and height (`WAVE_SPAN` 220 -> 110) -> left-
aligned, tessellating 1/2/3 rows -> a green box round the live waves (10-09; was a white band) -> HP and names
dropped on phones. Layout: a nav bar on the page until 10-05 (removed, a home button instead); the build bar
bottom-right against the Exec bubble, then "the bubble inset removed"; build buttons -> **tap a free slot**
(10-06) with four cards; the speed row moved to a bottom bar; auto-wait moved under the wave list, then top; the
volume slider vertical top-right; the CRT stack cut to 0.4 then removed (10-09). The tower card followed its tower
then sat bottom centre, "never scrolls" (10-07). Text sizes: pop-ups 44 -> 30, interest 20 -> 14 -> 21 ("3x
larger", "too large, half that"), boss title 46 -> 22 -> in the page title (10-09). Credits "Nc" gold -> not gold
(10-03). The FPS stat is kept. Exec bubble: none on /spire (it covered ACD). The 10x speed is owner-only (10-14).
Keys: 1/2/3 speeds and U, Space, Tab (next wave), Esc, M; build shortcuts 1-4 removed ("by choice").

## 8. Rendering, 3D, audio and performance history

### 8.1 3D in one day (10-09, four shapes)
Quality toggle -> slider (low / high / 3D). The 3D view went: a **rounded cone** whose slope steepened each wave
(`SLOPE_AT` 5 -> 25 degrees; "reverse the dip, so it's a tower") -> a **fixed bell** with a level plateau under the
towers (`WARP.depth` 460 -> 2300 -> 6900 -> 13800, "make it 5x taller", "always a deep classic bell shape") and a
black-hole grid out to 2400 -> a **funnel / flipped gravity well** ("towers like angels dancing on the top";
"spacetime curve should not occlude, make it semi-transparent"; `pow` 3 -> 2, depth 1800 -> 1500) -> a **smooth
bell with flat sprites** drawn on a third canvas `#asp-ent` at their projected point -> **isometric over a FLAT
board** (owner: "this is too fucked"; `depth` 0, `tilt` 0.9553 = atan sqrt 2, `fov` 0.02) -> more top down (`tilt` 0.55) and a real perspective (`fov`
0.9, "increase size changes based on distance from camera") — the CURRENT design (ARCH §8.1). The funnel and bell
knobs (`depth`, `pow`, `head`, `shoulder`, `grid`, `warpHeight`) remain in `aspira-warp.js` at rest (headers in that
file still describe the funnel). On the flat board: prisms for towers and core ("back to prisms instead of pointy"),
a fog layer over what is below the floor -> geometry fading in 8 slices (`aspira-fog.js`), shields as 3D walls
(`aspira-walls.js`, briefly) -> back to lines on the floor, spheres for rings (briefly), real dice (`aspira-solids.js`),
a light from the core, lanes partially occluding the towers, towers fading down their own height, tracers fading to
their tails. The cone's stray inverted-sky colour bugs ("colors rapidly
switch as the boss dies") were fixed by falling back to the whole view when any circle point projects behind the
camera. 3D fixes: dotted-prism empty slots, an upright Breach spike, a frozen die at 50% cyan.

### 8.2 Perf rounds
1-3 (10-04..05). Round 3 was profiled at 3x density because earlier profiles ran at 1x and never waited for the
canvas to raster, so they undercounted; the canvas caps at `RES_CAP` 2 device px (a phone at 3x drew 3.4 M pixels);
tower glow became a cached SPRITE (wave 83: 12.9 s -> 3.9 s software-rastered); fast tracers a plain tapered fill.
Late-game lanes (10-05, 9 L4 towers, wave 93, headless WebKit at phone size; render 449 -> 43 ms a frame): the lit LANES
were ~83% of a frame (two full-screen layers rebuilt each frame, every live spiral stroked three times, the 32-wide
glow the costliest, masks of full-screen gradient fills): layers rebuild only when their signature changes, cached
masks, glow only inside `GLOW_PATH_R` 330. Waves 80-85 with all nine slots maxed showed the real killer: DAMAGE NUMBERS
aged in real time while the game ran up to 20x, so thousands piled up (render 74 -> 585 ms); `DMG_MAX` 120 brought
it to 16-52 ms. Round 4 (10-05): dim range discs outline-only (446 -> 322 ms flushed at 3x), cached graticule layer
(was 384 strokes a frame), `LIT_MIN_MS`, HUD 10x a second. **Quality = low (10-07):** measured in headless WebKit,
430x932 @3x, wave 81, nine maxed towers: median frame **3558 ms high -> 126 ms low (x28)**. Boss sky "invert has huge cost"
(10-11): Temporal Drive dropped `shadowBlur` (a 6 px blur on one octagon ~8 ms a frame, the old five at 24 px ~34 ms) for
one wide faint stroke. Acid pools past 24 land hits with no flash and draw as plain circles (`79fa1ca`); live sparks capped
at 300 (a late swarm wave kept ~2,300); full-dice budget dropped: every die over 12 px stays 3D, under-12 px or past the
60 biggest draw flat (`6d4031a`, `5b3e137`).

### 8.3 3D frames, 10-09..14
Dice, prisms and projections cached per frame, the view at 0.75 resolution (10-09: 3D frame CPU at 95 enemies 9.8 -> 6.5 ms;
`warpEntities` 12 -> 5.3 ms; 3D render + view 14.4 -> 11 ms), lane layers merged to one (`blitLanes`); 10-12 slow frames
stepped quality down in order — far-detail radius to 600, board picture 2048 -> 1024, resolution 0.75 -> 0.5, density
2 -> 1.25 (trigger 40 -> 34 ms because a Brave sat at 36-40) — and auto-stepped 3D -> high -> low when not pinned. 10-13 the
**two-layer rework** (the iPhone spent ~28 of a 32 ms frame sending the whole 2D board to the GPU): board layer every
150 ms, moving layer every frame (`27dcf55`); 10-14 hits / beams / sparks / rings / coins as GPU instance batches
(`8a8e289`, `2b83254`; "a 10x improvement on perf ... avoid lowering resolution or reducing visual clarity"), dashed rings
on the GPU, text stamped once, a stand-in 2D context so nothing on the moving layer falls back to canvas (`0781e6c`,
`7963fa9`; ~5300 canvas fills / strokes a frame at 63 enemies -> one batch). 10-14 slow frames STOPPED shrinking
picture / resolution / density (reallocating the big canvases caused 380-540 ms hitches and likely iPhone crashes) —
only the far-detail radius comes in (`bb8de72`). Safari has no canvas `filter` (it reads undefined) so every fill on the
moving layer took the canvas path (`5711f58`). Text stamps live on a 6M px (~24 MB) budget, least-recently-used out,
evicted canvases zeroed so iOS frees them (`146707b`; an iPhone died at wave 62-70 again and again).

### 8.4 Audio history
Synth-only; optional Brood War samples (10-02, gitignored, personal use, served to the guest tier); per-tower build /
upgrade sounds (`sfxFor`), ACD "Hydralisk spit" per tick and `SAMPLE_MAX`; `SOUND_MAX` 3 per kind (generalised the same
day); boss voices per Arcana (the Archon set locally); `LOUD_GAIN` / `TOWER_GAIN` / kill 0.4; volume 0..2 with `VOL_BOOST`
2 after the limiter; the core-power sounds (own, not "upgrade complete"); the shutdown sound on a leak. No auto-pause on
focus loss.

## 9. Meta history

- **Ascendants / TOP PLAYERS (10-11).** "When a player beats a game let them save their initials" -> "shared board, honor
  system" -> "make sure we never lose it" (the first winner) -> journal-backed -> "for any wave after 10, allow user to post
  on the leaderboard", gold winners / green others, titled TOP PLAYERS; ASC_MAX 3 -> 6 posts / IP / hour; 10-12 the owner's
  games hidden from guests ("don't show results added by owner"), 10-13 `hide` ("remove wai ugh and boo"), auto-move
  disqualifies, 10-14 the owner's games show from that day. The board shows 10 rows and scrolls (10-12).
- **Slow logs (10-12).** "This is just my partner's Brave — can we make it so each session takes slowlogs and sends them back
  every 3 min of play": first to a temp folder (wiped by every deploy), then `data/spire-perflog` ("stop wiping old
  slowlogs", `0fa17d5`); gained 3D-pass splits (glMs, entMs) and canvas-memory counts.
- **Autosave (10-14).** "An iPhone that runs out of memory reloads the page, and a run at wave 62 or 120 was gone."
- **Version / changelog (10-14).** A stamp `vMMDD.HHMM` of the newest file mtime ("an older stamp on a phone means cached
  code") -> hand-kept `major.minor.tiny` + the build, clickable to the changelog card.
- **Guest tier (10-02):** first owner-only and a nav entry, then guest ("aspira should be public, behind cloudflare"),
  landing-wheel section; the page moved to `/spire` 10-04 with `/aspira` a 301.

## 10. Tech history

- **Simulator** born 10-02 (the overnight balance pass): speedups (a plan whose first seed scores below the best skips
  the rest; cached lane trig; `FACING` off; **snapshots** of G + the RNG so a plan resumes from its common prefix
  (`SNAP_CHECK` 29/29 matched); two worker threads; ~2.1 s a plan vs ~5 s), ghosts dropped at death (exact only once no
  arc launches from them), the `threat` strategy, `buildsearch.mjs`. The sweep of 10-07 (game files frozen at `abaa5465`):
  **without the core, 73 of 96 won** (death p10 33 / p50 100); **with the full core ladder, 0 of 192** with a cliff at
  wave 60; ARC Voltage and ACD Corrosion were duds; FRZ flat; core powers did not pay for themselves; FRZ in every subset
  that passes 70 (best without it 67); "late game is easy for a mixed build". Overnight 10-02: with flat defences late waves
  were pure dps and ARC spam won (63 alone vs 64 mixed), so armor and shields now keep pace with HP; dropping any one tower
  cost 3.5-10.5 waves; play style hardly mattered (appetite 20-80%, reserve 0-30 x wave, caps 12-30 all landed 66-74.5).
  10-09 first `trios.mjs`: **3 of 20 trios passed** (ARC+FRZ+SOL, FRZ+SOL+ACD, ARC+SOL+SOL); 10-10 the chart rework had
  dropped Corrosion's armor strip — restored (12/12 trio-style wins). 10-09 range x1.5 for three towers: three towers at
  x1.5 died ~28 waves earlier than six (curve.mjs). 10-11..14 the `waverep`/`countermx`/`swap`/`solo`/`stuck` batteries.
- **Game smoke (10-11)** "smoke tests for all basic features as commit hook": 17 checks -> 22 now; it exists because a
  trailing `//` comment swallowed `render()`'s else branch (blanked 2D and 3D's floor with no error).
- **File splits at the 500-line cap** (exec-fn's hook): `towers` -> `acid`, `skills` -> `frz`, `chart`, `stats`,
  `sliders`, `desc`, `game` -> `waves`, `floats`, `formations`, `ui` -> `chooser`, `wavelist`, `threat`, `draw` -> `lanes`,
  `effects`, `enemies`, `textcache`, `warp` -> `warplayers`, `fxgl`, `glctx`, `fog`, `solids`, `walls`.
- **Repo split (10-14):** `/aspira` lived in exec-fn's ARCHITECTURE.md §22 and `api/`, `web/`, `scripts/` until it moved to
  `wai-lau/spire` with history (`git filter-repo`); the parent consumes it as `apps/spire`.

## 11. Incidents and traps found the hard way

**Placement regression (10-02).** The price-doubling commit dropped `const b` from `placeTower` while `ring(..., b.color)`
still used it: every placement threw AFTER paying, placing mode never closed, the first tower never started wave 1.
ESLint's `no-undef` is off (these files share one global scope). The game smoke now covers it.

**The `//` mid-line comment, four times.** A `//` comment inside a line swallowed the rest of the line: 10-09 it commented out
the 3D slices' fade (found 10-14, `0607633`); 10-13 it commented out `gridCol`/`grid` in the bell shader so it failed to compile
and the 3D view went BLANK (`50bb95e`); 10-14 it ate `secs`, `frames`, `avgMs` from slow logs because of the version field's note
(`b4cd0d3`); 10-12 a sim comment swallowed a brace (`a417a78`); also `FLEET_TO_BOSS`'s transfer sat dead inside a comment from
10-11 to 10-14 and an inline comment swallowed the GL `blendFunc` call. A "lint-swallowed" check now flags it. Use `/* */` mid-line.

**A Spotter bug (10-06).** `towerStats`' old Spotter loop multiplied a tower's damage by any neighbour's `aura` — and a chart
FRZ's `aura` is its SLOW, so every tower inside a FRZ dealt ~a third (and the upgrade card showed FRZ 6 -> 2). The loop skips
chart towers; the simulator never saw it (its cached `towerStats` ran with `noAura`).

**Smaller ones.** A card's `Refract` row was swallowed by a `//` comment (10-06); mobile `mediump` blocky rings (highp where the
GPU has it, `6ad2f4a`); the boss sky flip flooded the 3D towers layer white (`9a95549`, `cc77beb`); a tower overlapping a
neighbour sat stuck 42 frames (now glides out 4x faster, `d2dd0fb`); the 3D core stole taps of towers behind it (`4b1feb0`); the
no-funds red stuck after one failed tap (class never removed; now a timer, not `animationend`); score lives were paid mid-wave
(`51ae3c7`); no enemy spawns with 0 HP (`547af47`, early swarms vanished — x0.225 HP left them at 0); the threat-ring script
loaded after draw code that called it (`729bcff`); `.asp-ov{display:flex}` beat the
UA `[hidden]` rule so the overlay never left; the iOS long-press magnifier / text selection cancelled the core's hold (hence the
prefixed `-webkit-user-select`); `Math.ceil` bounties made a cheap swarmer pay 1; the late-game
LAG from hundreds of pools each checking every enemy (bucketed `POOL_CELL`).

**Balance reversals worth remembering.** Wave-1 rule amended; ACD's ramp cap halved and RESTORED; "Lovers at 60% HP" reverted within
the hour; Moons' orbit "dont change moon orbits" reverted (meant all at the farthest); 4/5 moons -> 3; swarm lanes doubled twice;
Corrosion "eats armor again" (`b196869`); 10-13 goo strips 2x its drop (late armor leaks 14-21% -> 6-13%), then goo strength +60% a
tier (-> 1-6%); the cap on interest removed; the speed S-curve and HP hump (10-14); 10-14 ordinary enemies +0.3% faster a wave with HP
divided by the same, swarm bodies halved on the same lanes (x1.15 HP, x2 bounty, x2 leak).
