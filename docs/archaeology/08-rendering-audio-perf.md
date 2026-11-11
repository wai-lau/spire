## 8. Rendering, 3D, audio and performance history

### 8.1 3D in one day (10-09, four shapes)
Quality toggle -> slider (low / high / 3D). The 3D view went: a **rounded cone** whose slope steepened each wave
(`SLOPE_AT` 5 -> 25 degrees; "reverse the dip, so it's a tower") -> a **fixed bell** with a level plateau under the
towers (`WARP.depth` 460 -> 2300 -> 6900 -> 13800, "make it 5x taller", "always a deep classic bell shape") and a
black-hole grid out to 2400 -> a **funnel / flipped gravity well** ("towers like angels dancing on the top";
"spacetime curve should not occlude, make it semi-transparent"; `pow` 3 -> 2, depth 1800 -> 1500) -> a **smooth
bell with flat sprites** drawn on a third canvas `#asp-ent` at their projected point -> **isometric over a FLAT
board** (owner: "this is too fucked"; `depth` 0, `tilt` 0.9553 = atan sqrt 2, `fov` 0.02) -> more top down (`tilt` 0.55) and a real perspective (`fov`
0.9, "increase size changes based on distance from camera") — the CURRENT design (ARCH §8.1). The funnel and bell
knobs (`depth`, `pow`, `head`, `shoulder`, `grid`, `warpHeight`) remain in `aspira-warp.js` at rest (headers in that
file still describe the funnel). On the flat board: prisms for towers and core ("back to prisms instead of pointy"),
a fog layer over what is below the floor -> geometry fading in 8 slices (`aspira-fog.js`), shields as 3D walls
(`aspira-walls.js`, briefly) -> back to lines on the floor, spheres for rings (briefly), real dice (`aspira-solids.js`),
a light from the core, lanes partially occluding the towers, towers fading down their own height, tracers fading to
their tails. The cone's stray inverted-sky colour bugs ("colors rapidly
switch as the boss dies") were fixed by falling back to the whole view when any circle point projects behind the
camera. 3D fixes: dotted-prism empty slots, an upright Breach spike, a frozen die at 50% cyan.

### 8.2 Perf rounds
1-3 (10-04..05). Round 3 was profiled at 3x density because earlier profiles ran at 1x and never waited for the
canvas to raster, so they undercounted; the canvas caps at `RES_CAP` 2 device px (a phone at 3x drew 3.4 M pixels);
tower glow became a cached SPRITE (wave 83: 12.9 s -> 3.9 s software-rastered); fast tracers a plain tapered fill.
Late-game lanes (10-05, 9 L4 towers, wave 93, headless WebKit at phone size; render 449 -> 43 ms a frame): the lit LANES
were ~83% of a frame (two full-screen layers rebuilt each frame, every live spiral stroked three times, the 32-wide
glow the costliest, masks of full-screen gradient fills): layers rebuild only when their signature changes, cached
masks, glow only inside `GLOW_PATH_R` 330. Waves 80-85 with all nine slots maxed showed the real killer: DAMAGE NUMBERS
aged in real time while the game ran up to 20x, so thousands piled up (render 74 -> 585 ms); `DMG_MAX` 120 brought
it to 16-52 ms. Round 4 (10-05): dim range discs outline-only (446 -> 322 ms flushed at 3x), cached graticule layer
(was 384 strokes a frame), `LIT_MIN_MS`, HUD 10x a second. **Quality = low (10-07):** measured in headless WebKit,
430x932 @3x, wave 81, nine maxed towers: median frame **3558 ms high -> 126 ms low (x28)**. Boss sky "invert has huge cost"
(10-11): Temporal Drive dropped `shadowBlur` (a 6 px blur on one octagon ~8 ms a frame, the old five at 24 px ~34 ms) for
one wide faint stroke. Acid pools past 24 land hits with no flash and draw as plain circles (`79fa1ca`); live sparks capped
at 300 (a late swarm wave kept ~2,300); full-dice budget dropped: every die over 12 px stays 3D, under-12 px or past the
60 biggest draw flat (`6d4031a`, `5b3e137`).

