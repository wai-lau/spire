# THE SPIRE — ARCHAEOLOGY

Incidents, superseded designs, balance history and perf fixes: the "why it's like
this". Current design lives in [ARCHITECTURE.md](ARCHITECTURE.md); the sections
below mirror its numbering (§22 = the game). Created 2026-10-14, when /spire
became its own repo (`wai-lau/spire`, submodule `apps/spire`). exec-fn's own
ARCHAEOLOGY.md held no /aspira history, so nothing came from there. Source of
the later entries: `git log` of this repo (1,176 commits, 2026-10-01 first).

**Timeline.** 2026-10-01 `/aspira` born owner-only (star-chart board, build
disc, lanes through it to the core). 10-02 guest tier + nav entry, the big
overnight balance day (EXC -> SOL, six slots, fixed waves). 10-03/04 towers move
along spokes; renamed THE SPIRE for players, page at `/spire`. 10-05..06
simulator-driven bosses, perf rounds 1-3. 10-07 free core, five tiers an axis,
upgrade sliders. 10-08 +/- steppers, tier fits. 10-09 three towers; 3D view.
10-10..11 drag-the-towers, trios, Ascendants, 12-wave cycle. 10-12..14 GPU 3D
layers, slow logs, autosave, changelog card. The shipped version stamp reads
this back as majors: 1.0 the game (Oct 1), 2.0 skill charts, 3.0 3D, 4.0 the
three-tower game (`3cd5877`).

## 22a. Design that was tried and replaced

**The credits count on the core, five placements (2026-10-03..04).** A DOM stat
row first; then drawn on the canvas BELOW the core (`CREDITS_DY` 150, between the
bottom two slots' spokes - over the core it sat on the top slots' towers); then
a two-line "CREDITS / number" ON the hexagon; then one line over the core
"CREDITS 12,345" (the `c` suffix made gold, then un-gold-ed: "don't make it gold
unless already gold"); finally just the number, centred, after `drawCore`, white
with a dark outline. Lives/rings and the interest line moved with it each time.

**Tower RANGE: halved, then corrected to 75% (2026-10-04).** Towers started
moving, so ranges were halved (`RANGE_BONUS` 1.2 -> 0.6, Space/Expanse/Horizon
+100 -> +50, Ricochet hop 160 -> 80; L1 ARC 104 / FRZ 96 / SOL 172 / ACD 138).
Simulator: a lone FRZ leaked 0-6 on wave 1 (was 0), a lone SOL 11-15 (was 7-10),
the six-tower L3 team fell at wave 30 (was 40). The owner meant 75%: `RANGE_BONUS`
0.9, Space +75, hop 120, L1 ARC 156 / FRZ 144 / SOL 258 / ACD 207.

**Three corner slots (2026-10-05, dropped 2026-10-07).** A top-heavy triangle of
extra slots out of the core's corners, opening at waves 40 / 50 / 60 (later "the
last boss of their wave dies", with a "new slot unlocked" float and a white
flash). Dropped for six ring slots; `CORNER_SLOTS` is empty but the machinery
(`cellOpen`, `openCells`, `innerR`/`minR`, `drawSlotFlash`) stays in the code.
Six slots then became three (2026-10-09, `OPEN_SLOTS`), and `MAX_TOWERS` 3.

