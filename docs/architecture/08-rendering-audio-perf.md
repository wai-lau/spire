## 8. Rendering, audio, performance

### 8.1 The view (pillar 7)

**3D only** (`aspira-warp.js`): the game as a **flat board under a perspective camera** on a WebGL canvas; the 2D canvas `#asp-cv`
draws the board's texture and still takes every pointer event. Towers and the core are **hexagonal prisms** (taller with level),
enemies **real dice** rolling nose-forward (`aspira-solids.js`), shields lines on the floor, text flat; everything below the floor
fades (`aspira-fog.js`); the light comes from the core; taps map back through `unwarp`. The low / high / 2D looks went on
2026-10-16 and the flat 2D picture kept for a browser with no WebGL on 2026-10-18 (owner: "delete all the visual code for 2d") -
such a browser gets a notice (`noWebGl`, `aspira-ui.js`). `q3d()` survives as a constant `true`.

Adaptation: only the **far-detail radius** shrinks on slow frames (`stepDetail`); the resolution and pixel density never step down (owner, 2026-10-14: the canvases reallocating caused 380-540 ms iPhone hitches).
**Never reallocate the big canvases during play** (§11).

### 8.2 The 3D pipeline

| Principle | How |
|---|---|
| two layers | the **board** (background, graticule, lanes) is redrawn at most every `WARP_STAT_MS`; what **moves** is drawn every frame on a half-size layer the shader lays over it |
| one batch | hits, sparks, flashes, rings are GPU instances (`aspira-fxgl.js`); `aspira-glctx.js` is a 2D-context stand-in turning fills and strokes into instances, so nothing on the moving layer falls back to canvas - a glow in any colour, the boss sky's circle or triangle clip included; any fallback re-uploads the whole layer (an Apple GPU blocks on it), so find one with the `glcWhyN` tally |
| one density read | `canvasDpr()`, capped `RES_CAP_3D` (2; never lowered when frames run slow - only the detail radius moves, `stepDetail`) |
| text stamped once | `aspira-textcache.js`, a pixel budget with least-recently-used eviction, evicted canvases zeroed so iOS frees them |
| caps | damage numbers, sparks, pools a tower, goo drops (ARCHAEOLOGY §12) |
| nothing drawn that cannot show | a die wholly off the canvas (every corner and its breach spike past the line width) skips its draw (`solidOffCanvas`, `aspira-solids.js`), and so do its tracer (`drawStarTrail`) and shield lines (`linesOffCanvas`, `aspira-walls.js`): a late wave walks in from far off screen, and those enemies were nearly half the moving layer's 2D path ops. A cull must be pixel-identical (a WebKit diff, deterministic clock); a cut that changes how enemies look is the owner's call |
|  lit lanes on the GPU (3D) | `aspira-lanegl.js` (`LANE_GL`, 7.0.28): each lit path's distance field is baked once into a 4x3 atlas of 512-px tiles (2048x1536, ~12 MB; R = the line's SIGNED distance, G its plain distance, both to `LGL_LMAX`; B = the glow distance to `LGL_DMAX`), one path a (more below) |
|  board strips | in 3D with GPU lanes, a board redraw whose only change is the lane LABELS (Roman numerals, rim circles: `laneItem` records each one's box, `laneDirty()` the union of changed ones padded `LANE_ITEM_PAD`) and/or the boss bar uploads only that rect (`warp.statRect`, texSubImage2D; `boardUp.byWhy` `labels` / `boss`) (more below) |
| 2D lane layers on a stalling device | when the GPU lanes are off and the board upload stalls (`warpUpSlow >= 3`, an iPhone), the lane layers draw at half resolution (`laneLD()` 2, blitted back up) with a 3-level glow (`LIT_GLOW_SOFT3`); the fade layer builds, masks and uploads only its lanes' box (`laneRec`, `laneFadeL.dirty`), in the frame (texSubImage2D from the `warp.litBox` canvas) - never off the frame (§11) |
| text atlas | a text stamp is a slot on a 1024-px atlas page (`aspira-textcache.js`; at most 6 pages on a phone, 18 on a desktop), packed on shelves by bucket height with 2 px clear round each, drawn from the slot's corner and clipped to it; a dropped stamp's slot goes to the next of its height that fits; with every page full the least recently used stamp whose slot fits (no smaller, at most 2 buckets taller and 32 px wider) gives it up (`gpuSplit.textTaken`); only a stamp too big for a page, or of a size with no shelf, gets its own canvas |

- **lit lanes on the GPU (3D)**: frame by `lglBuild`. The bell shader (`WARP_FS`, `LANE_GLSL` after `HULL_GLSL`) reads them through a varying `lw` (world offset from the core) and lays glow and line over the board sample: per group of lanes sharing colour, star and alpha, the line's level profiles as 2D (`LIT_LINE_SOFT` / `BOSS_LINE_SOFT`, boss widths x`BOSS_LANE_W`) but each level but the thinnest fading out over its outer `LGL_SOFT` (smoothstep), and ONE glow level (`lglGlow`): the line's body opacity (`lglBody`) over its interior, falling smoothly to nothing at `LIT_GLOW_SOFT`'s widest width (owner, 2026-11-09: "can you fix this such that the lanes don't look like they are composed of two layers? / want the interior glow opacity to match the line part" - the six stepped glow levels read as a second band), and the same masks (`GLOW_FADE_R` falloff, the core fade). The line takes `max(abs(signed), plain - 0.75 texel)`: a plain field at 3 world units a texel does not interpolate at the line's V and drew it beaded. So in 3D there is no fade layer, no lane hold and no board redraw a lane; only `laneGlOn()` false (2D, `?diag=nolanegl`, atlas not ready, outside a 3D frame) draws the 2D layers. **Under the board's ink** (7.1.3; owner, 2026-11-01: "lit lanes should cover nothing"): the board is its flat `COL.bg` fill plus ink, so the shader lays the lanes over the bare `bgCol` and puts the board's ink back over them by how far each pixel is from bg (x `LANE_INK_K` 3) - labels and rim circles cover the lanes, the faint grid shows across them
- **board strips**: a new key or sky phase uploads the whole board; a new WAVE is its twelve idle labels' strips (their WAVE:LANE text is all the board shows of it). One strip a changed box (7.1.1): `laneDirty` returns a box per changed label (its old and new spot) and `stripsMerge` joins boxes within `STRIP_JOIN` 8 px, one box round them all past `STRIP_MAX` 16 (the twelve labels of a new wave stay twelve strips); both upload paths send each (`createImageBitmap` per strip). The off-frame path logs `bmp:<why>:<whole|strip>`. With the GPU lanes the board's signature carries no 2D fade-in bucket (the board holds no lit lane; that bucket's coming and going sent the whole board) The board's settled boss bar steps in 1% of HP (`BOSS_BOARD_STEPS` 100; owner, 2026-11-05: "1" - each step is a strip upload, ~11.5 ms in-frame on an iPhone). Such a redraw also DRAWS only its strips (7.6.14): the board canvas is clipped to the very rects that go up, so the browser rasters a few % of it, not all S x S (traps: §11 "board")

### 8.3 Draw order and other visuals

2D, bottom to top: background -> damage numbers -> board -> tower ranges -> stars (over
range fills) -> tethers / acid / aims / shots -> the core's beams -> leash rings and box
lines -> towers -> goo / coins / chevrons / threats -> placement ghost -> the core and its
credits -> **enemies** (over towers and core) -> core HUD -> pop-ups -> banner. In 3D the
towers and the core stand up as prisms (`warpPrism`) and the enemies as dice (`warpSolid`); their tracers, shields, status marks
and text lie flat on the floor under each one's local frame (`warpEntities`, `drawEnemy(e, true)`); the board, ranges, beams and
effects ride the picture. Enemy tracers taper along the
lane; beam width is log of the hit; the screen shakes on a core hit.

**Formation spacing is for the 1x zone, and nothing pops in.** An enemy runs `OFF_SCREEN_SPEED` (3x) until it is on screen and in
a tower's reach, so a gap along the lane shrinks 3x as the front one slows first. A formation's FRONT spawns at the entry and the
rest wait behind it off the board in `G.fleetQ`, walking in at 1x (as a boss's fleet does, `queueFleet`): each gap opens 3x on the
way in and closes back to its slot in reach. The next group waits the formation's length longer. Smoke: no enemy of any wave
type or boss fleet first appears more than a step past the entry.

**Drawn size is not hit size.** Enemies, towers and the core draw at 0.8 of their game size
(`DRAW_ALL`, `TOWER_DRAW_K`, `CORE_DRAW_K` in `aspira-drawsize.js`); hits, clicks, drags and
spacing still read `ENEMIES[type].size`, `TOWER_K` and `CORE_R`. A swarmer's 50-300% size roll
draws at 100-240% (`swarmDrawJit`, `e.drawJit`).

**THE TOWER BODIES (owner, 2026-11-06: "every upgrade axis also changes a visible feature")** - look only, drawn on the towers' 3D layer with
each prism (`drawOrbiters`: what stands behind the tower before its prism, the rest after its top):

| Tower | Axes, as they show (file) |
|---|---|
|  ARC | Voltage: hex rings round the prism, one more a tier, turning, sized to clear the prism at every turn - the inside of a ring's glow 0.46 x the prism's corner radius (10 u) off its corners (`arcRingR`, `ARC_RING_GAP_K`; owner, 2026-11-07: "they should be horizontally further to avoid clipping"), (more below) |
| FRZ | Permafrost hex crystals and Fracture shards round the base (the ice, below); the moons as ice d12s (`aspira-frz-moons.js`); opaque walls |
| SOL | Reflection: the prism becomes a 6 / 8 / 9 / 10 / 12 / 14-gon; Scorch: the top outline thicker, whiter, glowier (baked into the tower sprite); Breach: a katana blade on every corner, back ones dimmer, standing on the floor at 160-320% of a LEVEL-4 tower's visible height whatever the tower's level (owner, 2026-11-07: "breach blades, always use the level 4 tower height for the blade height, instead of the current tower height"; `aspira-sol-body.js`) |
| ACD | drips down every wall that faces the camera, the side ones too, the Flow tier's groups spread one a face (owner, 2026-11-08: "ACD drips should be on side faces too, not just front two faces"), a moving puddle, bubbles popping on the top (`aspira-acd-body.js`) |
| GRV | the body and the Gravity Well particles and chains (`aspira-grv-draw.js`) |
| CRR | interceptors as V=V darts at their own altitudes, their chain trails, tethers and bolts on the same 3D layer (`aspira-crr-draw.js`) |
| IFR | orbiting meteors at 75% height showing the build: the Hellfire ring, the Flare rays (`aspira-ifrit-draw.js`) |

- **ARC**: the group spanning 40% of the prism's height round its middle (`ARC_RING_SPAN`; owner, 2026-11-07: "push the rings closer together (vertically center the group)"; 2026-11-08: "they should take up 40% of the tower's height"); the bolts' width and glow by Voltage - a tier 0 strike as a Voltage V one was, +25% a tier (`ARC_VOLT_W`), each hop thinner by its share of the strike and tapering along its length to the next hop's (owner, 2026-11-08: "arc beam intensity should be a gradient not a step from one beam to another"; `arcIntAt`), the core's white mix fixed (owner, 2026-11-07: "current volt 5 brightness should be arc 0 brightness / volt levels should increase intensity further"); Conductivity: thicker, glowier rings; Shock: brief arcs between top corners; the bolt leaves the top corner nearest its target (`aspira-arc-body.js`)

Every glow is a smooth blur or a GPU falloff, never stacked bands (owner, 2026-11-06: "never use step glow unless huge perf gains"); the one
exception left is the lit lanes' 2D FALLBACK (no WebGL), where a blur would cost the slow device most - the GPU lanes are a shader bell.

**FRZ'S ICE (owner, 2026-11-06: the Permafrost / Fracture spec; "also ice crystals should be 3d"; "Never redraw the ice")**: `aspira-frz-ice.js`
GENERATES each tower's pieces once - hexes glued face to face (innermost first), shards in a normal spread leaning 15-30 deg outward and free to
cross a hex, left / right balanced by volume, the top face never covered, nothing wholly hidden - seeded by the tower's id, in the view the tower
first has; it runs in a Web Worker (the page's own `?v=` script; a silent worker hands over to the time-sliced maker after 3 s). Every piece is a
SOLID (floor outline, a height at each corner, its lift, a shard's lean); `aspira-frz-ice3d.js` projects it once through an affine copy of the
tower's first 3D view and BAKES it with a per-pixel depth test (the tower's prism a depth-only occluder): the colours, then the ridges where
the depth test shows them, in slices (~2 ms a frame). **Baked once**: growth shows step by step, the full bake swaps in whole, and after that the
one image only moves and scales with the tower - no rebake on a move, a pan or a zoom; a tier bought later keeps the old image up until the new
one is whole. SOL's blades follow the same rule. **Under the enemies, over its prism** (owner, 2026-11-09: "perma and frac should render under enemies also" / "also FRZ top border is occluded sometimes"): the image is drawn twice a frame - whole on the enemies' layer before them (`frzIceUnder`), and clipped to its prism's screen outline on the towers' layer after the walls and before the top (`frzIceOnPrism`), so the front ice still covers the prism and the top's outline always wins; the bake steps on the first draw only.

### 8.4 Audio

Synthesised WebAudio through a limiter (`aspira-sfx.js`), created on the first gesture:
voice-limited, per-sound gaps, **at most 3 copies of a tower's sound at once**, density kept
at any speed. Mute and volume persist. Optional **Brood War samples** from the owner's own
install live only in this repo's `data/aspira-sfx/` (gitignored: the repo is public), served to the
guest tier by `/aspira-sfx/{file}`, replacing the synth sound of the same name. Each boss
has a voice line. **At the voice cap the RARE sound wins** (owner, 2026-11-06: "less frequently played sounds should take priority ... (in terms of SFX
concurrent limit)"): each name's trigger rate decays over `SFX_RATE_TAU` 2.5 s; a new sound that finds the voices full cuts the live sound whose
name triggers most often (a 15 ms fade) - only if that one is commoner than it - else it is skipped (`sfxMakeRoom`).