### 8.3 3D frames, 10-09..14
Dice, prisms and projections cached per frame, the view at 0.75 resolution (10-09: 3D frame CPU at 95 enemies 9.8 -> 6.5 ms;
`warpEntities` 12 -> 5.3 ms; 3D render + view 14.4 -> 11 ms), lane layers merged to one (`blitLanes`); 10-12 slow frames
stepped quality down in order — far-detail radius to 600, board picture 2048 -> 1024, resolution 0.75 -> 0.5, density
2 -> 1.25 (trigger 40 -> 34 ms because a Brave sat at 36-40) — and auto-stepped 3D -> high -> low when not pinned. 10-13 the
**two-layer rework** (the iPhone spent ~28 of a 32 ms frame sending the whole 2D board to the GPU): board layer every
150 ms, moving layer every frame (`27dcf55`); 10-14 hits / beams / sparks / rings / coins as GPU instance batches
(`8a8e289`, `2b83254`; "a 10x improvement on perf ... avoid lowering resolution or reducing visual clarity"), dashed rings
on the GPU, text stamped once, a stand-in 2D context so nothing on the moving layer falls back to canvas (`0781e6c`,
`7963fa9`; ~5300 canvas fills / strokes a frame at 63 enemies -> one batch). 10-14 slow frames STOPPED shrinking
picture / resolution / density (reallocating the big canvases caused 380-540 ms hitches and likely iPhone crashes) —
only the far-detail radius comes in (`bb8de72`). Safari has no canvas `filter` (it reads undefined) so every fill on the
moving layer took the canvas path (`5711f58`). Text stamps live on a 6M px (~24 MB) budget, least-recently-used out,
evicted canvases zeroed so iOS frees them (`146707b`; an iPhone died at wave 62-70 again and again).