**ARC's deeper base tree (2026-10-02, reverted the same day).** ARC base 1->2->4,
7 hits a shot (`layers = 2`), hit damage x0.45 to compensate (a full shot 2.6
strikes' worth, was 1 + 2 x 0.8, now 1 + 6 x 0.8 = 5.8). The owner: the deeper
tree was meant for SOL, not ARC. Base back to 1->2 at full damage.

**Drag-to-rest (2026-10-03, removed).** A tower could be dragged to set its REST
point (`t.rest`, `setRest`). Removed within a day: with nothing to chase a tower
always returns to its slot, and a drag on a tower pans again. Towers MOVE came
the same day as sticky targets, predicted aim and eased motion after the owner
saw "a lot of jitter... not predicting" (`CHASE_HOLD` / `CHASE_LEAD` /
`CHASE_KEEP`); positioning then replaced chase-one-target (which walked away
from groups) with per-spot scoring (`aspira-positioning.js`, 2026-10-04) - the
first weights (targeting 0.3) barely mattered, so FULL targeting mix + urgency 6.
Drag came back on 2026-10-10 ("all of the towers can be dragged") as a teleport
with a leash from spawn, then span 1.5 -> 1 -> back to 1.5 on 10-11 while the
screen cap became the only limit (`a514fee` .. `a9bad04`: fixed zoom 0.5, 0.6,
0.72 tried in a day; the revert settled on the cap).

**Wave lists.** The swarm row went to one jittered line of diamonds and BACK to
the three-row lattice (`ea3d304`); rows were justified, then left-aligned, then
tessellated; the DOM boss-HP bar under the speed row became a line on the board.
`--fs-xs` never existed in chrome.css: every rule using it fell back to the
inherited size, which is why the tower-card stats "never shrank".

**Bosses, early.** Bosses were REMOVED (2026-10-01) and came back as "the old
star" every 10th wave (2026-10-02); fleets and escort swaps 2026-10-09 ("each
boss should come with a fleet of units, thematically"); only the Judgement
spreads its escorts over 12 lanes (`b9f0297`). "Bosses stay full size whatever
their HP" was tried and reverted (`6af7dcd`, 2026-10-12). Cycle 10 -> 12 waves
(`4c32c7b`, win at 120): every curve reads a wave as its 10-cycle equivalent.

**3D, 2026-10-09 (one day, four shapes).** Bell -> flipped-gravity-well funnel
("towers like angels dancing on the top") -> plateau + bell with flat sprites ->
isometric camera over a FLAT board (`WARP.depth` 0; "this is too fucked").
ARCHITECTURE.md §22 keeps the surviving entries; read them as an iteration log.

**Boss sky, rounds 1-4 (2026-10-05..11).** Draw the scene twice (once inverted)
with a second set of lane layers -> one draw + a CSS `invert` / full-canvas
`difference` fill (`skyFlip`, 10-09) -> no pass at all: 2D draws in the
inverted palette (`skyPal` / `withPalette`), 3D flips inside GL with one
`1 - dst` triangle (`warpFlip`, 10-11, "invert has huge cost"). Only the 3 s
spreading circle still uses `skyFlip`.

## 22b. Balance history

**Overnight 2026-10-02 (first simulator day).** Waves made FIXED (`fixedRand`),
ONE enemy type per wave, enemies halved at double HP, tower prices x2 per tower
(then x1.5 on 10-06), `TOWER_GAP`, defaults by role, many nerf/buff passes
driven by "the build search never picked X" (FRZ/ACD x1.5 dmg, x1.2 range; ACD
burn 12 -> 18/s; Ion and Array x0.8 after the top-30 search took ARC Ion and SOL
Array 29 times each; SOL 110 -> 88 -> range nerf 318 -> 239; ARC 28 -> 34). Wave
timer 10 -> 13 s. EXC was renamed SOL; ARC/SOL colours swapped and swapped back.

**Overnight tier fit, 2026-10-08 (`tierfit.mjs` on 1f4718ac, waves 40-70, 3
seeds).** Iteration 1: every axis tier fitted to the MEDIAN of all 12 axes'
measured curves - team damage 110 / 125 / 150 / 170 / 190% at I..V (a 125..300%
target needed absurd values for weak axes: Voltage x22, Breach 217 armor a hit).
Applied `ARC_VOLTAGE_DMG` 2.07 .. 6.79, `ARC_CAPACITANCE`, `FRZ_RIME`, `SOL_FOCUS_DMG`,
`ACD_CORROSION_DMG`, `ACD_SPRAY_MUL`, `ACD_PUDDLE_HEAT` .17 .. ; hand-set `SOL_HOP`
1 and `SOL_BREACH_ARMOR` 16 / 38 / 60 / 70 / 80 (both levers ran out: Refraction
reached only 133% even at 1.5x hops, since hops must go forward). Iteration 2
(drop-one-kind check): ARC REQUIRED (every mix without it lost, ARC+SOL 6/6) and
Judgement (90) the wall for every mix; Temp reach x1.08 .. 1.20, `SOL_BREACH_ARMOR`
16 / 49 / 101 / 174 / 200, `SOL_CONE_BY` 40 .. 60 deg, pool heat IV / V .10.
"No kind required": the fit cut ACD pool heat to ~15% and every mix WITHOUT ARC
lost (FRZ+SOL+ACD 0/6, swarm leaks 36-95 a game). Tried: FRZ tick 30 -> 45/60
(0/6), SOL refraction counts doubled (0/6), `ACD_PUDDLE_HEAT` restored to 1 ..
1.3 -> 4/6. Restored on purpose; iteration 3's contagion-slow fit was not applied
(the owner set that ramp, .25 at V).

**Axis refit and boss HP refit, 2026-10-07 (`chartvalue.mjs`, `bossbal.mjs tune`).**
ARC Voltage 142 -> 105 etc.; boss HP star 3.4 -> 2.7, empress 2 -> 3.4, strength
.9 -> 1.1; fast `TYPE_COUNT_MUL` 1.47 -> 2. The 2026-10-07 simulator sweep fixed
the curve with no core (16 scripted players) and found play-style appetite 0.5
winning every reserve. `bossbal.mjs` (2026-10-05) measures CLOSEST APPROACH
because a boss is one or a few bodies, so enemy-seconds mostly measure HP/speed.

**Pace changes.** Fast enemies: 135 -> 270 -> 220, hp 0.6 -> 1.0, slows count
double up to a cap (0.9 -> 0.99 -> 0.96, later derived from speed: 0.84 at
1.91x, `68e2f8d`, after fast enemies froze under stacked slows; a slow can never
fully stop an enemy, `f902400`). Then the 10-08 "one speed" rule (everyone 76,
FAST 1.5x). 2026-10-14: ordinary enemies +0.3% faster a wave with HP divided by
the same, swarm bodies halved on the same lanes (x1.15 HP, x2 bounty, x2 leak).

**Corrosion.** Armor stripping broke twice: "Corrosion eats armor again - every
three-tower trio winnable" (`b196869`, 2026-10-10; `trios.mjs` first measured 3
of 20 winnable); 10-13 goo strips 2x its drop (late armor leaks 14-21% -> 6-13%),
then goo strength +60% a tier (-> 1-6%).

