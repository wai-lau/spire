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

- 2026-10-28, SOL's tier 0 plain again: 2026-10-26's "SOL should start with bouncing" had put the band, a split (`SOL_SPLIT[0]` 1) and
  the mirrors on a fresh SOL - owner: "SOL does all effects at the beginning again? I wanted tier 0 to be a minimal version of the tower
  with few effects", "for all towers". Now one beam, its first enemy alone struck (`st.pierce` 0, the spec's row) - and from 6.15.16 the same day it flies on straight past it to the
  play box's edge, striking no one (owner: "go straight even if there is nobody to hit"; 6.15.15 had stopped it at the enemy); the band, splits and
  prism are Diffraction's, the rod Scorch's. GRV's tiny void + pellets (2026-10-25) and IFR's burst of 6 (2026-10-26) at tier 0 were the
  owner's own later calls and stay - confirmed the same day ("keep GRV pellets and burst of 6"): they are those towers' base attacks, not stray effects. The same day the scorch rod's flare went x10 wide and x1.3 long, and its fade reversed:
  full at the tower, clear by the play box's edge (it had faded IN over 50 u, `SOL_ROD_FADE_U`). Later that day: ARC's tier 0 chains once ("ARC to chain once" - the spec's
  chainless bolt is gone, Conductivity I chains twice), CRR starts a sortie with 6 volleys (was 9; tier I 8) and shows a number a bolt
  (was one per three since 2026-10-16), and the boss sky's triangle is capped at 3:2 (a wide screen had made it a sliver several
  screens wide), its spokes measured on the canvas they are drawn on (measured on `cv` they stopped short in 3D).
- SOL's shot as it stood in ARCHITECTURE §4.4 before it became a table (6.17.3): the band / split / mirror design is the owner's of
  2026-10-26 (one beam fixed where it struck, no visual tracking the enemy, an enemy struck once a shot - "Get rid of piercing" the
  same day); the rod's flare is SOL's own copy of IFR's layers (x10 wide, x1.3 long, `SOL_ROD_V` u/s, full at the tower and clear by
  the play box's edge, 2026-10-28). Breach's parallel beams, 2026-10-28: "allow breach to add more _parallel_ beams that pierce, these
  beams don't reflect / Space them out, but never more than the width of the tower" (`SOL_PAR_GAP` 12, at `SOL_PAR_K` of the shot;
  `SOL_PAR_SHOW` 0.85 to the eye, "fainter, just a lil"). The flying-on beams were drawn only to the play box until 6.15.44 (owner:
  "SOL pierce should go all the way to the end of the screen, it is stopping early"); 6.15.9 had clipped them there to stop a far end
  behind the 3D camera flipping back past the tower.
- ACD as it stood in ARCHITECTURE §4.4 before 6.17.4: "pools from the start", Flow's pools slimy and slowing (`ACD_FLOW_SLOW`, moved
  from the jets to the pools 2026-10-22: "move slow from jets to pools"), and from Contagion I anything ACD killed leaving a full pool
  (2026-10-22). The tier redesign (2026-10-24) moved all of it: tier 0 one jet, no pools; the pools and their slow are Contagion's
  (Contagion I "Ray leaves slowing pool"); kill pools gone ("get rid of kill pools"). The doc had kept the older version until 6.17.4.


HOW THE TABLES ARE BUILT AND OLD SAVES READ (as ARCHITECTURE §4.2 carried it until 2026-11-08):

- Tables are written 0 + the old I..III; `aspira-capstone.js` appends V (`CAPSTONE_NUM`) and
  inserts tier I (`tierMid`); `aspira-tier01.js` then writes each tower's real tier 0 and tier I.
- An old save is read once one tier up (`SKILL_SCALE` 3; `skillScaleFix`, `OLD_TIER` for older).

THE §4 RENUMBERING (2026-11-08; an old cite reads as the new): 4.2b -> 4.3, 4.3 -> 4.4, 4.4 -> 4.5, 4.5b -> 4.6, 4.5 -> 4.7, 4.6 (the mark target) -> 4.8,
4.6b (GRV) -> 4.9, 4.6c (CRR) -> 4.10, 4.6e (IFR) -> 4.11, 4.6d (trio scale) -> 4.12, 4.7 (core) -> 4.13, 4.8 (dormant) -> 4.14. This file's own sub-numbers are local and unchanged.
THEN (step 5, the same day): GRV 4.9, CRR 4.10 and IFR 4.11 folded into §4.5 "The towers, one by one" (with ARC, FRZ, SOL, ACD, one shape each);
the capstone table of §4.6 split into each tower's paths table; trio scale 4.12 -> 4.9, core 4.13 -> 4.10, dormant 4.14 -> 4.11.

