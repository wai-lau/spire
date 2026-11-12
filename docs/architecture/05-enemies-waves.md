## 5. Enemies and waves

### 5.1 Types (dice)

| type | die | pace | leak | design |
|---|---|---|---|---|
| swarm | d6 | fast-ish | 2 | many small bodies; wanders; HP, size and speed jittered per body |
| shield | d8 | slow | 1 | charges that each eat one hit whatever its size; **holds off every slow** |
| armor | d10 | slowest | 1 | the most armor (every type has some - `ARMOR_ALL`), scaling with HP |
| fast | d4 | fastest | 1 | a long tracer; takes every slow double |
| boss | d20 | base | 10 = game over | §5.4 |

Globals `ENEMY_HP_MUL` and `BOUNTY_MUL` scale the table (ARCHAEOLOGY §12). An enemy shrinks
with its HP and grows with log HP; dead enemies become invisible **ghosts** that drift on
so beams can follow them, removed at the core with no life lost.

### 5.1b The suits (design, 2026-10-16)

The bosses are the Major Arcana (§5.4); the four ordinary types are the four MINOR suits, read from Rachel Pollack's
*78 Degrees of Wisdom* (exec-fn `api/tarot/book/suits/`). The colours do NOT follow the elements: fast green, armor pink (owner, 2026-11-05: "swap armor and fast colors to match suits", then "swap fast and amor colors back, it doesn't look right" - the swap stood an hour, 7.6.23). Not yet shown in the game otherwise - where they surface (wave names,
the build-card symbols, the enemies' look) is open.

| type | suit | element | colour | why (Pollack) |
|---|---|---|---|---|
| armor | **Pentacles** | earth | pink | "the body ... the slow real things", "the discipline of years", building what lasts: slow, solid, worn down only with patience; the pentagon echoes the pentacle |
| shield | **Cups** | water | cyan | a vessel that holds, soaks and refills; conflicts "tender, slow, and inward", "soft erosions" - a shield eaten charge by charge |
| fast | **Wands** | fire | green | "will, drive, vitality", "carried by force of personal energy", "which direction to throw oneself" - a charge at the core |
| swarm | **Swords** | air | white | "struggle ... anxiety ... doubt", where "words and thoughts ... do their damage" - death by a thousand small cuts, too many thoughts at once |

### 5.2 Scaling (the curves)

Most curves read a wave as its **10-cycle equivalent** `eqWave(n) = n x 10/12` (the boss
cycle was 10 when they were tuned); `WAVE_COUNT_MUL` keys are real waves.

| Curve | Shape |
|---|---|
| HP | geometric growth to a knee at eq 20 (`HP_GROWTH`), on at `HP_LATE`, easing past eq 80 (`HP_END`: towers are built by then); x the type's hp |
| plain HP | steps up at waves 12 and 24 (`plainHpMul`), divided by the speed curve, with a **mid-game hump** on waves 48-72 (`MID_HP`); early shields lighter, early armor heavier, both x1 by eq 30; swarm waves x1.5 total |
| speed | an S-curve over waves 12..84 (`speedGrow`), a slow ramp after; every enemy +0.2% a wave past 49 (`speedRamp`) |
| shields / armor | charges a steep curve to a small power (`SHIELD_EXP`), HP compensating; armor the HP curve to a power (`ARMOR_EXP`), then tracking HP growth past 49 |
| late traits (49+) | swarms bring more bodies, fast run faster; **hybrids** from 97: swarms carry a little shield, fast a little armor (`e.aug`: the wave card's "late trait" row only - every enemy's outline is its own type's colour, owner 2026-11-05) |
| counts | a base of `10 + eqWave/2`, swarm x6, all /2, x `WAVE_COUNT_MUL` (waves 1-11 hand-tuned so one L1 tower clears them) x `TYPE_COUNT_MUL`; swarms double from eq 11 and again over eq 11-60; a swarm WAVE never under `SWARM_WAVE_MIN` 12; rounded to whole formations. EARLY: /`EARLY_X` 4 the bodies at x4 HP and x4 bounty through wave 24, easing to x1 by 36 (`earlyX`, `earlyHpX` - a wave the formations round back up gets that much less HP each); bosses untouched. WAVES 1-12 on top (`EASE_TO` 12): the count divisor x `EASE_N` 0.7 (under 1, so MORE bodies than the plain count, each at the early HP), the pay x `EASE_PAY` 2.912 instead (`earlyPay`: the old total over the new bodies), shield charges x `EASE_SH` 0.1, and no non-boss body under `EARLY_FLOOR` 45 HP (`spawnEnemy`; over the biggest non-SOL tier-0 hit, so none is one-shot) |
| order | swarm, shield, armor, fast on waves 1-4; from 5 a type by hash, never the same as the wave before |

### 5.3 Spawning and formations

Each lane copy spawns in order (swarm bodies close together, fast Vs `FAST_PAIR` apart, shield blocks `SHIELD_POD_GAP` a member,
armor's lattice at once); a boss arrives 2 s into its wave with its voice line. A formation is a
sideways offset and a head start laid across the lane at its heading, fading inside
`FORM_FADE_R` of the core.

| type | formation |
|---|---|
| fast | **Vs** of 5 (`V_N`: a leader, then pairs fanned back and out), then a V of 3, then singles - any count fits; the V **weaves** across its lane as it flies (`FORM_WEAVE`) (owner, 2026-10-29, the swap with the shields: "so that it makes it really hard for SOL to hit multiple") |
| shield | **2x2 square blocks** (`SHIELD_W` abreast, `SHIELD_N` a block, `SHIELD_PITCH` apart both ways); a lane's last block short and centred (owner, 2026-10-29: "shield becomes 2x2 lattice") |
| armor | one square lattice `ARMOR_W` 3 abreast, `ARMOR_PITCH` apart both ways (a boss's armor fleet `ARMOR_FLEET_PITCH`), a short last row centred; always whole rows over the lane copies |
| swarm | none: a wander (`e.jit`) that funnels in near the core |

### 5.4 Bosses

Waves 12, 24 .. 120 (`ARCANA`, each with a haiku above the title): the boss plus its fleet,
a little shield, armor 0, a size a step bigger than the last. HP = the wave's bonus HP x
`bossHpMul` (`BOSS_HP` x `BOSS_HP_K` x `BOSS_FAR`, Death x `BOSS_DEATH_K`) x the lane x `BOSS_HEFT` (ARCHAEOLOGY §12); the wave list
shows that same number. **Balance runs one way** (owner, 2026-10-28): the bosses to the towers, the towers to the waves (waves not
counting bosses). **The boss rule** (owner, 2026-11-03: "The answer to this is whatever makes the game more fun and engaging";
replaces the old "strongest / median trio needs 30 of 39 points" windows, which `trioplan` could not measure): the bosses-on good
model (`players3b.mjs`, 8 seeds) wins at least 15%, and no boss ends more than ~20% of the runs that reach it; a boss that leaks
costs lives without ending the run in 10-30% of them is the target, reported by `bossrep.py`, not a gate. A boss at the core costs
its HP% left in lives (a Lover half, a Devil copy a sixth, rounded up; owner, 2026-11-03), so with 18 lives a boss with more
than ~18% left still ends it.

**BOSS DEPTH** (owner, 2026-11-06: "make sure bosses just get to about 120% of a normal wave"; 2026-11-07 "3D"): each boss's HP (`BOSS_HP`)
is fitted on 100 bosses-on games so it gets about as far toward the core as the normal waves round it (the Star x1.2, the Chariot held at
x1.2 by the owner's "A"); the dated passes: ARCHAEOLOGY §5.

THE BOSSES (the order: owner, 2026-11-07 22:15 / 22:40; the tricks: 2026-11-05 redesign and 2026-11-07 22:30). "A wave" = `typeWaveCount(type, n)`:
a plain wave of that type at the boss's wave number, as `wavePlan` sends it (the count taper included). The fleet code lives in
`aspira-bossfleet.js` (loaded after aspira-bosses.js and its sky, `aspira-bosssky.js`). THE table: wave = its place in `ARCANA` x `STAR_EVERY`.

| wave | boss | trick | fleet | `BOSS_HP` | die (`BOSS_DIE`) |
|---|---|---|---|---|---|
| 12 | Star | none (needs two towers or an upgrade) | a 3 x 10 lattice of fast BEHIND her (`FLEET_LATTICE`, `latticeSlots` "behind") | 14.4 | d20 |
| 24 | Chariot | a smooth gallop, x(1.5 + 0.5 sin) over 1 s (`chariotPace`; a step until 2026-11-07) | fast + armor | 31.82 | fast's d4 |
| 36 | Strength | takes 10% of any slow (`BOSS_SLOW_K`); Temporal Drive still stops her; exempt from "no insane numbers" | the centre of a 3 x 12 armor lattice | 39 | shield's d8 |
| 48 | Lovers | a pair on opposite lanes; the core's ease does not slow them | one armor wave scattered like a swarm, half each (`FLEET_SCATTER`, `bossScatter`) | 21.4 | armor's d10 |
| 60 | Empress | a brood of `EMPRESS_BROOD_K` (2/3) of a swarm wave at 90 / 70 / 50% of her HP (`EMPRESS_AT`); VEILED while any of a brood lives | none | 5.5 | d20 |
| 72 | Judgement | killed, she rises ONCE at her lane's start at full HP with `JUDGEMENT_SWARM` (1.5) swarm waves' worth, even over `JUDGEMENT_LANES` (6) lanes at once, out in a swarm wave's time (`judgementSwarm`; owner 2026-11-10: "judgement boss is not fun, it takes toooo long for the swarm to finish spawning", "it should have 6 lanes", "count wise, maybe somewhere like 1.5>"), each body `BOSS_HEFT` x `JUDGEMENT_KIN_HP` tough, VEILED while any of it lives or is still coming, walking at 0.5x ("instead of 0.2 speed judgement should move at 0.5"); her second death is her last | none until she rises | 45.6 | cube |
| 84 | Justice | no hit takes more than 2% of her HP (`JUSTICE_CAP`); slowed | the crossing of a cross 7 across x 13 along, laid straight off the lane (each escort at most 40 u from its lane spot): 18 armor escorts with a shield escort's charges too | 14 | shield's d8 |
| 96 | Temperance | regenerates 6% HP a second (`TEMPERANCE_REGEN`) | the centre of a 3 x 12 shield lattice | 2.43 | armor's d10 |
| 108 | Death | none: a juiced-up Star (half slows, x1.1 speed) | FIVE LANES (owner 2026-11-09: "Death boss should have 5 lanes, 1 for each type, do not show lanes for non-boss"): a sixth of a plain wave of each type (owner 2026-11-11: fewer escorts on each lane), each on its own usual lane in its own formations, Death on hers; only her lane lights (`deathEscorts`) | 0.9 | d20 |
| 120 | Devil (the final boss) | six full bosses, two a lane on three lane copies (the second `DEVIL_TRAIL` 540 u behind); the reward paid once by the last | her HOST first: half a fast + half a swarm wave; the six are held (`devilGateShut`) till half the host has been on screen or died (`devilCount`) | 1.43 each | fast's d4 |

**The veil** (owner, 2026-11-07 22:30: "empress visually reduced in opacity, untargettable and invuln while swarm is up yes" / "judgement invuln and
untargettable while swarm is up"; `bossVeil`, `e.veiled`): the boss takes no damage and no tower targets her; she walks on, slower (`VEIL_SPD`: Empress
x0.75, Judgement x0.2), drawn at `ENEMY_VEIL_A` 0.35 with her HP number at the same fade; at the core she still costs her lives.

**Fleets**: at plain HP x `BOSS_HEFT` and plain bounty, at the boss's pace; **20% of every escort's HP moves onto its boss**
(`FLEET_TO_BOSS`; not Temperance, not Judgement's risen swarm); the fleet enters one unit at a time (`G.fleetQ`) and the
sky holds until all of it dies. Scattered escorts wander like swarmers (`jit`). No HP refit went with the redesign: bosses are out
of the sims (owner, 2026-11-05: "ignore bosses for sims for now / want to redesign bosses"). **Rewards**: +3 lives or +0.5% interest, the core's powers at 24 / 48.

**A boss at the core** (owner, 2026-11-03: "lets make bosses make you lose lives equal to the percentage of life left on the boss instead
of rhe losing the game instantly"): it costs its HP% left in lives, a Lover half, a Devil copy a sixth, rounded up, at least one
(`bossLeakLives`, `BOSS_LEAK_DIV`), and the game goes on. **Its HP shown** (owner, 2026-11-03: "start showing the hp% without the % on top of the boss"; 2026-11-07: "Lives lost, keep on the boss always"):
every boss body on the board shows ceil(HP% left), 0-100, white and outlined over it, faded while veiled (`drawBossHp`, aspira-threat.js) - each Lover
and Devil copy its own. Its ETA (`etaToCore`) counts the wave's clock
(`waveClock`: x3 till a tower reaches the wave) and what is left of its HP-bar hold, so the number and the threat marks come on time.

### 5.5 The boss sky

A colour **inversion** spreads from the core over 3 s when a boss warps in and collapses
back after the last boss-kin dies; the game **holds still while it turns**. The title
becomes the boss's name, its HP a long line along the horizon (`drawBossBar`; once flown in it is drawn on the 3D BOARD layer, under every tower effect - `bossBarOnBoard`, aspira-warplayers.js; the fly-in starts once the sky is full AND a boss stands on the board, and every boss body waits at its spawn until the second-to-last ring of HP pieces has slammed - `barHold`, page only); the next
wave waits for the sky to close. It costs nothing per pixel: 2D draws the frame in the
inverted palette (`withPalette`), 3D blends one triangle in GL (`warpFlip`); the
spreading sky is a triangle from the core (`skyTri`), clipped over the frame while it turns (`skyKeep`). **Towers keep their own colours.**
Before the spread, three white SPOKES grow from the core along the rays to the triangle's corners, out to the screen's edge
(`drawSkySpokes`, measured on the canvas they are drawn on). The triangle's shape is capped at `BOSS_SKY_RATIO` (3:2, height to top
side, either way): a flatter or taller screen gets an isosceles at that ratio, centroid on the core, the smallest that holds all four
screen corners (`skyLayout`), so its sides and top meet the edges a moment apart; within the ratio the sides pass through the bottom
corners and the top side runs along the top edge, meeting them together.

### 5.6 The four sections (difficulty design, owner 2026-10-22)

The waves fall into four sections, each with its own bar. A section passes when the sim's test holds over all 35 trios.

| waves | section | the bar | the sim's test |
|---|---|---|---|
| 1-24 | early | easy; the four types about equally hard | every type: the average trio loses ~0 lives, and the types break at the same HP multiplier (`breakpoint.mjs`) |
| 25-60 | mid | harder, beaten with good micro even upgrading at random | the random player (`randomAxis`) clears it with every trio |
| 61-96 | late | lost by random upgrades or bad tower synergy | the random player dies in it, and so do the trios missing a counter; a good trio played well lives |
| 97-120 | end | a coherent strategy, good micro, and every credit banked from interest spent | the player that spends all wins narrowly; one that keeps its bank (`econ: "hoard"`) loses |

Every type is as hard as every other against the average trio in each section (owner, 2026-10-21): a type most
trios beat comfortably is too weak, and is made harder - never the score. A forced-type game (`typepower.mjs`,
`typecal.mjs`: every wave one type, a boss wave an ordinary one of it) measures a type alone. The rewinding smart
saver saturates there (it won armor at 18/18 lives with HP x4 or no armor at all), so difficulty is read off the
greedy player's lives lost and the HP multiplier where it breaks. A second stat, KILL TIME (owner, 2026-10-22): each kill's time
still to walk to the core at the enemy's unslowed pace, averaged - the further out a type dies, the easier it is.