**Other reversals.** Wave-1 rule amended (a lone SOL may leak a swarmer,
"a good way to learn not to use SOL first"); ACD's ramp cap halved to x16 then
RESTORED to x32 after `bossvs.mjs` showed SOL out-bossing ACD at every cap.

## 22c. Performance history

Rounds 1-3 (2026-10-04..05). Round 3 was profiled at 3x density because earlier
profiles ran at 1x and never waited for the canvas to raster, so they
undercounted; the canvas now caps at `RES_CAP` 2 device px.

**Late-game lanes, 2026-10-05 (9 L4 towers, wave 93, headless WebKit at phone
size; render 449 -> 43 ms a frame).** The lit LANES were ~83% of a frame: two
full-screen layers rebuilt each frame, every live spiral stroked three times (the
32-wide glow the costliest), the glow masked with full-screen gradient fills.
Fix: layers rebuild only when their signature changes, cached masks, glow only
inside `GLOW_PATH_R` 330. Left over then: enemies + shield segments ~34 ms,
damage numbers ~11 ms. WAVES 80-85 with all nine slots maxed (same day) showed
the real killer: DAMAGE NUMBERS aged in real time while the game ran up to 20x,
so thousands piled up (render 74 -> 585 ms); the hard `DMG_MAX` 120 cap brought it
to 16-52 ms.