### 4.4-ter SOL's prism (2026-10-26 .. 2026-11-04)

The band's PRISM (`t.prism`, `drawBand` from drawAims): it widened from 0 as a new lock's first charge filled, a re-used one SWUNG to the
new aim (`SOL_PRISM_SWING` 4 rad/s) and came back to full over `SOL_PRISM_IN_S` 0.3 s, and with no lock it faded over `SOL_PRISM_OUT_S`
1.5 s (owner, 2026-10-26: "keep the prism rendered, instead slowly reduce the prism opacity ..."). Shown once a tower had a band (Diffraction
or Scorch). Removed from the draw (owner, 2026-11-04: "wait get rid of the prism for SOL"), ahead of the tracking beam's flip.

### 4.4-quater SOL's band model, as ARCHITECTURE described it until 7.6.0

Replaced by the tracking beam (owner, 2026-11-04; ARCHITECTURE §4.4). Verbatim:

**SOL** - one beam a shot, fixed where it struck; an enemy is struck once a shot. Armor cuts it like any other tower.
Its checks and weak spots are measured, not designed: the build card's marks (`VS_MARKS`, §4.6). The code: `web/aspira-sol.js`; how it got here: ARCHAEOLOGY §4.

| part | principle |
|---|---|
| lock | locks a target (held out to `SOL_HOLD`), charges the whole reload, then fires; a target dying mid-charge restarts it; a lost lock hands its charge only to a new target inside the shot's band (`inSolCone`) |
| plain beam (tier 0) | strikes its first enemy and flies on straight past it, striking no one - the minimal tower |
| band (Diffraction) | parallel walls either side of the line tower -> first enemy, out to the screen's edge; not drawn - the prism that showed it is gone (owner, 2026-11-04: "wait get rid of the prism for SOL") |
| split (Diffraction) | every hit splits to more enemies inside the band, each the next nearest to SOL and farther than the last, weaker than the hit before (`SOL_SPLIT`, `SOL_HOP`); a line ends under `SOL_END_K` of the shot |
| mirror (Diffraction) | a hit with no one to split to flies on to the band's wall and mirrors, angle in = angle out (at most `SOL_WALLS`), or leaves by the open end |
| scorch (Scorch) | every hit burns a stack of ticks, each stack on its own clock, one pop a tick (`solScorchTick`); the scorch rod sweeps out from the tower across the band and puts one stack on everything it crosses (`drawSolRod`) |
| breach (Breach) | every hit takes a fixed % of the armor left (`bleed` -> `shredPct`, `SOL_BREACH_ARMOR` per tier, Breach stacks multiply); parallel beams beside the first pass through every enemy in their line, never bouncing, spread no wider than the tower (`solParallel`) |
| reach | a beam flying on is drawn to the screen's edge; what it strikes ends at the play box (`solShowLen` / `solOutLen`), the same on every device |
| drawing | every beam thin; a section's opacity is the square of its share of the first beam's damage (`f.share`) |

| axis | buys |
|---|---|
| Scorch (id `focus`) | a LONGER burn (`SOL_SCORCH_N` ticks), never a hotter one; the rod from I |
| Diffraction (id `refraction`) | the band (`SOL_BAND_W`), the splits a hit (`SOL_SPLIT`, none at tier 0) and the carry (`SOL_HOP`) |
| Breach | the armor a hit strips (`SOL_BREACH_ARMOR`, none at tier 0) and the parallel beams (`SOL_PAR_N`) |

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

THE MARK TARGET's history - every owner quote, verbatim, as mark-target.json's `_` held it until 2026-11-07 (the one place they
live now; ARCHITECTURE §4.6 has the table, CLAUDE.md the rule):

