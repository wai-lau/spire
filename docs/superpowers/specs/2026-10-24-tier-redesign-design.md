> **OLD (2026-10-29):** any mark target or marks plan in this document is superseded by `scripts/aspira-sim/mark-target.json` (the owner's table of 2026-10-29 15:45; CLAUDE.md "THE MARK TARGET").

# Spire tier redesign

Approved by Wai 2026-10-24. Living copy: the shared doc https://claude.ai/artifact/NY9mXnwaKvD3AztDkbdyjZ (rev 528); this file is its export.

## Why
A bare tower is too strong and upgrades are optional, so perfect play hoards. On 6.15.0 the best buy order for every one of the 35 trios beats Death with no life lost, after only 14 to 33 upgrades, and banks 0.8M to 3.5M credits.
- Upgrades come late. The first upgrade lands at wave 21 to 48 (median 35); 10 trios buy nothing by wave 40.
- Interest does the rest. Interest is uncapped and compounds at 2% a wave plus +1% from about half the bosses.
- Harder waves barely help. Twice the enemy HP from wave 13 only moved the median first buy from wave 35 to 29.
- Marks stall on numbers. ARC and IFR share a shape (good on swarm and fast, weak to armor). Four rounds of number tuning could not separate them, because a tower's job lives in how it attacks.

The redesign makes a fresh tower plain, makes every tower's identity something you buy, and ties raw power to how much you have spent.

## The tier ladder
Each axis gets two new rungs at the bottom: tier 0 is the plain attack and tier I is the first hint of the axis. Today's tiers I to IV move up one, so the capstone becomes tier V.

| Tier | What it is | Was |
|---|---|---|
| 0 | The tower as placed: a plain beam or circle, no mechanic | new |
| I | The first hint of what this axis does | new |
| II | Today's tier I | I |
| III | Today's tier II | II |
| IV | Today's tier III | III |
| V | The capstone; one tower holds one | IV |

13 points a tower. One axis to the tier V capstone (5 points) and the other two to tier IV (4 + 4). Only one capstone per tower, as today.

## Stat curve
A tower's damage, fire rate and range come from its total level alone, on one slightly steepening curve. Every point counts the same, whichever axis it buys.
- Total level = all points spent on the tower, 0 to 13.
- The curve rises a little faster the higher it goes, so late points feel strong without early points feeling wasted.
- Axes add mechanics first. They decide how the curve's damage is delivered: ARC's Conductivity spends it across jumps, Voltage splits it into forks, Capacitance stores it as charges. An axis may also nudge a basic stat (damage, rate or range) up to fine-tune the numbers, never down.
- One curve per tower, one lever per mechanic. This replaces today's stacked per-axis damage tables (ARC_SIDE_DMG, ARC_VOLTAGE_DMG and the like).

Open: the exact curve (its start, its end at 13, how steep), fitted in the sims.

## Per tower: tier 0 and tier I
All seven rows are reviewed by Wai (2026-10-24). Beam towers fire at one target; circle towers hit an area. (Wai's own words kept as written.)

| Tower | Tier 0 (as placed) | Axis 1, tier I | Axis 2, tier I | Axis 3, tier I |
|---|---|---|---|---|
| ARC (beam) | One single beam, no chain | Conductivity: one chain jump | Voltage: one fork | Capacitance: one charge |
| SOL (beam) | One beam that stops at its first enemy | Focus: the beam passes through one more enemy | Reflection: one bounce | Breach: a short burn that pops a shield |
| CRR (beam) | One interceptor | Hangar: one interceptor orbiting | Tether: one tethered drone | Armament: shots split in two |
| FRZ (circle) | A chill circle that slows | Sublimation: the chill hurts, more the slower | Permafrost: a frost pulse that cracks armor | Moons: one moon in orbit |
| ACD (circle) | An acid ray | Corrosion: hits eat armor | Flow: 2 rays + carries flow | New: Contagion: Ray leaves slowing pool (get rid of kill pools) |
| GRV (circle) | A nova that pulls inward | Void: add the black hole and armor strip | New: Nova: adds slowing aura | Radiation: adds pellets (need to be visually more intense and more useful) |
| IFR (circle) | A meteor that just hits | Meteor: a fan of two meteors | Hellfire: a small fire that rides its enemy | Flare: one flare at the impact |

## Economy target
A perfect player with perfect investing just barely affords all 39 points (3 towers x 13) by wave 119; no human gets there.
- The stand-in for a perfect player is the sim's trio search (scripts/aspira-sim/trioplan.mjs): a beam search over every buy, with checkpoint and rewind, branches that lose a life pruned.
- Today's gap is large. That search finishes with 0.8M to 3.5M credits banked after only 14 to 33 buys, so prices must rise steeply, income must shrink, or both.
- Levers, to be picked in the sims: the price ladder (SKILL_STEP_COST) and kill bounty. Interest stays uncapped, boss +1% drops included (Wai, 2026-10-24).
- The check: the trio search on every trio ends Death with all 39 points bought and close to 0 credits left.

## Rules that stay
| Rule | What it says |
|---|---|
| Duo rule | Any two different towers at tier 0 clear waves 1 to 12 and the first boss with no life lost |
| Marks target C | Rows and columns sum to 0, no two towers alike; ARC 0 0 +3 -3 (shield popper), IFR +2 +2 -2 -2 (crowd burner) |
| Two types each | Every tower beats or helps against at least two enemy types; fixed with balance, never by editing marks |
| One pop per tick | A shield loses at most one charge per tick or hit |
| No SOL fire rate | SOL's fire rate is never raised, not even in a sim |
| IFR flare sizes | Locked; never resized without asking |
| Types equally hard | Every enemy type is as hard as the others against an average team at each wave |
| Versioning | A balance battery's changes are the next minor version; anything else is a patch |

## Calls for the build
Claude's calls where the design was silent; each stands unless Wai changes it.

| Topic | The call |
|---|---|
| What a point is | One purchase = one tier on one axis, the capstone (V) included. 13 purchases a tower; placing the tower stays its own price and buys tier 0. The price ladder becomes 13 steps (was 17, the capstone two). |
| Tier 0 strength | Total level 0 is the bottom of the curve, below today's bare tower. The duo rule wins a conflict: waves 1 to 12 ease (every type alike, so types stay equally hard) until any two tier 0 towers clear them. |
| Per-axis tables | Counts and shapes (jumps, forks, bounces, pierce, moons, pools) stay hand-tuned per axis, one rung up. Damage, rate and range come from the curve. A stat nudge from an axis only raises a stat, never lowers it, and adds at most 20% over the curve. |
| Today's tiers | Today's I to IV keep their meaning one rung up (II to V). Where a new tier I hint matches today's I (Voltage's fork, Hangar's interceptor), tier I is the smaller version and II keeps today's. |
| New mechanics | In scope, judged by the sims: ACD Contagion (the ray leaves a slowing pool, kill pools gone), GRV Nova replacing Supernova (adds a slowing aura), Radiation's pellets made brighter and stronger. |
| Marks | Measured as today on spread builds at waves 61 to 69, at the point count a perfect player holds there under the new prices (about half of 13). The two-type rule is checked on that build, not at tier 0. |
| Close to 0 | The perfect player ends Death with under 10% of a full tower's price left. |
| Saves and board | The Ascendants board keeps every past entry. A saved run is read once with each old tier moved up one, plus tier I on every axis it had bought. The redesign ships as the next minor version. |

## Open questions (with Wai's answers)
- [x] Voltage I "a bigger hit" vs axes add no raw damage? -> An axis could add additional damage or a basic stat to fine-tune the numbers. Voltage determines forking, Conductivity determines chaining.
- [ ] A plain tier 0 tower is weaker than today's. Do waves 1 to 12 get easier to keep the duo rule, or may the duo rule bend? -> "let's see in sims"
- [x] Ship 6.15.1 first? -> ship (done: 6.15.1-6.15.4 live)
- [x] Correct the six drafted rows -> done
- [x] Cap interest or cut the boss +1% drop for the economy target? -> "keep interest uncapped"