**3D, 2026-10-09..14 (a week of frames).** Dice, prisms and projections cached
per frame, view drawn at 0.75 resolution, lane layers merged, then (10-12) slow
frames step quality down in order: far-detail radius to 600, board picture
2048 -> 1024, 3D view resolution 0.75 -> 0.5, trigger at 34 ms (a Brave sat at
36-40 under the old 40 trigger); glows never switch off. Two-layer 3D (board every
150 ms, moving layer every frame, `27dcf55`) -> GPU instance batches for hits,
beams, sparks, rings, coins (`8a8e289`, `2b83254`; late wave 89 ->) -> dashed
rings on the GPU, text stamped once, a stand-in 2D context so nothing on the
moving layer falls back to canvas (`0781e6c`, `7963fa9`). 2026-10-14: slow frames
stopped shrinking picture/resolution/density - only the far-detail radius comes
in (`bb8de72`). Safari has no canvas `filter` (it reads undefined) so every fill
on the moving layer took the canvas path (`5711f58`). Text stamps live on a 6M px
(~24 MB) budget, least-recently-used out first, evicted canvases zeroed so iOS
frees them (`146707b`).

**Acid pools** past 24 land hits with no flash/number and draw as plain circles
(`79fa1ca`); live sparks capped at 300 (a late swarm wave kept ~2,300). Full-dice
budget dropped: every die over 12 px stays 3D, under-12 px or past the 60 biggest
draw flat (`6d4031a`, `5b3e137`). Temporal Drive dropped `shadowBlur` (one 6 px
blur on an octagon ~8 ms a frame, the old five at 24 px ~34 ms) for one wide
faint stroke. Slow logs (`21234e3`, 2026-10-12) exist because of this: a session
posts a frame + audio summary every 3 min; they moved to `data/spire-perflog` so
deploys stop wiping them (`0fa17d5`) and gained 3D-pass splits (glMs, entMs).

## 22d. Incidents and traps found the hard way

**Placement regression (2026-10-02).** The price-doubling commit dropped `const b`
from `placeTower` while `ring(..., b.color)` still used it: every placement threw
AFTER paying, placing mode never closed, the first tower never started wave 1.
ESLint's `no-undef` is off (these files share one global scope). Lesson: verify
placement in WebKit after touching `placeTower`; the game smoke
(`scripts/spire-smoke/`, 2026-10-11, "smoke tests for all basic features as
commit hook") now covers it.

**The `//` mid-line comment, three times.** A `//` comment inside a line swallowed
the rest of the line: 2026-10-09 it commented out the 3D slices' fade
(found 10-14, `0607633`); 2026-10-13 it commented out `gridCol`/`grid` in the bell
shader so it failed to compile and the 3D view went BLANK (`50bb95e`); 2026-10-14
it ate `secs`, `frames`, `avgMs` from slow logs because of the version field's
note (`b4cd0d3`); 10-12 a sim comment swallowed a brace (`a417a78`). A
"lint-swallowed" check now flags it. Use `/* */` mid-line.

**Smaller ones.** Mobile `mediump` blocky rings (highp where the GPU has it,
`6ad2f4a`); the boss sky flip flooded the 3D towers layer white (`9a95549`,
`cc77beb`: towers drawn straight in flipped colours instead); a tower overlapping
a neighbour sat stuck 42 frames (now glides out 4x faster, `d2dd0fb`); 3D core
stole taps of towers behind it (`4b1feb0`); the no-funds red stuck after one
failed tap (class never removed; now a timer, not `animationend`, which a
throttled tab never fires); score lives were paid mid-wave and now wait for the
wave's last boss (`51ae3c7`); no enemy spawns with 0 HP (`547af47`, early swarms
vanished); the threat-ring script loaded after draw code that called it
(`729bcff`).
