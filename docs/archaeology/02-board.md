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