### 8.3b The iPhone lag round, 10-31 (7.0.14-7.0.28)
Owner: "Fix the lag!!", then "get this game in shape with minimal lag and no insane numbers over the next 12h". Every step
below was render only (fp IDENTICAL `8efcb15956c0`, smoke 126/126) and read from normal-play iPhone slow logs (owner: "I dont
want to do the diag things").

| Version | Step | What the log showed / what came of it |
|---|---|---|
| 7.0.14 `8d3c012` | the lane FADE layer's upload moved off the frame on a stalling device (`createImageBitmap`, upload a frame or so later; `?diag=nofade/fadeborrow/fadesync`) | a 7.0.7 log: 44 frames over 100 ms in 160 s (0-3 in every 6.11-6.15.4 log), 34 of 36 canvas uploads on slow frames, all the fade layer's whole-canvas texImage2D. **Superseded in 7.0.18** |
| 7.0.15 `9f82869` | slow logs: an `ent` phase, `slowWhy.ms` by phase + `rest`, `causes` for stamps and fade builds; waits skip non-play time | a 7.0.14 log read a 1085 ms `bmpWait` across a pause |
| 7.0.16 `a719b09` | the fade layer builds, masks and uploads only its lanes' box (`laneRec`, `laneFadeL.dirty`) | its in-frame upload averaged 41 ms (529 worst); one smoke wave's box 516x549 of 1007x1007 (28%) |
| 7.0.17 `069e400` | text stamps share 1024-px atlas pages | 1978 stamps in 173 s, every one a NEW canvas (the cache never filled, so its reuse pool never refilled), 37 of 71 slow frames made one; WebKit two waves: 134 canvases -> 1 |
| 7.0.18 `8250e0f` | the fade layer back IN the frame (snapshot opt-in, `?diag=fadebmp`) | owner: "Lanes not appearing/leaving at the right times": the snapshot waited up to ~1 s while the lane alpha followed the live layer |
| 7.0.19 `313da1c` | a full atlas takes the least recently used fitting slot | a 7.0.17 log: `textMade` 722 - shelves and gutters filled the 6 pages before the px budget evicted; allocator alone, 6000 stamps of 552 sizes: 26 own canvases |
| 7.0.20 `7699253` | `board` / `fade` frame tags and the next two | 100 slow frames, most time outside our code, against 77 board redraws and 44 fade builds |
| 7.0.21 `3afa435` | half-res 2D lane layers + 3-level glow on a stalling device | 7.0.20 log: fade texImage2D 231 ms avg on 36 of 47 slow frames |
| 7.0.22 `216ce71` | the in-frame fade upload sends only its dirty box (`fadeBox`, texSubImage2D) | |
| 7.0.23 `7d93acf` | `laneHold` drops a held lane once no live lane of its wave runs | bug "lanes stay onscreen after all enemies die": a lane held over by the next wave's lanes never went dark. The 7.0.23 log: 6 frames over 100 ms (was 47-54), but 72 over 50 ms; `fadeBox` 43.9 ms avg (n 49), `bmp` 26.5 ms (n 81) |
| 7.0.24 `96167c7` -> 7.0.28 `0319ef2` | the lit lanes drawn by the bell shader from baked distance fields (`aspira-lanegl.js`); the board uploads label strips only | removes every fade upload and every lane-driven board upload in 3D. WebKit 430x775@2 vs the 2D lanes: 201 of 1.33 M px off by more than 16 levels, none by more than 48 (the half-res iPhone path 4758, none over 48). The first cut drew the line BEADED (plain distance field at 3 world units a texel) - hence the signed channel. Uploads in a desktop run: 12 label strips, 1 lane build, no `fadeBox` |
| 7.1.1 `d90b85d` | GPU-lanes board: no 2D fade bucket in the signature; one strip a changed label | the 7.0.28 log (46 s): 32 bitmap uploads at 16.5 ms, slow frames tagged board 16 / board+1 12. Harness, waves 1-6: redraws 46 -> 29, whole uploads 18 -> 6 (one a wave), label strips up to 492x519 -> 9x9..98x49. WebKit: strips vs forced whole uploads, 0 px differ |
| 7.1.3 `fccfdb1` | lit lanes under the board's ink | owner: "lit lanes should cover nothing" - on the 2D path and 7.0.28's GPU lanes they lay over the grid, labels and rim circles; 7.0.28's parked look item closes |
| 7.6.7 `12f1a0a` | glcStroke from plain numbers in reused Float64Array buffers; `trimToTowers` only with an end in a tower | node, a wave-110 board with one of each tower at 13 buys: glcStroke 9.3 -> 7.8 ms a frame; GPU instance buffer hash-identical |
| 7.6.9 `0f304a7` | glCtx pools its op entries, points and parts, rewound at `beginPath` | every moveTo / lineTo allocated three arrays and a part; the Carrier's draw 1.9 -> 1.6 MB a late frame (node, `--min/max-semi-space-size=512` and the heap delta; the sampling profiler undercounts); GPU instances and 2D ops hash-identical |
| 7.6.10 `12da43c`, 7.6.11 `21d4d07`, 7.6.12 `67d55e0` | `aspira-wavelanes.js` out of waves.js (475 -> 316 lines), `aspira-cardfit.js` out of ui.js (455 -> 388) | fp + FP_DEEP IDENTICAL; 7.6.11 loaded cardfit after ui and the page threw `placePop` at load (WebKit pytest only) - 7.6.12 loads it first (ARCHITECTURE §11 "load order") |
| 7.6.14 `7f88ed3` | a labels / boss strip redraw draws only its strips (dry pass, clip = the uploaded rects) | two 7.6.13 iPhone logs (iOS 18.7, dpr 2, 430x873): wave 19, 162 s - 45 of 9254 frames over 33 ms, 41 tagged board, phase outside 42, `rest` 1763 ms (~39 ms a slow frame), 103 `bmp:labels:strip`; wave 33, 3 min - 4.2% over 33 ms, slowWhy board 90 + board+1 10 of 111, `rest` 4242 ms, `bmp:boss:strip` 43 (11.5 ms avg in frame), uploads on ~40% of slow frames. Every strip event redrew all 2048 x 2048 for the browser to raster. WebKit 430x873@2 (S 1510): px drawn a labels event 100% -> 1.9-3.3%, a boss strip 100% -> 0.4-0.5%; emulated texture 0 px off over 63 events; fp IDENTICAL `53a9e5340b63` |
| 7.6.15 (Leader) | the boss strip's in-frame upload: the board's bar drains in 1% steps, `BOSS_BOARD_STEPS` 400 -> 100 (owner, 2026-11-05: "1") | one texSubImage2D of a 10-14k px ImageBitmap at 11.5 ms - not its area; ImageBitmap uploads ignore the UNPACK flags (WebGL spec), so no flag helps. Options sent to the owner 2026-11-05: `BOSS_BOARD_STEPS` 400 -> 100 (43 -> ~11 uploads in 3 min, visible coarser drain; recommended), ping-pong board textures (device-only gain, unproven), the draining bar back on the overlay (reverses 10-27); the owner picked the first |
| 7.7.14 `5a30cb1` | IFR flares drawn 2D are stamps | a 7.7.7 iPhone log: the tower card's menu (its demo) 58.7 ms a frame, 558 slow frames in 61 s; the Hellfire V demo on a 2D canvas ~18 strokes a flare: 989 strokes / 3607 lineTo -> 159 / 286 a frame, node 6.5 -> 2.5 ms (on 7.7.13's shorter flare lives); WebKit 0.53% px off (§11) |
| peer-visual 149cb9a / f53bfbd | prism gradients kept across frames; scorch bins one scratch array | ~96 createLinearGradient a late frame -> 0; tried and dropped: scorch dots as chords (16-36 px a ring off by >24/255) |
| 7.7.18 `61e3c05` | the Devil's host exempt from `barHold` | wave 84 froze: 79 escorts parked, 0 bosses; after: host seen 79/79 by 9 s, six Devils, the wave over at 27 s. The smoke pin (41f9308) plays her alone, stopping when the six are in: waves.mjs 343 s -> 86 s under load 11 |

