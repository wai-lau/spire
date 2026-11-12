## 10. Tech

### 10.1 Files and load order

The template's `<script>` order (the truth is `templates/aspira.html`), one shared global scope,
files capped at 500 lines (exec-fn's pre-commit) and so split by seam - and since 2026-11-10 EVERY tracked text file, docs included (owner: "add a 500 line limit to every file, including docs"; the changelog keeps its 2026-10-20 exemption; these docs are split one file a section for it):

| Stage (in order) | Scripts |
|---|---|
| data and state | `defs` (geometry, tables), `towerstats` (`towerStats`, prices), `drawsize` (how big things are drawn, apart from their game size), `sfx`, `upgrades` (dormant), `game` (`G`, combat, damage, slows), `step` (the tick, spawns, enemy movement, game end) |
| waves | `formations`, `floats` (numbers, coins), `waves`, `wavelanes` (each type's lane and its turn on screen, split 2026-11-05), `bosses`, `bosssky` (the inverted sky, its spokes, the Star's tint; split 2026-11-09), `bossfleet` (the boss fleets: lattices, scatters, the Devil's host), `bossbar` (the boss's HP along its lane), `positioning` (+ the play box) |
| towers | `towers` (ARC, SOL, moons), `move` (leash, tower marks), `sol` (SOL), `acid` (ACD) + `acid-draw` (its look, 2026-11-05), `skills` (the charts' shared helpers), `arc` (ARC's chart, split from skills 2026-11-05), `frz`, `grv` (GRV) + `grv-draw` (its look, 2026-11-05), `crr` (CRR), `ifrit` (IFR) + `ifrit-draw` (its look), `desc`, `capstone` (tier V on every table, tier I inserted), `curve` (the stat curve), `tier01` (tier 0 / tier I), `chart`, `stats`, `sliders` (the card), the LOOKS kept apart from the logic: `crr-draw` (CRR's interceptors, trails, tethers and bolts), `arc-body` (ARC's rings, Shock arcs, the bolt), `acd-body` (ACD's drips, puddle, bubbles) |
| core and meta | `core`, `core-fx`, `powers`, `endstats`, `ascend` |
| draw (the board texture + overlay, 2D canvas calls) | `quality` (`q3d`, `stepDetail`, just before draw), `threat`, `draw`, `ranges` (tower ranges, split from draw), `textcache`, `effects`, `enemies`, `lanes`, `lanefade` (the fade-in layer, split from lanes), `camera`, `fling`, `fog`, then the tower looks drawn with the towers (2026-11-06): `solbeam` (SOL's beams and cones), `frz-moons` (FRZ's moons as ice d12s), `frz-ice` (FRZ's ice generator - also run as a Worker) + `frz-ice3d` (its 3D depth-tested bake), `sol-body` (SOL's faces, Scorch outline, Breach blades) |
| draw (3D) | `lanegl` (the GPU lanes' atlas and GLSL, before `warp` because the shader source splices `LANE_GLSL`), `warp`, `warp-prism`, `warplayers`, `fxgl`, `chains` (ARC's chains and charge glow, render only), `glctx`, `pick`, `solids`, `walls` |
| UI and tail | `chooser`, `wavelist`, `wavecard`, `cardfit` (where the tower / core card sits, split 2026-11-05; BEFORE `ui`, whose last lines call it at load), `ui` (HUD, input, the frame loop), `perflog`, `warmup` (one hidden draw of every kind a few seconds after load, so V8's first real frames are warm), `changelog`, `changelog-old` (5.8 and older), `changelog-card` (the WHAT'S NEW card), `autosave`, `demo` (the card's private scene: the swap, the 3D camera), `demo-layouts` (the layout registry, `demoShows`), `demo-card` (the box, the i, `demoTick`), `dev` (the `?dev=` scenes) |


| Piece | Where |
|---|---|
| stylesheets | `aspira.css` (page, chart, cards), `aspira-endstats.css`, `aspira-ascend.css`, `aspira-changelog.css` |
| colours | **never in JS**: hidden `.asp-sw` swatches in the template, styled from exec-fn's `chrome.css` tokens, read once by `resolveColors()` into `COL`; the tower hues are spire tokens in `aspira.css` (`--asp-arc-hsl`, `--asp-frz-hsl`, `--asp-acd-hsl`, `--asp-solar-hsl`, `--asp-violet-hsl`, `--asp-blue-hsl`, OKLCH 60 degrees apart); a new colour or alpha is exec-fn's palette lint's call |
| python | `api/routes_aspira.py` (page, redirect, sfx, ascendants, perflog), `spire_board.py`, `spire_perflog.py` (stdlib-only), `templates/aspira.html` |
| diagrams | `docs/arch/*.mmd` is the mermaid source, rendered to the `.svg` beside it by exec-fn's pre-commit (`scripts/render-mermaid.py`) whenever a `.mmd` is staged; `geometry`, `play-box`, `layout` are hand-written SVGs. The doc embeds the SVGs: the app's markdown viewer does not render a mermaid fence |

### 10.2 exec-fn integration

A git **submodule** at `apps/spire` mirroring exec-fn's layout (exec-fn ARCHITECTURE.md
§1e). Commit INSIDE this repo; exec-fn's hook pushes it and bumps the pointer; lints and
hooks are exec-fn's (the shim `scripts/pre-commit`).

| Route | Tier | What |
|---|---|---|
| `GET /spire` | guest (Turnstile) | the page: `full_height`, no nav, no CRT; `data-owner` on a full session (the 10x speed) |
| `GET /aspira` | public | 301 to `/spire` |
| `GET /aspira-sfx/{file}` | guest | the sound samples |
| `GET` / `POST /api/spire/ascendants` | guest | §9.1 |
| `POST` / `GET /api/spire/perflog` | guest / owner | §9.2 |

The guest page set lives in three places in the parent (`_GUEST_NEXT_ALLOWED`, the 401
handler's guest prefixes, the router tier); `/spire` is in all three.

### 10.3 Tests and the smoke

| Check | What |
|---|---|
| `tests/test_spire_board.py`, `test_spire_perflog.py` | stdlib units |
| `tests/test_spire_sliders_browser.py` | WebKit, exec-fn's fixtures: the stepper rules and the card grids at 1280x800 and 430x932 |
| `node scripts/spire-smoke/smoke.mjs` | every script the template loads, in order, in one node vm over a fake DOM (`dom.mjs`) whose canvas RECORDS calls; drives the real 3D frame loop over a stand-in WebGL (`fakeGl`) and checks things **draw** on every canvas: boot, 3D up, each kind built, a fought wave, the sky, towers keeping their colours, a capstone (a second refused), Temporal Drive, two-finger moves, a fling, lives left, game over / a loss past 10 / a win and the Ascendants, play again. exec-fn's pre-commit runs it when a game file is staged; a new browser global needs a `dom.mjs` stub |
| `scripts/spire-smoke/demo.mjs` (in the smoke) | the card's demo scenes: coverage (a layout per tower tier 0 and per axis, none stale), behaviour (every layout x tier shows what it declares), isolation (the real game untouched; a long scene never reaches the page's end screen, score, autosave or end sound), the card (the scene runs while open at 1x play on 60 and 120 Hz, the i flips to the sentence, closing drops it), packs and in-box (both lanes and their numbers inside the box at every tier), the signature (every tower's scene DRAWS its main effect), respawn (no ARC chain outruns its reach over a lap) and CRR's wing (none over 2 s flying home) - §11 "demo" |
| `scripts/spire-smoke/{tiers,waves,ifr,sol,pins}.mjs` (in the smoke) | the smoke's other check files, each in its own page env, registered into `harness.mjs` (boot, register, report) before `smoke.mjs` reports: `tiers` the stat curve and each tower's tier 0 / I; `waves` the play box, slots, lane picks and brightness, formations, spawning; `ifr` the meteor, Hellfire, the flares and their look; `sol` the tracking beam, Reflection, Breach, the scorch pace; `pins` rules shipped without a check of their own, each failing on the behaviour it replaced |

### 10.4 Simulator and balance tooling (`scripts/aspira-sim/`, README there)

Runs the REAL game code (`sim.mjs` `FILES`: the logic scripts up to `core`, `grv` and `crr` among them) in a Node vm
with drawing, sound and input stubbed, every tick as fast as it can, with scripted players
(opening, kind mix, upgrade appetite, interest reserve, axis per point, core use).
`ASPIRA_WEB=<dir>` pins a run to a snapshot; a `patch` file changes numbers or redefines a
function without touching the game. Run one at a time with `nice -n 19` on the droplet.

| Question | Script |
|---|---|
| the curve; real trio games per type and boss | `waverep`, `curve`, `rand`, `late` |
| every trio / combo / solo kind | `trios` (three scripted styles; walks only the first four kinds), `combos`, `solo`, `wave1`, `swap`, `eval`, `style` |
| the trio scale (§4.9): all 35 trios of the seven kinds under perfect play, the per-kind damage factor, why a trio dies | `tribal` (the run), `triscale.py` (scores and factors), `triodiag` (per enemy type: lives lost, closest approach) |
| the economy check behind the step price (§4.2) and the build card marks (§4.8) | `eco`, `marks.py` (from a `countermx` run) |
| the counter matrix | `countermx` |
| an axis tier's value; a buy's payoff | `isolation`, `chartvalue`, `payoff` (each buy alone: gain, price, gain a credit), `buildlog` (purchases by wave) |
| bosses and fleets | `bossbal`, `bossfleet`, `bossvs` |
| type and wave counts | `typebal`, `wavebal` |
| the core | `corevalue`, `corepower` |
| gliding players never stuck | `stuck` |
| a worker pool (resumable `out.jsonl`) | `pool`, `playjob` |

**Levers already measured and dropped** (do not re-run without a new reason; the numbers: ARCHAEOLOGY §13.8, 2026-11-05): a higher
`SLOW_CAP` (0.85-0.95), `ARMOR_ALL` 0 / 5, `ARMOR_K` 4 / 8, every other tower's fire rate x0.85 / x0.70 for ARC's swarm cell, ARC's burn
(A0), damage and chain carry (A1-A3, damage x0.5 .. x0.1), GRV's void tick and tier I-II Gravity Well (G0-G2T: tiers I-II are never in
the marks build), ACD's Flow carry and ramp (Q0-Q3), IFR's 8/12 shards and shard speed (I1-I3), CRR's reload / hangar / ammo (E0-E5).

| Balance rule the owner set (keep when changing numbers) | Checked by |
|---|---|
| any duo of two DIFFERENT L1 towers clears waves 1-12, the Star too, with no life lost (owner, 2026-10-22); 19 of the 21 duos is accepted - ARC+IFR and FRZ+IFR need one upgrade before the Star (owner, 2026-11-07 "2C") | `solo` (its duo table) |
| an ordinary type's count and HP never drop from one of its waves to the next (owner, 2026-10-22: "types should never get weaker along any axis") | `planCount`, `enemyHp` (aspira-waves.js) |
| every trio of kinds is winnable except the designed deaths (§4.9) (no kind required) | `trios`, `tribal` |
| no tier lowers a stat; each kind has a niche | `countermx`, `isolation`, `payoff` |
| players held to `MAX_TOWERS` (`strategy.towerCap` lifts it for test teams) | the simulator |

### 10.5 Standing owner rules

The rules that stand until the owner changes them (owner, 2026-11-07: "write it down, always write it down"). Quotes are verbatim; a row
says so where none is on file. Every new owner rule gets its row in the same commit as the change. Balance rules with their checks: §10.4.

| rule | the owner's words | date | enforced by |
|---|---|---|---|
| The mark target is frozen and is the goal | "woah, yknow what, this looks good ... save super important! priority #1"; "target already frozen"; "counter table is archaeology, target marks is the goal" | 2026-10-29, 10-31, 11-07 | `mark-target.json` + `marks.py` RULE FAIL; VS_MARKS never by hand: review (§4.8) |
| ARC is +2 vs armor (the target, not the old design) | "go by the target marks, ARC wasn't designed to be good against armor, but got here balancing the target marks. so ARC should +2 armor now" | 2026-11-07 | the target table (§4.8) |
| Every tower checks two enemy types or more | quote not on file (CLAUDE.md's wording: "Every tower beats or at least helps against two or more enemy types") | 2026-10-19 | `marks.py` RULE FAIL (`MIN_CHECKED`) |
| Marks at five point levels, 9 and 13 the targets, 0/3/6 in bands | "1B, but also add a 0 point and 3 point check"; "most important marks are 9 and 13, but 0 3 and 6 should never drift more than +/- 1 point away from target marks"; "1C" (0 points: +/-2) | 2026-11-06, 11-07 | `marks.py --band` RULE FAIL (§4.8) |
| Tiers are purchases: 0, I .. V, nothing between | "drop all the god damn levels between that can not be bought, stop listing them everywhere" | 2026-10-23 | smoke: "tiers are purchases ..." (tiers.mjs) |
| No damage step above 2x a level, each part on its own; the curve rises | "Hard rule, no level damage steps above 2x"; "just keep it below 2x for any level"; "B" (each part counts on its own) | 2026-11-01, 11-05 | smoke: "curve: by total level alone, rising, each level's hit BELOW 2x ..." (tiers.mjs) |
| Nothing shown above 800% (8x the tower's damage) | "Nothing should ever be above like 800%"; "Maybe do like 1/8xtd to 8x or something" | 2026-10-31 | smoke: "no card sentence names a number over 800% ..." (tiers.mjs) |
| No insane numbers (Strength exempt) | "Try to get this game in shape with minimal lag and no insane numbers over the next 12h"; Strength: "allow strength to ignore \"crazy numbers\" rule" | 2026-10-31, 11-07 | review |
| Armor is a curve: a hit loses R/(R+hit), at most 90% | "armor is a percentage / applied non-linearly"; "wait armor doesn't take flat amount off every hit anymore, update that" | 2026-10-28, 11-04 | `armorTake` (`ARMOR_CAP` 0.9, `ARMOR_K`); review |
| Armor strips are a share of the armor left | "all strip should be changed to a % not a flat number" | 2026-10-28 | `shredPct` tables, `SHRED_MAX` |
| No pierce (nothing ignores armor) | "Wait SoL has armour pierce? It should not / Nothing should have pierce" | 2026-10-30 | `SOL_ARMOR_PIERCE` gone; review |
| No tower damage keyed to enemy type (FRZ chill by speed and fast's double slow are the named exceptions) | "No, don't have type specific damage"; "1 yes" (FRZ chill x speed); "C it's a fast specialty" | 2026-11-06 | review |
| Fire-rate raises need the owner's pick | "but I want _you_ to avoid raising fire rate autonomously" | 2026-11-01 | smoke pins SOL's flat rate (tiers.mjs); others: review |
| No ammo cap on CRR | "Ok no ammo limit" | 2026-11-07 | `CRR_AMMO` (11 .. 40); the tiers.mjs 30-volley pin is being moved to the no-cap rule (Balance) |
| Every trio of kinds is winnable but the designed deaths | "for every combination of 3 towers, it is possible to win" | (pillar 2) | sim `trios`, `tribal` (§10.4) |
| Any two fresh towers beat the Star (ARC+IFR, FRZ+IFR exempt) | "2C" (2026-11-07: those two pairs need one upgrade before the Star); the base rule: §10.4's balance table | 2026-10-22, 11-07 | sim `duo0`, `solo` (§10.4) |
| A type never gets weaker from one of its waves to the next | "types should never get weaker along any axis" | 2026-10-22 | `planCount`, `enemyHp` |
| Empress and Judgement are untouchable while their swarms live (Empress faded, her swarms at 90 / 70 / 50% HP); Chariot's speed a smooth sine; each boss its own die; Justice and Judgement swap places - ships with the boss reorder | "empress visually reduced in opacity, untargettable and invuln while swarm is up yes / release swarm at 90% 70% 50% hp / ... / chariot, change speed from step fn to sinusoidal / ... / judgement invuln and untargettable while swarm is up"; "visually update dice shapes, (keep boss sizes) ... swap order of justice and judgement ... also update haikus" | 2026-11-07 | review; dice: `BOSS_DIE` (aspira-bosses.js) |
| A boss at the core costs its HP% left in lives (Lovers /2, Devil /6, rounded up) | "lets make bosses make you lose lives equal to the percentage of life left on the boss instead of rhe losing the game instantly. ... (Lovers gets /2, devil gets /6 lives lost rounded up, but numbers on the dice still show put of 100)" | 2026-11-03 | `bossLeakLives`; review |
| Bosses about one normal wave deep | "make sure bosses just get to about 120% of a normal wave"; then "3D" (the answer to "refit Strength/Chariot/Lovers/Devil on 100 games toward 1.0x, Temperance+Justice join the redesign"); Chariot "still OP" -> "A" (HP x1.2) | 2026-11-06, 11-07 | sim, 100 games |
| Enemies ease to 0.6x speed at the core (FRZ's bonus ignores it; the Lovers do not ease - ships with the boss reorder) | "gradually slow down the enemies from the moment they are no longer 3x speed to 0.8x when they hit the core"; "perfect, increase the ease to 60%"; "lovers speed doesn't get affected by the ease" | 2026-11-03, 11-07 | `CORE_EASE`; smoke: boss ETA with the core ease (waves.mjs) |
| Fun is the tiebreak when rules conflict | "The answer to this is whatever makes the game more fun and engaging" | 2026-11-03 | review (Leader) |
| A balance battery's changes ship as the next MINOR, and only that | "every group of changes that is the result of a balance battery run should result in a new minor version"; "stop doing the new day new minor thing" | 2026-10-19 | the ship script; review |
| A mechanic change keeps its demo scene passing | "Add a mechanism to ensure demo scenes are always up to date" | 2026-11-03 | smoke: demo coverage + behaviour (demo.mjs) |
| Demo scenes: about 90% of enemies die, tuned on the enemies only; zoomed out at least 20%, never in past the in-game tower size | "For all demo try to have ~90% enemies die"; "By adjusting the enemies"; "Also, for all demos zoom out a minimum of 20%"; "for all demos, never zoom in more than in game tower size" | 2026-11-06, 11-07 | smoke: "demo kills ..." (demo.mjs); zoom: review |
| The tower card fits every reasonable screen | "ensure all tower sections fit on tower upgrade card at any reasonable resolution" | 2026-11-06 | `tests/test_spire_cardfit_browser.py` |
| Every upgrade axis changes a visible tower-body feature | "every upgrade axis also changes a visible feature" | 2026-11-06 | review |
| Smooth glows, never stepped, unless a huge perf gain | "never use step glow unless huge perf gains" | 2026-11-06 | review |
| Lit lanes cover nothing (drawn under labels, rim circles, grid) | quote not on file | 2026-11-01 | review |
| Rarer sounds win at the voice cap | "less frequently played sounds should take priority over more frequently played sounds" (in terms of SFX concurrent limit) | 2026-11-06 | `sfxMakeRoom` (aspira-sfx.js) |
| Perf: faster consistently, not fewer spikes | "No bursts, just faster consistently" | 2026-11-05 | slow-log averages; review |
| No diag runs: perf comes from normal-play slow logs | "Use slow logs? I dont want to do the diag things" | 2026-10-31 | review |
| iOS never zooms on a double tap | "Make iOS not zoom on doubleclick" | 2026-11-07 | CSS `touch-action: manipulation` (aspira.css) |
| Every sound at one loudness in its class: towers' attacks one level, kills 3.5 dB under (they come on every death), alerts / voices / build and upgrade cues 4.4 dB over (they must stand out), SOL 6 dB over (one voice each 1.58 s where the others stack 3) | "make sure all the sounds are similar in volume" | 2026-11-07 | `sampleNorm` (each clip's 150 ms main hit to one target, peak held under 0.9) + the class gains (`gainFor`, `SOUND_GAIN`; aspira-sfx.js) |
| Auto-challenge is the viewer's choice, off by default | "under \"challenge the X\" / add a checkbox for auto-challenge"; "move auto-challenge checkbox below wave indicator when checked" | 2026-11-08 | `autoChalBox` (aspira-wavelist.js); review |
| SOL's main beam is never thinner than a child beam | "SOLs primary beam should never be thinner than any of the child beams" | 2026-11-08 | smoke: "SOL's main beam is never thinner than a child beam ..." (sol.mjs); `solTrackBeams` |
| Tower bodies occlude their own decorations behind them | "frz tower needs to occlude" | 2026-11-08 | each tower's far pass draws before its prism, its near pass after (`drawOrbiters`); FRZ's bake carries a depth-only prism at the full visible height (`ice3dTower`, `ice3dProj` sh); review |
| Player-facing prose (cards, UI copy, changelog lines, the release entry) goes through the humanizer before it ships; not the owner's own words, not code | "install this globally and use wherever you want a human to read things"; "human other than me" | 2026-11-08 | review before ship (the humanizer skill) |
| Every upgrade path about equally useful: each path-led build within 3 team-leak points of the tower's mean, judged in teams over every legal build | "now for the upgrade paths / make it so that, each upgrade path leaks roughly the same amount across types"; "i.e. different upgrades will naturally result in different types being affected more or less, but I want them all to the equally useful"; "Make sure balanced when playing"; 2026-11-08: "when checking axis combinations, check all, not just one axis at a time" | 2026-11-07 | Balance's team path test (every legal build beside a fixed partner panel) |
| More, thinner bodies when two settings are close | "go for more bodies whenever that choice presents itself to be reasonable." | 2026-10-29 | review (Balance) |
| Each ARC jump only goes further out from the vertex that fired it | "also, this may affect balance, but make it so that, for each subsequent arc, it can only choose targets that are radially further from ARC tower vertex that fired it" | 2026-11-06 | code (`aspira-arc.js`, "every jump goes further out") |
| CRR's interceptors fire only once turned to face the target | "do not fire until the turning is done for CRR" | 2026-11-06 | code (`aspira-crr.js`, "it turns before it fires") |
| A boss wave's card shows its escort like any wave, the boss at the centre | "no, just show escort like other waves, but keep boss at center" | 2026-11-06 | code (`aspira-wavelist.js`) |
| IFR's glow is only as wide as its hitbox; flare sizes change only on the owner's word | "the glow should only be as wide as the hitbox" (the size lock's quote not on file) | 2026-10-20 | review |
| The carrier is CRR everywhere (kind id `crr`) | "Rename all instances of CAR to CRR jesus." | 2026-10-29 | kind id `crr`; smoke: an old `car` save comes back as `crr` |
| Ship each finished change at once | "can you release to prod more often?" | 2026-11-05 | `spire-ship2.sh` per change; a battery ships once its bosses-on half passes the gate; review (Leader) |
| GitHub push retries at most once every 10 minutes | "No automatic retry loops against GitHub / Actually no / 1 try every 10 min is OK" | 2026-11-04 | `spire-ship2.sh` pushes once; review (Leader) |
| CRR's Hangar V is Warp Drive: the way out at 3000 u a second, unseen, back in view just before the turn; no retarget at any tier | "no retarget / instead, warp drive / when an interceptor is needed, quickly fade opacity to 0, increase fly-to speed to 3000, then when the interceptor is near enemy (just before starting to turn to face them) face opacity back to 100" | 2026-11-09 | `aspira-crr.js` (i.warp), `aspira-crr-draw.js` (carWarpA); smoke: the Hangar V demo shows a warp (`showsV`) |
| Every tower card has a main hit that reads 100%td at every level and tier (display only) | "multiply td by 6.07 and this should say 100%td / check if this is the case with other towers and fix / For each tower, at each level, _something_ should do 100%td (update this without affecting actual damage) preferrably the most often applied piece of damage (or the median, if there is a big damage range and we want to avoid crazy numbers)" | 2026-11-09 | code (`cardMain`, `pcd` - `aspira-desc.js`; `tdOf` x `cardMain` - `aspira-stats.js`): SOL a shot, FRZ a second of its aura, GRV the middle of its crush, ARC / CRR / IFR their hit, ACD the middle of its jet's ramp (its old unit); smoke pin (`tiers.mjs`, FRZ tier 0 100%td) |
| SOL's beam shows twice as long (look only) | "visual-only: double duration of SOL beams" | 2026-11-09 | code (`SOL_PULSE_FLASH` 0.3 s, `aspira-effects.js`; `SOL_FL_KEEP` with it) |
| A tertiary meteor (the re-split small one) shows a small circle where it hits: 40 u across, in the fire circle's look, growing as it fades over 0.5 s (look only) | "just visually, tertiary meteors should show a small 40u circle on hit as well" | 2026-11-10 | code (`IFR_MINI_R`, `ifrMiniHit`, `drawIfrMini`) |
| Tertiary meteors drawn at 2x their size, the secondaries already were; hitboxes unchanged (look only) | "visual, double size of ifr secondary and tertiary meteors" | 2026-11-10 | code (`drawIfrBalls` sizeK) |
| SOL's Breach blades ride the tower: each blade's top keeps its level-8 offset (absolute) above or below this tower's height; a blade wholly underground is not drawn | "For SOL breach blade appearance, I like the current look at level 8 / Calculate in a nonrelative unit how much taller/shorter each blade is than the tower at level 8 / Then do tower height +/- that calculated height for each blade, no need to render blades that are completely in the ground" | 2026-11-09 | code (`SOL_BLADE_REF`, `solBladeGeo`, `aspira-sol-body.js`); level 8 pixel-identical |
| SOL's blade height scales by Breach tier: I 0.3, II 0.525, III 0.75, IV 0.975, V 1.2 of the riding height | "breach blade height should start at 30% of current height, up until the current height *1.2 at breach5" | 2026-11-10 | code (`SOL_BLADE_TIER_H`, `aspira-sol-body.js`) |
| An enemy's shield spokes FADE past the rings' cap: each spoke stands for (N - L) / spokes charges (L = the last layer's chips), a charge lost dims a random lit spoke by that share, then the last layer pops a chip a charge as before; at or under the cap, unchanged | "for shielded unit visuals: the the number of shields should be divided by the max number of spokes +2 (when > max spokes +2), every shield lost reduces opacity of a random spoke by some value (until all spokes are at 0 opacity) then for the last 2 shield (empty rhombus and empty triangle) continue popping as now" | 2026-11-09 | code (`shieldFade`, `aspira-enemies.js`; alphas in `SHIELD_AL_STEPS` strokes, `aspira-walls.js`) |
| CRR's Armament fires SALVOS: whole volleys of 4 4 5 6 6 6 bolts, a pair from each V tip plus one or two from the centre, the volleys that much slower; a sortie deals what it did | "4 bolts per volley at arm 0 (1/4 rate), a pair of bolts from each triangle tip / 4 @ 1 / 5 @ 2 (one middle) / 6 @ 3+ (pair middle)" / "bolts per sortie isn't multiple of volleys and bolts" / "doesn't need balance run, should be basically cosmetic" | 2026-11-09 | code (`CRR_SALVO`, `CRR_AMMO` counts volleys 3 5 6 7 7 7, `CRR_BOLTS_BY` x old / new bolts - `aspira-crr.js`; the spots - `carBoltTip`, `aspira-crr-draw.js`); smoke (`tiers.mjs`, tier 0 and Armament I) |
| Score is gone | "remove anything based around score" | 2026-10-29 | code (§3) |

