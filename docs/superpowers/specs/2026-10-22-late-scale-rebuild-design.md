# Late scale rebuild: no number past 9999

Spire (`/spire`, this repo). Owner: Wai. Written 2026-10-22 from the chat that led to it.

## Why

Late-game numbers stopped meaning anything to a player. Measured on three full winning games (2026-10-22):

| Wave | Biggest single hit | Armor enemy HP | Armor enemy armor |
|---|---|---|---|
| 10 | 180 (IFR) | | |
| 30 | 492 (SOL) | 802 | 12 |
| 60 | 821 (SOL) | 3.4k | 64 |
| 90 | 29k (GRV) | 50k | 982 |
| 120 | **53M** (CRR), 6.4M (SOL crit), 2M (GRV) | 400k | 5.7k |

Waves 1-60 read fine. Waves 90-120 jump x1,800 in thirty waves. Armor is a FLAT block per hit, so it has to grow with the
hits to matter, and every armor effect (SOL Breach, ACD Corrosion and its goo, FRZ Permafrost, GRV's strip) grows with it: a
Corrosion VI jet strips ~53k armor a second. Owner: "Numbers are too big doesnt make intuitive sense", "can we reign in all
numbers so that it doesnt get so exponential?"

## Goal

Rebuild the late scale so **the biggest single hits at wave 120 land just under 9999** (the owner's ceiling: "for a single big
hit 9999", "rebuild to new ceiling" - a natural top, NOT a cap that cuts hits off), with **HP and armor shrunk to match** and the
**game playing the same**: every tower as strong against every enemy type, at every point in the game, as it is now.

## Decided by the owner

- **Armor stays a flat block per hit** (never below 10% of the hit), so many small hits still bounce off armor and big hits punch
  through. Not a % reduction.
- **Ceiling 9999** for the biggest single hits, reached by rescaling, not capping.
- **Waves 1-60 keep their numbers.** Only the climb after that bends down.
- **Only HP, damage and armor.** Credits, interest, prices: untouched.
- **No armor floor** (bosses keep theirs, -1x the wave's armor). A floor for all was tried and reverted the same day.
- Armor was briefly discussed as "an armor enemy's armor = 100 armor units, denote everything in armor units"; the owner then
  chose this rebuild instead. Small, readable armor numbers late (hundreds, not thousands) are the aim.

## What must stay true (the measure of "plays the same")

- Each section's difficulty for the average team (`typecal.mjs` games, waves 61-96 and 97-120) as before the rebuild.
- Each tower's standing against each enemy type late (`countermx.mjs` / `marks.py` marks for waves 61-69, and `typepower.mjs`).
- Each tower axis's value (`axis.mjs`).
- The duo rule (any two different L1 towers clear waves 1-12 + Star losing no life) - untouched, waves 1-60 do not move.
- Measure all of these BEFORE the change (on a frozen copy of `web/`, `ASPIRA_WEB=`) and after; a drift past the sims' noise is a
  fix-up job, not a pass.

## Where the climb comes from (starting points, not a full list)

- Enemy HP: `hpPow` / `HP_END` / `HP_END_KNEE` (aspira-game.js), `plainHpGrow`, `plainEnd`, `HP_LATE_X` (aspira-defs.js).
- Armor: `armorGrow`, `ARMOR_HP_FROM`, `ARMOR_EXP`, `ARMOR_HP_EXP` (aspira-defs.js); `armorRefOf` (aspira-acid.js) is the wave's
  armor reference every armor effect leans on.
- Tower side: the late tier tables (x9 at V, x36 at VI on several axes - `ACD_CORROSION_DMG`, `ACD_SPRAY_MUL`, `SOL_FOCUS_DMG`,
  `SOL_REFRACTION_DMG`, ...), the capstone values in `aspira-capstone.js`, SOL's crit multiplier (x33 at VI), CRR's stacking
  (+70% per interceptor on a target), GRV's black hole growth.
- Flat armor effects in raw units: SOL `SOL_BREACH_ARMOR` (80 .. 3216 a hit, fixed - "dont scale breach with enemy armor",
  owner 2026-10-12), ACD Corrosion (a % of the jet's damage), goo (`DRIP_*`, already x the wave's armor), Permafrost
  (`FRZ_RIME_CRACK` x the wave's armor), GRV's strip.

## Calls made in writing this (not the owner's - check them)

- **The ceiling's statistic:** over the standard battery (every trio of the seven towers, the perfect player, waves 113-120), the
  99.9th percentile of single hits lands at or under 9999 and the largest hit is no more than ~2x that (a crit on a capstone may
  poke past; nothing reaches five digits by much).
- **The bend starts at wave 61, smooth** (no step at 60/61); 61-96 changes much less than 97-120, since that is where the climb is.
- **"Plays the same" in numbers:** per section, the average team's lives lost and break point within 5% of before; no build-card
  mark flips (`marks.py`) beyond the run-to-run noise of the same command run twice; each `axis.mjs` margin within 5%.
- **Tier ratios are not sacred:** a x36 at VI is a balance number, not a design rule; what is kept is each tower's STRENGTH at
  each stop of the game (the measures above), and nothing at stops bought before wave 61 changes.
- **Armor keeps its bite:** armor-to-hit ratios late stay what they are now (the flat block keeps doing to small hits what it does
  today); the "never below 10% of the hit" rule is kept.
- **Breach stays a FIXED number per tier** (the 2026-10-12 ruling) - just smaller, on the new scale.
- **No board split:** scores stay comparable because the game plays the same; the release is the 6.12.0 balance minor.

## Left to the builder

- The shape of the bend (one late scale factor on enemies and matching cuts on the tower side, or tier tables refit directly) -
  whatever keeps the measures above and the 9999 ceiling with the fewest moving parts.
- How Breach / Corrosion are re-expressed so their late numbers stay readable.
- Whether the descriptions in progress (ARC, FRZ, SOL, ACD done; CRR, GRV, IFR to come) need their numbers re-read after.

## Not in scope

- Credits, interest, prices.
- The early game (waves 1-60), the duo rule.
- New mechanics. (In flight separately and already in the working tree: the core twist, the SOL rework, the ACD pool changes.)

## Order with the other work in flight

1. This rebuild (on the working tree that already holds the core twist, SOL rework and ACD changes).
2. The type tune for sections 3-4 (waves 61-120; sections 1-2 are tuned and kept), the SOL strength fit, the ACD balance pass.
3. The per-section lane twist pass (the difficulty curve), the duo check, the build-card marks, one release.
