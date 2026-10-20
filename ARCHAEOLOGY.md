# THE SPIRE — ARCHAEOLOGY

Incidents, superseded designs, balance measurements and perf history: the "why it's like
this". The current design is in [ARCHITECTURE.md](ARCHITECTURE.md); **the top-level sections
below mirror its numbering** (§2 here = history of ARCHITECTURE §2, and so on; §0 is the
timeline; §12 the dated value snapshot; sub-numbers are local to this file). Created 2026-10-14 when /spire became its own repo (`wai-lau/spire`,
submodule `apps/spire`); rewritten the same day when ARCHITECTURE.md became a current-state
design document, and condensed to tables on 2026-10-15 (the dated notes it carried moved here).
exec-fn's own ARCHAEOLOGY.md holds no /aspira history. Sources: this repo's
`git log` (about 1,330 commits at 5.1.32, 2026-10-01 first) and the dated owner-command log that
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
slow logs, autosave, changelog card. 10-15 merged tiers (four buys an axis, shown I-IV) and the
`payoff.mjs` dead-buy pass. The shipped version stamp reads this back as majors: 1.0 the
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
strip shield"). Moons: cracked armor 10-11 -> removed 10-12 (its dead stat, `FRZ_HARD` and the per-type bite tables
dropped 10-14, `31a7cbe`).
The enemy-type "bite" (`FRZ_BITE_BY` fast 9, swarm 4.5, shield 1.3, armor 2) replaced the
speed-ratio bite 10-11 and was itself replaced 10-12 by "the colder the harder" (`FRZ_CHILL_K` 6,
"get rid of all enemy-based damage multis"). A shield was once immune to ticks, and FRZ ticks
ignored armor until 10-12. FRZ was a pure SUPPORT tower "by design"; its tick has ticked quietly. 10-14 Permafrost pulses twice as
often at half the slow and half the ring opacity (`FRZ_RIME_PERIOD` 2..1 -> 1..0.5, `FRZ_RIME` .04..22 ->
.02..11; "same frost a second, twice the rings", 4.3.27).
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
**10-15 merged tiers** (4.4.0-4.4.2): "merge upgrades 2-3 and 4-5 in one for each axis ... merge the prices
too" - a buy from I lands on III, from III on V, each priced as the two steps it is (`SKILL_STOPS` 0 1 3 5 6);
then "rename the upgrade levels ... fourth purchase is the capstone ... just use the number": the card, the
board triangle and the title show PURCHASES I-IV (internal 1 3 5 6; an old save's 2 / 4 reads I / II).
`payoff.mjs` (10-15) then priced each buy alone (gain, price, gain a credit) for the "fix dead buys and fix
underpriced stuff" pass.

**Chart price.** `SKILL_STEP_COST` x1.6 on 2026-10-15 (owner: the worst no-weakness trio should afford 100% of the upgrades with
perfect play and interest; `eco.mjs` found ARC+FRZ+ACD owning 109-287% of a max build at x1.5): a full chart at 40c went
~39,460c -> ~63,100c (17 steps, 4 .. 246.4 builds' worth).

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

### 4.6b GRV and ATC: the numbers and how they got here (2026-10-15..16)

Moved out of ARCHITECTURE §4.6b / §4.6c, which now describe the mechanics only. Values at 5.1.32 (the code is the truth).

**GRV constants** (`aspira-grv.js`; tiers 0, I .. IV, then the capstone as the sixth):

| Constant | Value |
|---|---|
| aura radius at starting mass, `GRV_AURA_R` (Void) | 68, 78, 88, 99, 109, 122 |
| aura slow at starting mass, `GRV_SLOW` (Void) | .12 .15 .18 .21 .24 .27, to `GRV_SLOW_MAX` .45 |
| nova reach, `GRV_NOVA_R` (Supernova) | 71, 85, 99, 112, 126, 139 |
| nova hit x the tower's `dmg`, `GRV_NOVA_MUL` | 1, 1.3, 1.6, 2, 2.4, 2.8 |
| pellets a second at starting mass, `GRV_PELLETS` (Radiation) | **6**, 7.8, 9.6, 11.4, 13.2, 15 |
| pellet hit x `dmg`, `GRV_PELLET_K` | .25 .32 .4 .48 .56 .65 |
| base unfed life `GRV_LIFE`; evaporation `GRV_EVAP` | 5 s; 2 / `GRV_LIFE` |
| radiation pacing `GRV_RAD_LIFE` | 1.6 (x0.32 of the linear hole's pace) |
| mass cap / gain a tower-hit of damage dealt | `GRV_MASS_MAX` 3 / `GRV_GAIN` 0.12; a merge adds the caps |
| radius cap `GRV_R_MAX` | 3 base auras |
| armor strip `GRV_STRIP` 1.5 x `GRV_AURA_K` 0.6 x mass a second, graded `GRV_STRIP_IN` 1.5 .. `GRV_STRIP_OUT` 0.5 | centre .. edge |
| slow rings | core = inner `GRV_CORE_FRAC` .47 of the radius, `GRV_CORE_MUL` 2.5 x the rim, to `GRV_CORE_MAX` .8; Event Horizon `GRV_HORIZON_SLOW` .9 |
| aura size from the nova | root of the nova's damage in tower hits, `GRV_GROW_MIN` 1 .. `GRV_GROW_MAX` 2.5 |
| Hypernova / Hawking | `GRV_HYPER_STRIP` .5, `GRV_HYPER_MASS` 2 / `GRV_HAWKING_N` 12 |
| timing | aura tick `GRV_TICK` .25 s, nova collapse `GRV_FRONT_T` .2 s, lead `GRV_LEAD_S` .5 s |
| pellets | speed `GRV_PELLET_V` 320, reach 1.4 x the aura, bundling past `GRV_PEL_SOFT` 80 in flight |
| pull and merge | `GRV_PULL_A` 45, `_D` 60, `_V` 110 (max speed), `_K` 1.6 (reach), merge ease `GRV_MERGE_S` .35 s |

Superseded: the spec (2026-10-15) had the nova's yellow front EXPANDING over ~0.25 s (it now collapses inward over 0.2 s), the
aura a damage-over-time (it deals none since the aura rework the same day), mass lost LINEARLY (a share of the starting mass a
second, an unfed hole ~5 s), the radius from mass only (the nova now sets it), pellets "~2 a second" at starting mass (6 now:
x3 once they could miss) and pellets that only hit; auras 40 .. 72 and novas 42 .. 82 (x1.7 when pellets could miss); the armor
strip x1 (x3, when GRV leaked 16% of armor, its own type); `GRV_GROW_MIN` .5 (1 on 2026-10-16: an empty nova still leaves a
hole); dmg 30 (24.38 from the trio scale, §4.6d). The first fit: rate 1.5 and dmg 30, the aura at .6, so a lone GRV
clears waves 1-11 and every pair is clean on 1-12 (`solo.mjs`; 20 / 0.5 lost 26 lives alone). Pellets passed shielded enemies
for one build (88% of shields leaked); fixed by letting them pop a charge, only the slow skips the shielded.
Counter matrix 61-69 spread (% leaked swarm/fast/shield/armor): GRV 2/26/88/14 before that fix.

**ATC (`car`) constants** (`aspira-car.js`; the capstone VI value in brackets where `aspira-capstone.js` adds one):

| Constant | Value |
|---|---|
| tower `dmg` / `rate` / `range` / leash (`MOVE_BASE`) | 15 / 4 / 160 (launch only; 130 until 5.1.32) / 240 |
| wing, `CRR_HANGAR` (primes from 5) | 5, 7, 11, 13 [17] |
| speed, `CRR_SPEED` | 1050, 1260, 1470, 1680 |
| reload, `CRR_RELOAD` | .75, .55, .4, .275 s; launch gap `CRR_GAP` .15 s |
| volleys a sortie, `CRR_AMMO` | 4, 5, 6, 7 |
| bolts a volley / together / side gap | `CRR_BOLTS` 10 / `CRR_BOLT_PAIR` 2 / `CRR_BOLT_SIDE` 6 u; the volley hits `CRR_VOLLEY_K` 2 x |
| hit spread | Armament `CRR_SHOT_MUL` 1, 2.6, 4.5, 7.5, 10, 12.5 [15]; Hangar and Launch each `CRR_SIDE_DMG` 1, 1.6, 2.4, 3.4, 4, 4.6 [5.1] |
| focus fire, `CRR_FOCUS` | 0, .15, .3, .45 |
| strafing pass, `CRR_RAM` | 0, 2, 4, 7 x base dmg x speed / 700; Warp `CRR_WARP_V` 2800 |
| orbit | `CRR_ORBIT` 75 u at `CRR_ORBIT_V` 400, jitter `CRR_ORBIT_JIT` .2, turn radius `CRR_TURN_R` 50 |
| interceptor reach | `CRR_LEASH` 7.4 x the range (about 960) |
| hop | `CRR_HOP` 30 u |
| hold | `CRR_HOLD_FRAC` 0, .25, .5, .75, 1 of the wing; `CRR_HOLD_R` 80 u +- 25%, size +- 15% |
| bolts | speed `CRR_BOLT_V` 900, fade `CRR_BOLT_REACH` 390, flies on `CRR_BOLT_ON` .08 s past a dead target |
| slow / numbers | `CRR_SLOW` .2 for .6 s, one a tower; the PIN `CRR_PIN` .3 on what an interceptor circles (held the whole time); one number a `CRR_NUM_HITS` 3 hits |
| Autopilot | `CRR_BURST_N` 10 pellets, `CRR_BURST_K` 1.5, speed 340, reach 90 |

Superseded: the spec (2026-10-15) had reach 260 (then 460, 330, 240 and 130 as owner moved range and leash; the leash was 0, then
130, then swapped to 240), interceptors that circled in a 30 u loop and each shot ammo 8 .. 16 small shots (three bolts a shot, then 4, 5 and 10 a volley with the volleys
halved; ammo 12 .. 28 before that) at speed 600 .. 1080 (x1.75 with the 460 range), `CRR_GAP` .2 (then .11, .25), `CRR_LEASH` 3
(then 4: the pursuit was never what bound), hop 40 (then 90, 20, 35), the hit 9 per shot (11.25, 15 with the trio scale), the
hit spread steeper than ARC's because an interceptor spends ~40% of a sortie flying and reloading (a mid build on ARC's tables
dealt 2192/s on fast at wave 61, ARC 17449, SOL 22899). Solo and pairs (`solo.mjs`): a lone ATC lost 2 lives on wave 9 and the
Star; every pair clean on 1-12. Counter matrix 61-69 spread (3 ATC, 8 points, % leaked swarm/fast/shield/armor): spread 1/6/0/0,
Launch 0/6/0/64, Armament 3/52/0/23; with three bolts, less ammo, x1.5 speed 29/30/0/30 (armor 982 a bolt at wave 90 against
~1750); at range 130 with the 100 u circle 24/6/0/9; later 25/0/0/15 at gap .15. Every bolt slows: fast 30% -> 6% leaked.

### 4.6d Trio scale, the rounds (2026-10-15..16)

Scores per round (`dmg`, was -> now; the factor squared each time):

| Round | Moves |
|---|---|
| 1-2 (before the ATC rework) | ACD 23 -> 30.03, ATC 9 -> 12.5, FRZ 15 -> 15.52, SOL 73 -> 68.61, GRV 30 -> 24.38; ARC left at 24 (factor x0.99; 22.96 lost the Star with ARC+ARC) |
| 3 (2026-10-16, after the ATC rework: orbit, volleys, range 130 and a 240 leash) | ACD 30.03 -> 34.32, ATC 12.5 -> 15 (11.25 in between, x0.9 with the new flight), FRZ 15.52 -> 16.68, SOL 68.61 -> 61.54; GRV and ARC left (x0.9 on GRV broke ARC+GRV and GRV+GRV on the Star) |

The first write-up called the third round "noise" (2 seeds swing a trio a whole game); it was run again with 3 seeds after the
ATC rework changed the ground under every trio, and it shipped. At round 2, ARC+ACD+ATC and FRZ+ACD+ATC lost every round: a
coverage hole (swarm and armor), not tower power. Scripts (this repo's `scripts/aspira-sim/`): `tribal.mjs` (all 20 trios), `triscale.py`
(scores and factors), `triodiag.mjs` (why a trio dies), `eco.mjs` (the price check below). Economy check that set the x1.6
`SKILL_STEP_COST` (2026-10-15, `eco.mjs`): the no-weakness trio ARC+FRZ+ACD owned 109-287% of a max build at x1.5 and 86-93% at x1.75,
and the owner's rule is that the worst one just affords a full build with perfect play.

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
74, `SLIDE_MAX` 2 -> 3). 10-13 auto-move (the simulator's mover at human speed; DQ). 10-14 auto-move glides 1.5x faster (`HUMAN_V` 300 ->
450), keeps its pace during Temporal Drive (`speedX()` read 1 in the freeze) and glides in GAME time - at 10x it
had crawled at a tenth (4.3.35, 4.3.37).

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
  10-14); fast 1.47 -> 2. 10-14 swarms a further 20% fewer at +-50% speed jitter ("just to make it easier for
  humans", no HP back; 4.3.28) and a swarm WAVE never under 12 bodies; armor waves x2 bodies at half bounty (4.3.29)
  -> x1.5 bodies at bounty 4/3 the next day ("armor waves seem a bit too strong now"; `waverep`, 4.4.1). Counts uncapped (10-11, "the R10 battery, cap 28 left the late game easy"). Early waves:
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
Keys: 1/2/3 speeds and U, Space, Tab (next wave), Esc, M; build shortcuts 1-4 removed ("by choice"). 10-14 the tower card's close became a square X right of the upgrade
button (it had its own close), a tap on the speed bar's empty part closes the open card or chooser, the stacked card
hides the "Targeting priority" caption (4.3.30); the Permafrost stat row names what it adds ("+11% slow, stacking")
and every mechanic has a card row (4.3.31-34).

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
  code") -> hand-kept `major.minor.tiny` (the third number renamed PATCH, semver, 10-19) + the build, clickable to the changelog card; 10-14 the card split into Buffs / Nerfs /
  Perf-UI groups (Perf-UI smaller) and the initials box stopped scrolling.
- **A minor per battery (10-19).** "Every group of changes that is the result of a balance battery run should result in a
  new minor version", then "stop doing the new day new minor thing" (a day is NOT a minor any more): the day 5.1 (10-16..18,
  patch 0-141) was split at each battery-result commit, 5.1.0-92 unchanged (first split 5.1-5.9 with a day minor 5.7, re-folded
  the same hour). Commit subjects and the slow logs keep the old numbers; the board's six affected rows were corrected through FIXES. The same
  day 6.0.1 (the 01:13 axis-balance battery) became 6.1.0 and 6.0.2-5 became 6.1.1-4 (no board row sat on a 6.0.x).

  | old 5.1.patch | new | battery-result commit |
  |---|---|---|
  | 0-92 | 5.1.0-92 (unchanged) | `b9327e5` trio scale (4.6.0), 16 of 20 trios |
  | 93 | 5.2.0 | `40fa8cf` late tiers steeper, 20 trios 3/3 |
  | 94-96 | 5.3.0-2 | `33c1462` Sol one shield charge a beam, 20 trios 3/3 |
  | 97-107 | 5.4.0-10 | `90b5cc0` difficulty band, 20/20 perfect, random 0/20 |
  | 108-113 | 5.5.0-5 | `514748b` late tiers evened per tower, 16 winnable 3/3 |
  | 114-125 | 5.6.0-11 | `310fe4d` ATC Tether pulses, 20/20 perfect, random 0/60 |
  | 126 | 5.7.0 | `3b7d5e8` axis balance, 16 winnable 3/3, random 0/60 |
  | 127-141 | 5.8.0-14 | `9129624` late balance, 20/20 perfect, random 1/60 |

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
  x1.5 died ~28 waves earlier than six (curve.mjs). 10-11..14 the `waverep`/`countermx`/`swap`/`solo`/`stuck` batteries; 10-15 `buildlog.mjs` (every capstone choice
  of one trio, each purchase by wave) and `payoff.mjs` (each axis buy alone: gain, price, gain a credit; reads a buy
  as a power multiplier).
- **Game smoke (10-11)** "smoke tests for all basic features as commit hook": 17 checks -> 22 now; it exists because a
  trailing `//` comment swallowed `render()`'s else branch (blanked 2D and 3D's floor with no error).
  `test_spire_sliders_browser.py`'s docstring still speaks of six slots and picks at waves 30 and 60 (pre-10-11).
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

## 12. Snapshot: the tuned numbers at 4.4.2 (2026-10-15)

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
| tracers | star 320, fast 120, shield/armor 80, swarm none; taper along the lane's curve |
| beams | last 2x their asked life at 2x brightness; width log of the hit (`BEAM_MIN` 0.4 + 1.6/decade, max 10) |
| core hit | the screen shakes 14 px over 0.35 s (re-armed, not stacked) with a shutdown sound |
| Temporal Drive rings | octagons on the floor, no `shadowBlur` |

Audio: 24 voices; shots 0.6, bosses / upgrades / builds 2, kills 0.4; volume 0-2.

### 12.13 Meta

TOP PLAYERS: `ASC_MAX` 6 posts an IP an hour, `SHOW_MAX` 500, a win `1 <= lives <= 100000`, wave 11..1000, a team of 1-5 kinds, `OWNER_SHOWN_FROM` 2026-10-14 00:00 ET. Slow logs every 180 s, 30 posts an IP an hour, 16 KB, 400 files kept. Smoke: 22 checks.