Superseded paths, still in the code but off by default: the off-frame fade snapshot (`?diag=fadebmp`) and, in 3D, the whole 2D
lane path (fade layer, hold, half-res layers) - it is what 2D and `?diag=nolanegl` draw. One look change stands with the GPU lanes,
parked for the owner: lit lanes now draw OVER the lane labels and rim circles (they were under).

### 8.4 Audio history
Synth-only; optional Brood War samples (10-02, gitignored, personal use, served to the guest tier); per-tower build /
upgrade sounds (`sfxFor`), ACD "Hydralisk spit" per tick and `SAMPLE_MAX`; `SOUND_MAX` 3 per kind (generalised the same
day); boss voices per Arcana (the Archon set locally); `LOUD_GAIN` / `TOWER_GAIN` / kill 0.4; volume 0..2 with `VOL_BOOST`
2 after the limiter; the core-power sounds (own, not "upgrade complete"); the shutdown sound on a leak. No auto-pause on
focus loss.

### 8.5 The look passes, 11-06 .. 11-09 (Visual)

- **Tower bodies by axis** (owner, 11-06: "every upgrade axis also changes a visible feature"): ARC's Voltage rings (sized to clear the
  prism at any turn, then pushed out to the glow's inside, split back / front at the centre's screen row), SOL's Breach blades (baked per
  view shape, a level-4 tower's height), FRZ's Permafrost sheets and Fracture shards (grown once in a Worker, baked per pixel with the
  prism as a depth-only occluder), GRV's orb, CRR's V=V interceptors, IFR's flares.
- **The lift trap** (towers lifted floor -> h since 7.8.11): code that still assumed the old frame drew ARC's bolt end h/2 above the
  enemy and baked FRZ's ice occluder at half height (the ice showed through the prism until 7.12.9).
- **FRZ moons** (7.12.10): the D12's face normals were in the wrong orientation (0 of 12 faces planar); fixed, and the moon orbit ring
  dropped (the range keeps the indicator). **Fracture** (7.12.11): a third as tall, a 1.75x foot, standing on the sheets, not through.
- **The ice bake off the main thread** (11-08): a 379 ms bake sliced on the main thread cost 2 ms of every frame for ~3 s of a pan; the
  Worker bakes on an OffscreenCanvas and transfers an ImageBitmap (posting the crystal list per job cloned it: 29 ms spikes - §11).
- **Sound** (11-07): every sample normalized on its loudest 150 ms, class gains (towers, kills, alerts), sliced and round-robin samples,
  SOL's one voice a tower, the shield-pop / ARC sound swap.
- **2D path ops** (11-08 .. 09, 7.12.22 .. 7.12.24), a late phone scene: strokes 189 -> 114 (each prism upright stroked once, the top
  edges one path, the moons' bases and edges one fill / one stroke), fills 200 -> 185; pixel diffs named, none visible at 3x.

