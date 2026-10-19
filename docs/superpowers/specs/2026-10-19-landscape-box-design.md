# Landscape play box (2026-10-19)

## Intent

On a landscape screen (a desktop, a phone held sideways) the game is drawn small: every screen zooms so the
PLAY BOX fits it, and the play box is phone-shaped (tall), so on a wide screen the box's height sets the zoom and
the sides are empty.

The owner wants the board to fill a landscape screen **without making landscape a different game**: a landscape
player and a portrait player face the same towers-against-lanes geometry, so one TOP PLAYERS board stays fair.

## Decided by the owner

1. **The core is CENTRED in the play box, portrait included.** Today the portrait box puts the core 270 world
   units below its top edge and 364 above its bottom (`VIEW_UP_K` 1.5, aspira-positioning.js). It moves to the
   middle: 180 either side (unchanged), about 317 above and below (the same total height, 634).
2. **Landscape screens get the portrait box turned 90 degrees**: about 634 wide x 360 tall, core in the middle
   (317 either side, 180 above and below). The two boxes are exact 90-degree turns of each other.
3. **The tower slots are turned 90 degrees about the core** in landscape (`CELLS`, aspira-defs.js). The spiral has
   12 lanes, 30 degrees apart, so a 90-degree turn maps the lane set onto itself; with boxes and slots both turned,
   **portrait and landscape are the same game.**
4. **Lanes: every wave, portrait and landscape, is turned so the on-screen lengths of its lane COPIES (a split
   wave rides 2-6 copies, 360/k apart) are as SIMILAR as possible.** This replaces today's rule ("as much lane on
   screen as possible", `laneTurnScores` / `laneBestTurn`, aspira-waves.js).
5. **The 3D tilt does not change**: the board's far side stays at the TOP of the screen. Only the box and the
   slots turn; nothing about the camera.
6. **UI and text are not turned**: top bar, wave list, speed row, cards and choosers, damage numbers, lane labels,
   the credits over the core all stay upright where they are.
7. **Portrait phones: the wave list ("warped in" / "warping in") rows sit much closer together**, so the list fits
   below the centred core. **The wave list never covers the core or the starting tower slots.** Landscape keeps the
   wave list's current spacing.
8. **One TOP PLAYERS board** for both orientations.

## Goals / non-goals / anti-goals

- Goal: on a 16:9 screen the board draws about 1.7x larger than today.
- Goal: portrait and landscape play identically (box, slots, lanes - turned 90 degrees).
- Goal: within a wave, every lane copy gets about the same time on screen.
- Non-goal: a third box for squarish screens, a user toggle, a rotated camera.
- Anti-goal: the board jumping mid-fight.
- Anti-goal: the wave list covering the core or a starting slot on any phone.

## Consequences the owner accepted

- Centring the core and the new lane rule are a BALANCE change for every player: where enemies become hittable,
  how far towers can move, how lanes sit on screen. The simulator must learn both (it models portrait), the
  battery reruns, the build-card marks regenerate, and it ships as its own version.

## What the box decides today (all must follow the active box)

`phoneBox()` / `phoneRect3d()` / `phoneInside()` (aspira-positioning.js) decide:

- the ZOOM (`resize`, aspira-draw.js: the box fits the window, centred on the other axis);
- OFF-SCREEN = UNTOUCHABLE (`enemySeen`; `e.seen` latches) and the 3x off-screen speed;
- the towers' MOVEMENT CAP (`legalSpot`, aspira-towers.js);
- each wave's LANE TURN (`laneTurnScores` / `laneBestTurn`; the lane preview `laneSoon` uses the same pick);
- the faint box outline; the off-screen enemy fade (follows `e.seen`).

`VIEW_SIDE` / `VIEW_UP` / `VIEW_DOWN` are consts: sweep every consumer (layout, culling, floats placed off the
core) - in scope.

## My calls (owner to check)

- **Which box:** landscape when the window is wider than tall (`innerWidth > innerHeight`), decided at load and
  on resize. A flip mid-wave waits until the field is clear AND the lane preview is not showing, then switches box,
  slots, zoom and lane picks together; until then the old box stays, fitted to the new window.
- **Slots:** `CELLS[i]` keeps its index, `ang` and unlock data (logical ids - `OPEN_SLOTS`, `G.opened` keep
  working); only `x`, `y` and `pts` turn. The turn's direction is the builder's (the ring is symmetric).
- **Towers on a switch:** each moves to its slot's turned twin, its offset from the slot turned with it.
- **Saves:** a save is the board at rest (no enemies, towers on their slots - `runClean`), so it resumes in
  whichever box the screen has now.
- **Lane rule:** score the 72 turns per lane and split by the SPREAD of the copies' on-screen lengths (max - min);
  among turns within a small slack of the smallest spread, take the one with the most total on-screen length, then
  the one nearest the wave's usual turn (as today). Measured as `phoneInside` measures (2D world box, or projected
  in 3D). Because the boxes are turned twins, landscape needs no separate "match portrait" step.
- **Wave list fit (portrait):** the list's row height shrinks until the list's box clears the core and the starting
  slots' screen rectangles (with a small margin) on the smallest phone in `PHONES`; checked on every phone size.
- **perflog:** records which box a session played in, so slow-log data can be split.

## Left to the builder

- How the active box is represented (a mode flag swapping the `VIEW_*` values, or `phoneBox` returning one of two).
- Cache keys (`laneTurnCache` is keyed by screen size and 2D/3D already; add the box) and when caches clear.
- The simulator change (centred box, new lane rule) and the battery rerun.
- Tests: landscape slots are the portrait slots turned 90 degrees; the lane rule's spread is no worse than today's
  on every lane and split; the wave list clears the core and starting slots on every `PHONES` size.
