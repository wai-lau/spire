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

### 5.x The boss order and table before the 2026-11-07 reorder, and the refit in progress (moved from ARCHITECTURE §5.4, 2026-11-08)

**BOSS DEPTH - REFIT IN PROGRESS** (as ARCHITECTURE carried it until the reorder refit shipped) (owner, 2026-11-06: "make sure bosses just get to about 120% of a normal wave"; 2026-11-07: refit four bosses on 100 games toward one normal wave): a boss's
HP is refit so it gets about as far toward the core as the normal waves round it, on 100 games. The Star stays at x1.2 a normal wave;
Strength, Chariot, Lovers and Devil are refit to about x1.0; Temperance, Justice, Empress, Judgement and Death are on the redesign
list (their mechanics change first). The refit numbers land with Balance's ship (ARCHAEOLOGY §12).

THE BOSS REDESIGN (owner, 2026-11-05: Wai's spec, verbatim in the 7.6.24-7.6.35 commits; "yes the boss mechanics should stay /
strength only takes 10% of any slow"). "A wave" = `typeWaveCount(type, n)`: a plain wave of that type at the boss's wave number, as
`wavePlan` sends it (the count taper included). The fleet code lives in `aspira-bossfleet.js` (loaded right after aspira-bosses.js).

| wave | boss | trick | fleet |
|---|---|---|---|
| 12 | Star | none (needs two towers or an upgrade) | a 3 x 10 lattice of fast BEHIND her (`FLEET_LATTICE`, `latticeSlots` "behind") |
| 24 | Empress | a whole swarm wave pours out of her past 2/3 and past 1/3 of her HP (`EMPRESS_STEP`, `EMPRESS_GAP`) | none |
| 36 | Strength | takes 10% of any slow (`BOSS_SLOW_K`); Temporal Drive still stops her | the centre of a 3 x 12 armor lattice (six rows of three ahead, six behind) |
| 48 | Chariot | sprints x3 for 1 s every 4 s, fleet with her | fast + armor (unchanged: not in the redesign) |
| 60 | Lovers | a pair on opposite lanes, no trick (the heal-and-run went) | one armor wave scattered like a swarm, half each (`FLEET_SCATTER`, `bossScatter`) |
| 72 | Temperance | regenerates 6% HP a second | the centre of a 3 x 12 shield lattice |
| 84 | Devil | six full bosses, two a lane on three lane copies (the second `DEVIL_TRAIL` 540 u behind); the reward paid once by the last | her HOST first: half a fast + half a swarm wave, loose on her three lanes like a swarm wave; the six are held (`devilGateShut`) till half the host has been on screen or died (`devilCount`) |
| 96 | Justice | no hit takes more than 2% of her HP; slowed | the crossing of a cross 7 across x 13 along: 18 armor escorts, each with a shield escort's charges too (`latticeSlots` "cross") |
| 108 | Judgement | killed, she rises ONCE at her lane's start at full HP and shields, with 1.2 swarm waves strewn behind her (`bossRise`, `JUDGEMENT_SWARM`); her second death is her last | none until she rises |
| 120 | Death | none: a juiced-up Star (half slows, x1.1 speed) | half a wave of each of the four types round her at once, packed ~3x tighter (`SCATTER_UK`) |

The reorder refit that replaced it (2026-11-08, bosses-on 100 games; the code comment at `BOSS_HP`): strength 6.44 -> 39, lovers 35.7 -> 21.4,
empress 11.02 -> 5.5, judgement 1.904 -> 5.7, justice 3.2 -> 14, temperance 4.76 -> 2.43, death 0.72 -> 1.79, devil 1.277 -> 1.43; chariot held
at 31.82 (x1.2, the owner's pick for a Chariot "still OP"). Depth ratios: Strength 0.92, Lovers 1.13, Empress 1.03, Justice 1.06, Temperance 0.85, Judgement 0.28, Death 0.79,
Devil 0.77.

