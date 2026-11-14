## 4. Towers, continued (4.6-4.11)

### 4.6 The capstones (tier V, one axis a tower)

Wai's picks of 2026-11-06 (memory `capstones-2026-11-06`), built and screened tower by tower by Balance, shipped 7.7.88 .. 7.7.112; the card
lines are `aspira-desc.js` (audited against the code 2026-11-07). A capstone is a MECHANIC on top of the tier table's leap - each tower's three are in its paths table (§4.5) - (`CAPSTONE_NUM`,
aspira-capstone.js); its knobs:

| tower | axis -> capstone | what it does | knobs | file |
|---|---|---|---|---|
| ARC | Conductivity -> Grounding | each chain's last jump bursts on every enemy within 40 u, at that jump's hit; a white ring | `ARC_GROUND_R` | aspira-arc.js |
| ARC | Voltage -> Storm | every 5th strike forks 3 ways; the rings spin up and flash | `ARC_STORM_EVERY`, `ARC_STORM_FORK` | aspira-arc.js |
| ARC | Shock -> Superstorm | a Shocked enemy that dies passes its Shock (time refreshed) to every enemy within 80 u, a zap to each | `ARC_SHOCK_PASS_R`, `ARC_PASS_DEPTH` | aspira-arc.js |
| FRZ | Fracture -> Zero Point | the fracture lingers 2 s after an enemy leaves the aura | `FRZ_LINGER_S` | aspira-frz.js |
| FRZ | Permafrost -> Ice Age | a fully frosted enemy is frozen solid 0.5 s, once per 6 s each (bosses cut like slows, `bossSlowMul`) | `FRZ_DEEP_S`, `FRZ_DEEP_CD` | aspira-frz.js |
| FRZ | Moons -> Constellation | no mechanic (Wai: keep the moons) | - | - |
| SOL | Scorch -> Solar Flare | each shot's first enemy hit leaves an IFR flare in SOL's colour, burning as IFR's untaken flare; at most 4 live a tower | `SOL_FLARE_SHARE`, `SOL_FLARE_MAX` | aspira-sol.js |
| SOL | Reflection -> Corona | each of the 8 splits splits again into 2, to the screen edge (24 beams) | `SOL_SUB_SPLIT` | aspira-sol.js |
| SOL | Breach -> Starfire | look only: the Breach marker drawn as a blade | - | aspira-solids.js, aspira-sol-body.js |
| ACD | Corrosion -> Oblivion | a corroded enemy takes x1.2 from EVERY tower for 0.5 s after its last acid (one timer, never stacking) | `ACD_CORR_TAKE`, `ACD_CORR_TAKE_S` | aspira-acid.js |
| ACD | Flow -> Monsoon | no mechanic (the table's leap: 11 jets) | - | - |
| ACD | Spill -> Extinction | a pool that drops over another joins its LAKE: x1.25 burn within 149 u of the lake's first pool; drawn as one body (`drawLake`) | `ACD_LAKE_K`, `ACD_LAKE_R` | aspira-acid.js, aspira-acid-draw.js |
| GRV | Void -> Event Horizon | each crush kill grows the void x1.1, to x1.5, fading back over 3 s | `GRV_EH_GROW`, `GRV_EH_MAX`, `GRV_EH_FADE` | aspira-grv.js |
| GRV | Nova -> Hypernova | every 4th nova rings twice, the 2nd ring x1.5 the reach (same hit rules); a white flash | `GRV_SUPER_EVERY`, `GRV_SUPER_R` | aspira-grv.js, aspira-grv-draw.js |
| GRV | Gravity Well -> Undertow | an enemy in the aura nearer the core (`coreXY`) than the tower is reeled back along its lane to the void's centre over 0.6 s; each enemy at most once every 4 s, whichever GRV reels it | `GRV_REEL_T`, `GRV_REEL_CD` | aspira-grv.js |
| CRR | Hangar -> Warp Drive | the way out at `CRR_WARP_V`, invisible: opacity 1 -> 0 over `CRR_WARP_FADE_S` at launch, 0 -> 1 from the drop-out `CRR_WARP_END` radii short of the target; no trail while in warp (owner, 2026-11-09: "no retarget / instead, warp drive / when an interceptor is needed, quickly fade opacity to 0, increase fly-to speed to 3000, then when the interceptor is near enemy (just before starting to turn to face them) face opacity back to 100") | `CRR_WARP_V`, `CRR_WARP_END`, `CRR_WARP_FADE_S` (look) | aspira-crr.js, aspira-crr-draw.js |
| CRR | Tether -> Anchor | no new mechanic: the tether runs on to one more enemy (as before) | - | aspira-crr.js |
| CRR | Armament -> Autopilot | bursts into 4 pellets (x1.125 td; 10 until 2026-11-13) whenever it heads home | `CRR_BURST_N`, `CRR_BURST_K` | aspira-crr.js |
| IFR | Meteor -> Impact | every 3rd charged meteor is big (drawn x2, hitbox unchanged), its first hit x4 | `IFR_BIG_EVERY`, `IFR_BIG_HIT_K` | aspira-ifrit.js |
| IFR | Hellfire -> Hellfire | a fire that tracks its enemy wears two burning chain rings (0.85 and 1 of its circle) turning opposite ways; each burns what its band touches like a flare, at the fire flare's hit x `IFR_CHAIN_K` | `IFR_HF_RINGS`, `IFR_CHAIN_K`, `IFR_HF_RING_TURN_S` (look) | aspira-ifrit.js, aspira-ifrit-draw.js |
| IFR | Flare -> Mega Firaga | one flare a landing plus a flare ring 60% up its spokes (its own hit); flares at most 300 across | `IFR_V_SPAN` | aspira-ifrit.js |

The smoke's capstone crash sweep (`pins.mjs`) runs all 21 on the board with every core power; the numbers' dated snapshot is ARCHAEOLOGY §13.10.

### 4.7 Rules every axis obeys

| Rule | |
|---|---|
| no tier lowers a stat | pillar 4; `ACD_SPRAY_MUL` floored at 1 |
| a tier's words | change only when behaviour changes (§7.3) |
| debuff credit | damage a debuff adds goes to the tower that caused it (`damageCredit`) |
| armor shred | EVERY strip is a % of the CURRENT armor (owner 2026-10-28: "all strip should be changed to a % not a flat number"; `shredPct`, per-tier tables, the same at every wave), so strips multiply toward 0, never below; `SHRED_MAX` 0.9 stays as a safety. The goo keeps `shredArmor` (its drop is a fixed share of the wave's armor reference). No negative armor, no "shredded takes extra" |
| 10 s at most | no effect on the board outlives `EFFECT_MAX_S` 10 s - GRV holes, the Orbital Relay; ACD pools `POOL_MAX_S` 5 s, goo `GOO_MAX_S` 30 s (owner, 2026-10-18). Debuffs ON an enemy (Breach, Corrosion's strip) are outside the rule |
| tier names | one a tier (Transfer .. Hyperstorm, Chill .. Zero Point, ...), used on the end screen, never on the card; ARCHAEOLOGY §12 |

### 4.8 The mark target (pillar 6)

THE MARK TARGET (owner, 2026-10-29 15:45: "save super important! priority #1"; its history and every owner quote: ARCHAEOLOGY §4.6) is
`scripts/aspira-sim/mark-target.json`; the towers are balanced TO it, never the other way (`VS_MARKS` is never edited by hand;
`marktarget.py` runs again only on the owner's word). Each tower's mark a type, -3 .. +2 (generated from the json, 2026-11-07):

| tower | swarm | fast | shield | armor |
|---|---|---|---|---|
| ARC | +2 | -2 | -2 | +2 |
| FRZ | +1 | +2 | -1 | -2 |
| SOL | -3 | +1 | +1 | +1 |
| ACD | -1 | -3 | +2 | +2 |
| GRV | +1 | +1 | -3 | +1 |
| CRR | -2 | +2 | +1 | -1 |
| IFR | +2 | -1 | +2 | -3 |

Every type column is +2 +2 +1 +1 -1 -2 -3, every row and column sums to 0, every tower checks two types or more. **The target is the goal**: ARC is +2 vs armor (owner,
2026-11-07: "go by the target marks, ARC wasn't designed to be good against armor, but got here balancing the target marks. so ARC should
+2 armor now"; the older "ARC and IFR by design are bad vs armor" is history, ARCHAEOLOGY §4.6) - who is weak to a type reads off the
table (vs armor: IFR -3, FRZ -2, CRR -1). The old counter table is archaeology (owner, 2026-11-07: "counter table is archaeology, target
marks is the goal"). `COUNTERS` (`aspira-defs.js`) is DERIVED from it - `main` = the +2 cells, `help` = the +1 cells: swarm `[arc, ifr]` /
`[frz, grv]`, fast `[frz, crr]` / `[sol, grv]`, armor `[arc, acd]` / `[sol, grv]`, shield `[acd, ifr]` / `[sol, crr]` (checked 2026-11-07) - and
the build card's `GOOD_VS` / `HELPS_VS` derive from `COUNTERS` (SOL and ACD add bosses, `BOSS_KILLERS`). The card's symbol marks (`VS_MARKS`)
are MEASURED, a `countermx` run at 9 points (`scripts/aspira-sim/countermx.mjs`, the command below); the old design matrix: ARCHAEOLOGY §4.6.

**THE MARKS AT FIVE POINT LEVELS** (owner, 2026-11-06: "1B, but also add a 0 point and 3 point check", then "most important marks are 9 and 13,
but 0 3 and 6 should never drift more than +/- 1 point away from target marks"; 2026-11-07 "1C": the 0-point band loosened to +/-2). Every balance patch runs all five against the mark target:

| points | what it is | marks.py | the bar |
|---|---|---|---|
| 9 | the card's marks (spread builds) | `--write` | the first target: written into `VS_MARKS` |
| 13 | each axis maxed in turn (V + IV + IV), averaged a tower | `--focus --band --band-total 2` | the second target (the capstone check): every cell within 1 of the target AND a tower's summed gap (the sum of each type's distance from its target) at most 2, else `RULE FAIL` (owner, 2026-11-10: "hey for 13 points, allow up to +1 on any type (up to total of +2)") |
| 3, 6 | the early and mid game | `--band` | every cell within 1 of the target, else `RULE FAIL` |
| 0 | the opening (tier 0 towers) | `--band` | every cell within 2 of the target, else `RULE FAIL` (owner, 2026-11-07 "1C") |

The windows follow the good model's tower points by wave (median 3 at wave 60, 5 at 80, 8 at 100-110); the owner set the five levels and the
bands, not the windows. All five in one go: `scripts/aspira-sim/marks5.sh`. By hand, from `scripts/aspira-sim`, with
`KINDS=arc,frz,sol,acd,grv,crr,ifr` and 2 seeds. `N=1` (one tower of a kind) at 0 / 3 / 6 / 13: three towers clear the early windows at
~0% leak and nothing ranks; 9 points keeps the default `N=3`:

| points | command |
|---|---|
| 0 | `SPREAD_ONLY=1 N=1 POINTS=0 WINDOWS=9-19 node countermx.mjs 2 > m0.out && python3 marks.py m0.out --band` |
| 3 | `SPREAD_ONLY=1 N=1 POINTS=3 WINDOWS=55-65 node countermx.mjs 2 > m3.out && python3 marks.py m3.out --band` |
| 6 | `SPREAD_ONLY=1 N=1 POINTS=6 WINDOWS=81-89 node countermx.mjs 2 > m6.out && python3 marks.py m6.out --band` |
| 9 | `SPREAD_ONLY=1 POINTS=9 WINDOWS=101-109,111-119 node countermx.mjs 2 > m9.out && python3 marks.py m9.out --write` |
| 13 | `N=1 POINTS=13 WINDOWS=111-119 node countermx.mjs 2 > m13.out && python3 marks.py m13.out --focus --band --band-total 2` |

### 4.9 Trio scale and the designed deaths

Every trio is played to wave 120 by the smart saver (perfect play, both powers, a few seeds: `tribal.mjs`); a trio's score = 120 +
lives left on a win, else the wave reached. A **designed death** is a trio MISSING A COUNTER: no tower in it has a check (a
build-card mark above 0, `VS_MARKS`) on some enemy type. `triscale.py` reads the list off the marks, so it moves with every marks
refresh. One that DIES is neutral; one that wins counts like any other. A kind's factor = the geometric mean, over the trios it is
in, of (mean score / trio score), applied to `TOWERS[k].dmg` and squared to converge faster. **Every other trio is winnable; the
designed deaths are the exception** (pillar 2). `triodiag.mjs` shows why a trio loses (per enemy type: lives lost and closest
approach). The rounds, their numbers and the dated lists: ARCHAEOLOGY §4.6d; the tooling, §10.4.

The list, read off the marks (`VS_MARKS`, `aspira-chooser.js`) as they stand after FRZ's chill by speed (9bc3e76) (recompute after every marks refresh; the older lists: ARCHAEOLOGY §4.6d) - seven, four of them fast:

| Missing | Trios |
|---|---|
| fast | ARC+ACD+GRV, ARC+ACD+IFR, ARC+GRV+IFR, ACD+GRV+IFR |
| shield | ARC+FRZ+GRV |
| swarm | SOL+ACD+CRR |
| armor | FRZ+CRR+IFR |

### 4.10 The core and its two powers

The core is **free**: no price, no tiers. Bosses hand its powers out outright at full
strength (`CORE_GRANTS`); the pick flow is dormant. Buttons bottom-left above the speed bar, in their own
`.asp-powerdock` (`aspira-powers.js`; owner, 2026-10-31: "Move ability buttons to bottom left"), each with a recharge bar; the dock
inverts with the boss sky, lifts the tower card and passes a press on a tower through like the other overlays; **cooldowns count waves sent**.

| Power | Granted | Use | Effect | Rules |
|---|---|---|---|---|
| **Temporal Drive** | 2nd boss (wave 24) | hold the core, or the button | every enemy stops dead (a 100% slow, `core:time`) for 6 game s; cooldown 3 waves | holds the wave clock and spawns; needs a live board and ends when it empties; Strength ignores it; stacks with the Relay (either fires while the other runs) |
| **Orbital Relay** | 4th boss (wave 48) | the button then a tower, or drag the core onto one | that tower acts as five (`RELAY_MUL`, `relayStats`: x`RELAY_MUL` each: ARC its attacks, SOL its targets, ACD its jets, FRZ its moons, targets and tick, GRV its rate, CRR its wing, IFR its charge and rate) for 10 s (`EFFECT_MAX_S`); cooldown 4 waves | **stays on that tower**; arming pauses the game |

### 4.11 Dormant code (kept on purpose; nothing reaches it)

| What | Where |
|---|---|
| the path/form tree | `aspira-upgrades.js`, `LVL_*`, `STEP_COST`, the `UPGRADES` chooser branch (`sim.mjs` still builds on `UPGRADES`) |
| corner slots | `CORNER_SLOTS`, `G.opened`, `drawSlotFlash` |
| the core's pick flow | `CORE_PICKS`, `grantPick`, `pickPower` |
| the old power bar | `POWERS`, `usePower`, `G.charge` |
| Kepler moon orbit | `MOON_ECC` 0 = a circle |
| boss trait tables | `BOSS_ARMOR` / `BOSS_SPEED` / `BOSS_SHIELD*`, neutral except Justice's speed |
| ARC's unused tables | `ARC_STAT_SLOW`, `CAP_BURST_K` (the Static charge's, removed 2026-11-09; still listed by `aspira-capstone.js`); the path tree's Static mark (`e.charged`, `staticDischarge`) goes with the path tree |