THE MARK TARGET (owner, 2026-10-29 15:45, on this exact table: "woah, yknow what, this looks good ... save super important! priority #1"; earlier that day: "Save this mark target! It's very important!"): every type column is +2 +2 +1 +1 -1 -2 -3 (owner: "let's go for this instead" - one of the seven zero-sum shapes that allow 2+ checks a tower; a column with as many x's as checks is impossible), every row and column sums to 0, every tower checks two types or more, no two rows alike; IFR (-3) and CRR (-1) are bad vs armor by design (owner: "ARC and IFR by design are bad vs armor"; ARC's row became +2 vs armor at 17:35, below). The table was marktarget.py's nearest fit (distance 62.9) to the 82c67ad countermx (9 pts, 101-109 + 111-119, CRR top 1.8) under those pins, and the owner took it as is; then (16:05) "let's swap FRZ and GRV": FRZ +1 +1 -3 +1, GRV -2 +1 -1 +2 (the rows swapped, the columns unchanged); then (16:30) "swap SOL and ACD targets": SOL -1 -2 +1 +2, ACD +1 -3 +1 +1; then (17:35) "GRV takes FRZ targets / FRZ takes ARC targets / ARC takes GRV targets": GRV +1 +1 -3 +1, FRZ +2 +2 -2 -2, ARC -2 +1 -1 +2. Balance the towers to it; never edit VS_MARKS by hand. OLD (superseded the same day): shape +2 +1 +1 +1 0 -2 -3 with ARC armor +2 (ARCHAEOLOGY.md). Then (2026-10-30 ~18:10) the SWARMERS SHUFFLE (owner: "i want ARC IFR GRV FRZ to be the swarmers / Ideally in that order of magnitude", then "B ... aim for this"): ARC/IFR +2, GRV/FRZ +1 on swarm (the shape ties pairs, so no strict order), chosen as the table closest to the measured marks; 11 cells changed. Then (2026-10-31) the SOL and ACD rows swapped (owner: "Sol acd swap / No on arc grv"): SOL -3 +1 +1 +1, ACD -1 -3 +2 +2 - the rows nearest the 7.0.3 measured marks (total distance 26 -> 24); ARC <-> GRV, the other candidate, declined.

The 10-08 design matrix and the COUNTERS paragraph, as ARCHITECTURE §4.6 carried them until 2026-11-07 (OLD since the owner's
2026-10-29 "ignore all designs except mark"; its COUNTERS lists were already stale against the target):

| enemy \ tower | ARC | FRZ | SOL | ACD | GRV | CRR | the lever |
|---|---|---|---|---|---|---|---|
| **swarm** | MAIN | help | weak (one lock) | help | MAIN | weak (one target a volley) | branching hits; bursts; a void that feeds on a crowd |
| **fast** | help | MAIN | help | weak (cold jets) | weak (no time to feed) | MAIN | the chill bite doubles on fast; interceptors outrun them |
| **armor** | weak (grounds the arc) | help | MAIN | help | MAIN | weak (small bolts) | strip multiplies armor down (never below 0); armor scales with HP |
| **shield** | help | weak (no slow) | help | MAIN | weak (the slow skips them) | MAIN | pops a hit: ACD one a tick, SOL by Focus, CRR one a bolt |

The matrix is DATA: `COUNTERS` in `aspira-defs.js`: each type has a `main` that is a LIST of two kinds and a `help` list of two, DERIVED FROM THE MARK TARGET (main = a +2, help = a +1;
swarm `[frz, ifr]` / `[acd, grv]`, fast `[frz, crr]` / `[arc, grv]`, armor `[arc, sol]` / `[acd, grv]`, shield `[crr, ifr]` / `[sol, acd]`). The build card derives from it: `GOOD_VS` / `HELPS_VS` (SOL and ACD add bosses,
`BOSS_KILLERS`), and the symbol marks (`VS_MARKS`, §7.2) come from a `countermx` run (SPREAD_ONLY, 9 points, waves 101-109 and 111-119 since 6.16.0 - the command below, with the other four levels), so the card can never disagree with it. `scripts/aspira-sim/countermx.mjs`
measures it.

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

**ATC (`crr`) constants** (`aspira-crr.js`; the capstone VI value in brackets where `aspira-capstone.js` adds one):

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

### 4.6b-bis GRV as ARCHITECTURE described it before the 2026-10-25 rework (kept there until 6.17.5)

