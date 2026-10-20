# IFRIT - the three axes, redone (design, 2026-10-20)

The owner's redesign of IFR's skill axes (quoted rules are the owner's). Builds on
`2026-10-19-ifrit-tower-design.md`; where the two disagree, this one wins. Ships as the next
MINOR (**6.5.0**) after its balance battery (ARCHITECTURE.md 9.4).

## 1. Why

"Axes don't feel unique nor impactful." Today every IFR hit is a multiple of the Blk Magic
blast hit, so Blk Magic quietly scales the other two axes; Meteor buys slots and tempo you
barely see; Hellfire's flares and Blk Magic's pellets blur into one effect. After this change
each axis owns ONE part of the ball's life, scales only its own damage, and looks different on
the board the moment it is bought.

| Part of the ball's life | Axis | Good against (owner) |
|---|---|---|
| the meteor IN FLIGHT | **Meteor** | all-rounder: "speed + en route makes it damage fast and armor more" |
| the FIRE it leaves where it lands | **Hellfire** | shield and swarm: "small ticks, many" |
| the PELLETS and their FLARES | **Blk Magic** | shield and swarm |

## 2. Goals, non-goals, anti-goals

- **Goals:** each axis visibly changes the tower when bought; each scales only its own damage;
  the tower stays a swarm + shield main, neutral armor, weak to fast at the spread build
  (Meteor focus is the way to buy into fast and armor).
- **Non-goals:** new enemy rules, new targeting modes, a new tower look (the prism, the colour
  `tifr` and the sounds stay).
- **Anti-goals:** an axis that only moves numbers on the card; one axis multiplying another's
  damage; a ball the tower draws over (owner: "always tower occludes balls").

## 3. The ball's life

1. **Charge.** "Always one charge." A single ball grows at the CENTRE of the tower's floor hex
   (where the prism meets the floor), drawn before the prism so the tower covers it
   (`under` hook, aspira-warp.js). No slots, no corners, no launch gap. The next charge starts
   growing the instant a ball leaves, so the fire rate is exactly 1 / charge time; balls in
   flight, fires and flares from earlier launches keep going and coexist (lists, as today).
   **Fires stack** (owner, asked whether a new fire should replace the last: "greatly lower
   initial meteor fire rate and increase damage"): few, heavy meteors, so stacking stays rare.
2. **Launch.** "Always launch when meteor available": the moment the charge is full and an
   enemy is in range it flies, aimed at where that enemy stands now (no lead, as today).
3. **Flight (Meteor).** It hits every enemy its body touches, once each (the en-route hit),
   so a bigger meteor sweeps a wider path. This is Meteor's ONLY damage.
4. **Impact.** At its aim spot:
   - the meteor's **black fill disappears**; its outline and glow stay and become the **fire**
     (Hellfire), expanding from the meteor's own size;
   - the **pellets** burst out (Blk Magic), as today: random directions, passing through,
     landing nearer more often, each lighting a flare where it lands;
   - at the Blk Magic capstone, **one giant intense flare** lights at the impact spot.
5. **The fire (Hellfire).** It expands at the blast speed to its max size, burning everything
   inside it from the moment of impact, then stays at max size, still burning, for a linger
   time, then fades out (it hits nothing while fading). It burns by **catching fire**, as the
   flares do today: an enemy takes a tick only if it was inside at the previous tick too, so a
   fast enemy running through escapes (the fast weakness). Each tick pops one shield charge.
   **My calls:** each fire ticks on its own clock from impact (the first tick lights, the second
   burns - the flares' `ifrTickFlare` state machine, reused); the tick period is short and FIXED
   ("small ticks, many"), Hellfire scales the tick's damage, not its period. Two fires, or a fire
   and a flare, each tick an enemy standing in both (separate sources, as flares stack today).
6. **The flares (Blk Magic).** As today (a big + over a small x, random size round half the
   max, catching fire), but scaled by Blk Magic, not Hellfire.

**Removed:** the blast ring and its hit-once damage; charge slots (`IFR_SLOTS`) and corners
(`ifrSlotCorners`, `ifrSlot0`, the corner re-pick); `IFR_LAUNCH_GAP`; the blast hit as every
hit's base (`IFR_BLAST_K`); the ball's size coming from its pellet count (`ifrBallK`, `ifrFs`);
Mega Firaga's three flares a pellet (replaced by the giant flare - **my call**).

## 4. The axes

Stops are untaken / I / III / V / VI (`SKILL_STOPS`; tables index 0..5, capstone.js pushes VI).

### Meteor: the ball in flight

| Scales | Untaken | ... | VI (capstone: "huge meteor") |
|---|---|---|---|
| meteor size (width) | about half the tower's hex, ~27 u | grows each stop; the hex's width (~54 u) at V - **my guess, not confirmed** | twice the hex, ~108 u |
| charge time | **much longer than today's 0.5 s** (owner: "greatly lower initial meteor fire rate") - ~2 s untaken (**my number**, the battery may move it); scales down | | not today's 0.1 s: the battery sets it with stacking fires in mind |
| flight speed | scales up | | |
| en-route hit | scales up | | |

The en-route hit's reach is the meteor as drawn (its body; the outer glow fades to nothing
inside it, so it adds no reach). Range keeps Meteor's `SKILL_MOVE` row.

### Hellfire: the fire after impact

| Scales | Untaken | ... | VI (capstone) |
|---|---|---|---|
| max size (width) | the meteor's own size: no growth (owner: "min hellfire size should be meteor sized") | grows each stop | ~6 towers across, ~320 u |
| expansion speed | scales up | | |
| burn tick damage | small ticks, many (owner) | scales up | |
| linger at max size | short | scales up | |

The fire's size is in addition to the meteor's: it starts at the meteor's radius, and its max
is never below it (a big Meteor with no Hellfire leaves a big, short fire).

### Blk Magic: the pellets and flares

| Scales | Untaken | ... | VI (capstone: "Mega Firaga") |
|---|---|---|---|
| pellet count | today's 5 .. 19 is a starting point | | + one giant intense flare at the impact spot |
| pellet pass-through hit | scales up (owner: "pellets should also deal damage en route, scaled by blk magic") - today's rule kept: every enemy a pellet touches is hit, again every `IFR_PELLET_REHIT` 0.2 s it stays touching; the flare lights only where it lands | | |
| flares: size, burn time, tick damage | scale up (all moved here from Hellfire) | | |

Tier names stay (Meteor: Pebble .. Impact; Hellfire: Kindle .. Hellfire; Blk Magic: Fire,
Fira, Firaga, Mega Firaga).

The giant flare (**my call**): an extra flare at the impact spot, on top of the pellets' own;
the same shape, catching-fire tick rule and shield pop as the others, sized and hitting at a
fixed multiple of the Blk Magic VI flare (the battery sets the multiple).

## 5. The look

- **Meteor (charge and flight):** today's look (a black disc inside the ring's glow) plus a
  **radial glow inside the outline**: 30% alpha at the outline, falling to 0% about 30% of the
  way to the centre (owner).
- **Fire:** the same outline + glow, no black fill, growing to max size, fading out at the
  end of its linger.
- **Flare intensity reflects the damage it deals** (owner): brighter = harder. The mapping is
  the builder's, as long as the untaken flare stays visible, the capstone's is clearly brighter,
  and the giant flare reads as the most intense thing IFR draws.
- **Pellets** keep today's look (an ember sized to the flare it will light).
- 3D: the flare spokes stay on the GPU glow path (`fxGlGlowLine`); a radial gradient on the
  board context is not allowed (the 3D moving layer turns fills and strokes into GL instances,
  aspira-ifrit.js header) - draw the inner glow as stacked rings or a GL shape.

Damage bases (**my call**): one `TOWERS.ifr.dmg`, times each axis's own table. With the
slower charge, every meteor hits **much harder** (owner: "increase damage") - each launch's
damage (en-route, fire, pellets, flares) scaled up so a fresh L1 IFR's damage a second lands
about where today's does in solo.mjs.

Saves: IFR's live state is already dropped on autosave and rebuilt on the first step
(`ifrInit`); spent skill points are kept as they are (the axis ids do not change).

## 6. Constraints

- Each axis's damage is `TOWERS.ifr.dmg` x its OWN table; no axis multiplies another's.
- Every list on the tower stays plain data (autosave clones G); the dropped IFR keys in
  `aspira-autosave.js` cover any new ones.
- 500-line cap per file: `aspira-ifrit.js` is ~380 lines now; split on a real seam (the look
  into `aspira-ifrit-draw.js`, loaded after it - **my call**). `aspira-warp.js` is AT 500: the
  charge draw must not add lines there (reuse the existing `under` hook; any new IFR drawing
  lives in the ifrit files).
- Update with the change: the stats card (`aspira-stats.js`), the description
  (`aspira-desc.js`), the capstone table (`aspira-capstone.js`), the changelog (a new 6.5
  entry), ARCHITECTURE.md's IFR section, the smoke's IFR checks, and the sims that name IFR
  internals (`ifrparts.mjs`, `ifrdiag.mjs`, `ifrtrace.mjs` if present).

## 7. Balance (the builder's, by the repo's rules)

The numbers above are shapes; the sims set them. Done means:

- countermx spread 61-69 @6 pts (4 seeds): IFR has checks on at least two types, swarm and
  shield among them, and an x on fast; `marks.py --write` ships the new marks.
- countermx N=1 focus: each axis's VI build leans the way its row in section 1 says (Meteor
  focus beats the other two against fast and armor; Hellfire and Blk Magic focus beat Meteor
  against shield and swarm).
- solo.mjs: a lone L1 IFR loses at most 3 lives on waves 1-11.
- version 6.5.0, one changelog entry for the battery's changes.

## 8. Left to the builder

The numbers between untaken and VI (the owner gave the Meteor and Hellfire endpoints; the
stops between are the battery's), the flare-intensity mapping, the giant flare's multiple,
the fire's fade time, the fixed tick period, and the glow's layer count.
