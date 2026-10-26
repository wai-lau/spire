# The Spire - card wording guideline

How a tower card talks: the description sentence (`web/aspira-desc.js` `DESCRIBE`) and the stat block (`web/aspira-stats.js` `SPEC`,
sections in `web/aspira-sliders.js`). Every rule here is the owner's, from corrections on the cards (dates in brackets). After any edit,
rebuild `docs/spire-descriptions.md` (`node scripts/aspira-desc-graph.mjs > docs/spire-descriptions.md`) and read the chains.

## The split: sentence vs stat block

| The sentence says | The stat block says |
|---|---|
| what the tower DOES - its behaviour | every number: per tick, ticks a second, counts, sizes, durations |
| a mechanic once it exists | the same mechanic's numbers, `—` until bought |
| the shape of a change ("losing 50% intensity every hit") | the now -> next of each number |

A tier that only moves a number changes no words - the stat row shows it (2026-10-07). Two tiers may read the same sentence.

## Sentence rules

1. **Damage is a share of tower damage, written `X%td`.** `td` = the card's "Tower Damage (td)" row, and 100% is still written
   (`100%td`) (2026-10-26). A share is anything sized off the tower's hit: a bolt, a tick total, a pellet, a pool burn.
2. **A change is not a share** and keeps its words: "20% less damage every chain", "losing 30% intensity every hit", "take 35% more
   damage" (2026-10-25).
3. **A burn reads `X%td over Ys`** - never the number of hits; hit counts live in the stat block (2026-10-26).
4. **Say nothing a tier does not do yet.** A zero, an empty table slot or a value that rounds to 0 drops its whole clause - no
   "break up to 0 armor" (2026-10-26).
5. **Defaults go unsaid:**
   - every hit that deals damage pops ONE shield charge - never in a sentence, never a "Shields" row (2026-10-16, 2026-10-26);
   - effects stack without limit - only say it when one does NOT (2026-10-26).
6. **Only behaviour** (2026-10-07): harder hits, a colder or wider aura, faster pulses, more puddles change no words.
7. **Short.** One or two sentences a mechanic (2026-10-22 "shorter"); drop filler, even an article ("Emits aura that slows enemies by 45%").
8. **Counts in words** where the sentence counts: "Three bolts", "refracts twice", "three times", "two jets" (`NUM_WORD`, `TIMES`).
9. **The extreme gets its own phrase**, not a number: SOL Diffraction V "refracts four times within a cone without losing intensity"
   (not "losing 0%"); FRZ Permafrost V "Rapid pulses".
10. **Live numbers**: armor and HP-sized numbers are the CURRENT wave's ("just put the actual current armor number"), shown in k/M units,
    never past 9999 (2026-10-22).
11. **Tier 0 names no axis mechanic** - it is the bare tower (smoke-checked).
12. **The owner's wording is verbatim** where given; the generator is bent to produce it, not the other way round.

## Words

| Use | Not | Why |
|---|---|---|
| chains (ARC) | jumps on | 2026-10-25 |
| forks for X% less damage every chain | per-jump falloff numbers | 2026-10-25 |
| aura, void (GRV, always) | field, hole, well | 2026-10-25 |
| satellites (FRZ moons' moons) | moonlets | owner |
| refracts within a light prism, diffracts into N rays, scorch (SOL) | bounce, pierce, cone | 2026-10-26 |
| particles radiate (GRV) | pellets, shed | 2026-10-26 |
| a wall of fire expands, flares singe (IFR Hellfire); meteor impacts light a bright flare (Flare) | rides, spreads N towers wide | 2026-10-26 |
| dissolve armor, corrosive goo (ACD Corrosion) | eats armor down to | 2026-10-26 |
| jets, pools, eat, burn (ACD) | heat, fire | acid terms (2026-10-07) |
| plain sizes ("grows up to 4x by hitting") | engine units ("mass 2") | 2026-10-16 "no one knows what mass 2 means" |

**Stored things** read "N interceptors / meteors can be stored in orbit"; a sortie's total reads "fires Y volleys per sortie for a total of Z%td";
a multiplier on damage taken reads "take X% more damage" (never "an additional X% damage": that reads as a share) (2026-10-26).
**Drop** what the player cannot act on: how far a fire spreads, that voids merge and shed, that an interceptor is rebuilt at home (2026-10-26).

A renamed axis or tower is renamed everywhere: card, stat rows, sections, comments, sim scripts, docs.

## Stat block rules

1. The tower's damage row is labelled **"Tower Damage (td)"**; a share in a row reads `X%td` (2026-10-26).
2. **A ticking thing shows two rows**: damage per tick and ticks a second (2026-10-25); its hit count belongs here, not in the sentence.
3. **One number a row** so each reads now -> next and colours on its own (2026-10-07).
4. **Rows the tower lacks are left out**; a mechanic not bought yet reads `—`, and a row that appears shows the new value with no `— ->`
   (2026-10-15).
5. **No default rows**: no "Shields", no "stacks" (rule 5 above).
6. **No long decimals** (2026-10-20); whole counts on the card.