The 2026-10-15..21 tower: every fire one nova at `GRV_NOVA_K` (3x) the hit (three novas 2026-10-18 .. 21), every `GRV_BH_EVERY`-th
(3rd) leaving a hole with all three shots' mass (`grvBank`); the AURA opened from every hole, burned nothing, slowed in two rings and
stripped positive armor graded by distance (`GRV_STRIP_IN` / `GRV_STRIP_OUT`; `GRV_AURA_K` - both now defined but unused); the late
fire rate came from the deepest axis (`GRV_RATE_MUL`, owner 2026-10-18 "each axis still equally powerful"; countermx N=1 61-69 leaks
Void 16 / Supernova 1 / Radiation 1 %); Radiation was the pellets (Hawking: a last burst when a hole runs dry), Void the aura (Event
Horizon: 90% slow in a full hole's core), Supernova the nova (Hypernova: half the positive armor at once). The 2026-10-25 rework
(owner): tier 0 a void a shot, pellets at tier 0, Nova the novas and the strip, Void the void, Acceleration (id `radiation`, kept for
saves) the aura and the pellets' damage and range; "aura radius never exceeds 2x void radius". "GRV is support" (2026-10-21) gave the
aura its slow ahead (`GRV_AHEAD_K`) and the glide to the lane's centre (`GRV_LAT_V`). Pellets roll 25-400% each (`GRV_PEL_J`).

### 4.4-bis ARC and FRZ lines ARCHITECTURE 4.4 carried until 6.17.9

ARC's one hit set an attack is the owner's of 2026-10-28 ("reduce the number of arc hits", the 6.16.0 battery's cc67188); before
it Conductivity let a bolt return to a struck enemy from III (3 hits a tree at tier 0, 40 at the capstone). "No grounding
(reverted)". FRZ Permafrost's frost took armor PAST ZERO until the 2026-10-28 armor rework; Moons had "moonlets from the third buy"
(satellites since: owner, "satellites instead of moonlets").

### 4.6c-bis CRR and IFR as ARCHITECTURE described them until 6.17.8

CRR: "strong vs fast + shield, weak to swarm + armor"; the hold a quarter / half / three quarters / all of the wing by tier (now
0 / 0.125 / 0.25 / 0.75 / 1); EVERY interceptor tethered with a light slow, the pulse a real hit with Tether, Tether on to a
second enemy from tier I (`CRR_CHAIN_FROM`); one damage number per `CRR_NUM_HITS` (3) hits, summed - every bolt its own since
2026-10-28 ("Show damage for each CRR pellet"); the middle axis LAUNCH (tempo: speed, reload, the strafing pass `CRR_RAM`, the
leash; capstone Warp - teleport onto the target's circle), now Tether (id `launch` kept); capstones listed as IV.
IFR (owner's design 2026-10-19, "Kilika's hellfire."; axes redone 2026-10-20 - "axes don't feel unique nor impactful"): "strong vs
swarm + shield, neutral to armor, weak to fast"; the fan `IFR_FAN` 5 / 7 / 9 / 12 by Meteor tier, released after a 0.4 s bell
(sd 0.3, in [0, 1], x the root of the fan's size over 5); fan meteors a quarter size and speed, a fuse round 200 u (sd 50, 150 ..
300 u), straight for 50 u (`IFR_ARM_U`), hitting nothing for 100 u (`IFR_ARM_HIT_U`), homing within 50 u; Meteor's capstone Impact
FISSURED a fan hit into two at +-30 degrees (gone 2026-10-26: every meteor bursts into `IFR_FAN_N` 6, the capstone into
`IFR_FAN_CAP` 9, nothing splits again); the fire's ring `IFR_RING_HIT_K` 3x a fire flare's hit, its circle at 20% while it grows
and 10% after (`IFR_FIRE_A`, 2026-10-21), at least 16x the meteor, `IFR_FIRE_FLARES` 12 x density 1 .. 3, flares 0.3 s, all within
2 s; catching fire turned OFF 2026-10-20 ("don't require lit"); the Flare capstone's three flares within 10 u.

### 4.6c-ter CRR as ARCHITECTURE described it until 7.5.0 (2026-11-04)

The 7.5.0 rework (owner, 2026-11-04: "make CRR ready interceptors wait in orbit around the tower / when launching interceptors, launch from
orbit first, FIFO"; "interceptors should only start firing once they enter orbit"; "remove bolt slow"; "reduce the slow, so that it matters
to have multiple interceptors on a target") replaced these rules:

| Part | Rule until 7.5.0 |
|---|---|
| launch | one interceptor at a time on `CRR_GAP` (in the text long after the gap itself went, 2026-10-26) |
| hold | only a share of the wing by Hangar tier (`CRR_HOLD_FRAC`) was stored in orbit; the rest waited inside the carrier |
| firing | an interceptor fired on its way in, within `CRR_FIRE_R` 340, before it was round its target |
| bolt slow | every bolt slowed 20% for 0.6 s (`CRR_SLOW`, `CRR_SLOW_S`, one slow a tower) |
| tether | a slow of 0.35 / 0.45 / 0.55 / 0.65 (V 0.75) a tether, the chain read as the capstone's in the text (it is from tier II since 2026-10-18) |
| wing | 5 / 7 / 10 / 12 / 16 (V 20) interceptors |

The volleys as ARCHITECTURE 4.6c read them until 2026-11-06 (one bolt a volley since 2026-11-05, owner's "C10" for CRR's marks gap): `CRR_AMMO` volleys a sortie, each `CRR_BOLTS_BY` bolts (never above 3; owner: "volleys ... the number of bolts fired at once") leaving in the SAME frame side by side - the lead and its wings (`vk` 0 / -1 / +1). Three times the bolts at a third the damage (owner, 2026-10-29: "just 3x? keep the way shields are counted"): a sortie did as much and popped three times the charges; armor cut each small bolt (CRR's armor weakness). Armament bought "two bolts at once". Since C10 `CRR_BOLTS_BY` is the one bolt's damage x (0.65 / 1.3 at Armament 0 / I since 7.7.29); the V of wing bolts is draw only (`carBoltV`).

### 4.6d Trio scale, the rounds (2026-10-15..16)

As ARCHITECTURE 4.6d stood until 6.17.11: the owner's ask (2026-10-15: "scale all trios up and down for each winning group they are in
for a factor of how much better/worse they are"), the designed-death rule (2026-10-21: "trios designed to lose are the ones missing a
counter"), the list at 6.11 - nine: armor ARC+FRZ+CRR, ARC+FRZ+IFR, ARC+CRR+IFR, FRZ+CRR+IFR; swarm SOL+ACD+CRR, SOL+ACD+IFR,
SOL+CRR+IFR, ACD+CRR+IFR; fast SOL+ACD+GRV - and round 3 (shipped 2026-10-16 after the ATC rework): `dmg` ACD 34.32, CRR 15, FRZ 16.68,
SOL 61.54, GRV 24.38, ARC 24; GRV left alone (x0.9 broke ARC+GRV and GRV+GRV on the Star), ARC too (its factor ~x0.99; 22.96 lost the
Star with ARC+ARC). At the 6.16.0 marks the list is thirteen, ten of them missing fast (only ARC and CRR check fast).

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

The list ARCHITECTURE 4.6d carried from 6.16.0 until 2026-11-06 (marked OLD there from the 10-29 mark target on): fast FRZ+SOL+ACD, FRZ+SOL+GRV, FRZ+SOL+IFR, FRZ+ACD+GRV, FRZ+ACD+IFR, FRZ+GRV+IFR, SOL+ACD+GRV, SOL+ACD+IFR, SOL+GRV+IFR, ACD+GRV+IFR; shield ARC+FRZ+GRV; swarm ARC+ACD+CRR; armor SOL+CRR+IFR. At the 7.7.27 marks fast's ten swap FRZ for ARC (FRZ checks fast now, ARC does not), swarm's ARC+ACD+CRR becomes SOL+ACD+CRR and armor's SOL+CRR+IFR becomes FRZ+CRR+IFR. At the 7.7.42 marks (GRV checks fast) the fast list drops every trio with GRV - thirteen to seven: fast ARC+SOL+ACD, ARC+SOL+IFR, ARC+ACD+IFR, SOL+ACD+IFR; the others as at 7.7.27. At the 7.7.44 marks (SOL's doubled scorch slow, SOL checks fast) the fast list drops every trio with SOL - seven to four, one a type: fast ARC+ACD+IFR; the others unchanged. At the marks after 9bc3e76 (FRZ's chill bites by the speed it takes and caps at 8x td; GRV fast +1 -> 0 by the ranking) every trio with GRV comes back on fast - one to four: fast ARC+ACD+GRV, ARC+ACD+IFR, ARC+GRV+IFR, ACD+GRV+IFR; the others unchanged.

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

**SOL rework (2026-10-22).** Was: the pass-through `SOL_PIERCE[breach]` 35% .. 125%, 420 u on, 12 enemies at most; refraction hops inside
a light CONE off the first enemy (`solConeDir`, 3-12 degrees by tier), every enemy ahead in the cone at V, two opposite cones at VI; an
aim cone that swept in while charging; a breached death's SHRAPNEL breaching the enemies near it. Now: 100% through to the screen's edge on a
thin line, chained reflections at a compounding share, three chains at VI, a scorch on every hit. Also found: the description had said 1 2 4 8
12 rays while it fired 2 3 10 17 25.
**ACD (2026-10-22).** Flow's slow moved from the jets back to the pools (it had gone pools -> jets on 2026-10-12, "these rays could slow
instead of contagion"); kills leave pools only with Contagion, and then every ACD kill leaves a FULL pool (a pool kill used to leave one
0.8x wide and half as long, `ACD_SPREAD_R` / `ACD_SPREAD_LIFE`).

