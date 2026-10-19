# Landscape Play Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centre the core in the play box, give landscape screens the portrait box turned 90 degrees (slots turned with it), turn every wave's lanes to even out their copies' on-screen lengths, and keep the portrait wave list compact and clear of the core and the starting slots.

**Architecture:** The play box becomes two half-extents (`BOX_HX`, `BOX_HY`) set by `setPlayBox(wide)` in `aspira-positioning.js`; every consumer already goes through `phoneBox()` / `phoneRect3d()` / `phoneInside()` / `resize()`, so those read the half-extents. `setPlayBox` also turns `CELLS` and built towers 90 degrees about the core and clears the box-keyed caches. A switch requested by a resize waits for a clear field. The lane pick in `aspira-waves.js` scores turns by the spread of the copies' on-screen lengths.

**Tech Stack:** vanilla JS game scripts (`web/aspira-*.js`, classic scripts sharing one global scope), the node smoke test (`scripts/spire-smoke/smoke.mjs`, fake DOM in `dom.mjs`), pytest + playwright WebKit browser tests (`tests/test_spire_*_browser.py`, run from exec-fn with `.venv/bin/pytest apps/spire/tests`).

**Spec:** `docs/superpowers/specs/2026-10-19-landscape-box-design.md`

## Global Constraints

- Portrait box: half-width `BOX_SHORT` = today's `VIEW_SIDE` (`min(PHONES w)/2 / PHONE_ZOOM`); half-height `BOX_LONG` = (today's `VIEW_UP` + `VIEW_DOWN`) / 2 - the same total height as today, core in the middle.
- Landscape box: `BOX_HX = BOX_LONG`, `BOX_HY = BOX_SHORT` - the portrait box turned 90 degrees exactly.
- Landscape = `innerWidth > innerHeight`.
- The 3D camera and its tilt do not change. No UI or text turns.
- The board never switches box mid-fight: only when `waveClear()` and the lane preview (`laneSoon()`) is empty, or before the first wave.
- `CELLS[i]` keeps its index, `ang` and unlock data; only `x`, `y`, `pts` turn.
- 500-line cap per `.js` (pre-commit); `aspira-defs.js` is at 497 - add nothing there.
- Every player-facing change: a changelog line (`web/aspira-changelog.js`, top entry) and a version bump (`web/aspira-version.txt`). This is a balance change but NOT a battery's: PATCH bump (the battery that follows takes the MINOR).
- Commit inside `apps/spire`; `[skip-docs]` only where ARCHITECTURE.md truly needs nothing.

## Review Focus

1. A resize that flips the shape during a boss, a formation still riding in, or the 3 s lane preview: no switch until the field is clear - the board must not jump mid-fight.
2. A tower flung off its slot (`t.x/t.y` away from `CELLS[t.cell]`) when the box switches: its offset turns with the slot, then `legalSpot` clamps it inside the new box.
3. A save made in landscape resumed on a portrait screen (and back): towers stand on the active box's slots.
4. A near-square window resized back and forth across 1:1 between waves: each switch completes (slots, towers, caches, zoom) with no leftover from the other box.
5. 3D and 2D both: `phoneRect3d` and the 2D `phoneBox` give the same box at load, after a switch, and after a window resize.

---

### Task 1: Centred box, two shapes, `setPlayBox`

**Files:**
- Modify: `web/aspira-positioning.js:162-200` (the play box)
- Modify: `web/aspira-draw.js:12-31` (`resize` and its comment)
- Modify: `scripts/spire-smoke/dom.mjs:117,154` (`makeDom(template, store, view)`)
- Modify: `scripts/spire-smoke/smoke.mjs:18` (`boot(store, view)`)
- Test: `scripts/spire-smoke/smoke.mjs` (new checks)

**Interfaces:**
- Produces: `const BOX_SHORT, BOX_LONG` (world units); `let BOX_HX, BOX_HY, BOX_WIDE`; `function setPlayBox(wide: boolean): void` (sets the half-extents, `phoneBoxC = null`, `laneTurnCache.clear()` if defined, `resize()` and `fitK = cam.fit` if defined, then `turnSlots(wide)` from Task 2 if defined); `const boxWanted = () => innerWidth > innerHeight`.
- `phoneBox()` -> `{ x0: CX - BOX_HX, y0: CY - BOX_HY, x1: CX + BOX_HX, y1: CY + BOX_HY, r: PHONE_CORNER }`; `phoneRect3d()` the same in view pixels.
- `resize()`: fits `2*BOX_HX` x `2*BOX_HY`, core at the window's centre (`cam.oy = (r.height / 2 - CY * k) * dpr`).
- Smoke: `makeDom(template, store = {}, view = { w: 1280, h: 800 })`, `boot(store = {}, view)`.
- `VIEW_UP_K`, `VIEW_UP`, `VIEW_DOWN`, `VIEW_SIDE` are removed; `BOX_LONG` keeps today's arithmetic for the total height.

- [ ] **Step 1: Write the failing smoke checks**

```js
check("play box: portrait is centred, landscape is it turned 90 degrees", () => {
  const p = boot({}, { w: 390, h: 844 }), w = boot({}, { w: 1280, h: 800 });
  const bp = p.run("phoneBox()"), bw = w.run("phoneBox()"), cx = p.run("CX"), cy = p.run("CY");
  if (p.run("BOX_WIDE") || !w.run("BOX_WIDE")) return "BOX_WIDE should follow the window's shape";
  if (Math.abs((cy - bp.y0) - (bp.y1 - cy)) > 1e-9) return "portrait core not centred top-bottom";
  if (Math.abs((bw.x1 - bw.x0) - (bp.y1 - bp.y0)) > 1e-9 || Math.abs((bw.y1 - bw.y0) - (bp.x1 - bp.x0)) > 1e-9) return "landscape box is not the portrait box turned";
  if (Math.abs((bp.y1 - bp.y0) - 2 * p.run("BOX_LONG")) > 1e-9) return "portrait height is not 2 x BOX_LONG";
});
```

- [ ] **Step 2: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: FAIL (`boot` ignores `view`; `BOX_WIDE` undefined).
- [ ] **Step 3: Implement** the Interfaces above. `setPlayBox(boxWanted())` runs once when `aspira-positioning.js` loads (before any draw, before `runOffer`). Update the long comments above the box and in `aspira-draw.js` (core centred, two shapes).
- [ ] **Step 4: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: all pass.
- [ ] **Step 5: Commit** (`web/aspira-positioning.js web/aspira-draw.js scripts/spire-smoke/*.mjs`): "Play box: core centred, landscape = portrait turned (BOX_HX/HY, setPlayBox)".

### Task 2: Slots and towers turn with the box

**Files:**
- Modify: `web/aspira-positioning.js` (new `turnSlots`, called by `setPlayBox`)
- Test: `scripts/spire-smoke/smoke.mjs`

**Interfaces:**
- Consumes: `setPlayBox`, `BOX_WIDE` (Task 1).
- Produces: `function turnSlots(wide: boolean): void` - each `CELLS[i]` remembers its portrait `x, y, pts` the first time (`c.px, c.py, c.ppts`); wide sets them to those turned +90 degrees about `(CX, CY)` (`x' = CX - (y - CY)`, `y' = CY + (x - CX)`), portrait restores them exactly. Each built tower moves with its slot: its offset from the slot's old spot turned by the same quarter turn, then `legalSpot` (aspira-towers.js) if it is off the slot. `t.home` / any stored slot position follows if the tower stores one.

- [ ] **Step 1: Write the failing smoke checks**

```js
check("slots: landscape is portrait turned +90 degrees; switching back restores exactly", () => {
  const e = boot({}, { w: 390, h: 844 });
  const r = e.run(`(() => { const before = CELLS.map(c => [c.x, c.y, c.ang]); setPlayBox(true);
    const turned = CELLS.every((c, i) => Math.abs(c.x - (CX - (before[i][1] - CY))) < 1e-9 && Math.abs(c.y - (CY + (before[i][0] - CX))) < 1e-9 && c.ang === before[i][2]);
    setPlayBox(false); const back = CELLS.every((c, i) => c.x === before[i][0] && c.y === before[i][1]); return { turned, back }; })()`);
  if (!r.turned) return "landscape slots are not the portrait slots turned +90";
  if (!r.back) return "portrait slots not restored exactly";
});
check("a built tower moves with its slot when the box switches", () => {
  const e = boot({}, { w: 390, h: 844 });
  const r = e.run(`(() => { G.money = 1e6; ui.build = "arc"; const c = CELLS[0]; placeTower({ x: c.x, y: c.y }); const t = G.towers[0];
    setPlayBox(true); return Math.hypot(t.x - CELLS[t.cell].x, t.y - CELLS[t.cell].y); })()`);
  if (r > 1e-6) return "tower left " + r + "u from its turned slot";
});
```

- [ ] **Step 2: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: FAIL (`turnSlots` missing).
- [ ] **Step 3: Implement** `turnSlots` as in Interfaces; `setPlayBox` calls it.
- [ ] **Step 4: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: all pass.
- [ ] **Step 5: Commit**: "Slots and towers turn 90 degrees with the landscape box (turnSlots)".

### Task 3: Switch only between waves

**Files:**
- Modify: `web/aspira-positioning.js` (the resize listener and a pending switch)
- Modify: `web/aspira-perflog.js` (the report records `box: BOX_WIDE ? "wide" : "tall"`)
- Test: `tests/test_spire_landscape_browser.py` (new; copy the `guest_page` fixture pattern from `tests/test_spire_sliders_browser.py`, `pytestmark = pytest.mark.browser`)

**Interfaces:**
- Consumes: `setPlayBox`, `boxWanted`, `BOX_WIDE`; `waveClear()` (aspira-waves.js), `laneSoon()` (aspira-waves.js).
- Produces: `let boxPending = null` and `function boxSwitchIfIdle(): void` - applies `setPlayBox(boxPending)` when `boxPending !== null && boxPending !== BOX_WIDE && (!G.started || (waveClear() && !laneSoon().length))`, then clears it. A `resize` listener sets `boxPending = boxWanted()`; `boxSwitchIfIdle` runs from the existing `setInterval` cadence (250 ms) or the frame loop - the builder's choice, but NOT from `step()` (the simulator must not see it).

- [ ] **Step 1: Write the failing browser tests**

```python
def test_landscape_window_gets_the_wide_box(guest_page):  # 1280x800
    assert guest_page.evaluate("BOX_WIDE") is True

def test_portrait_window_gets_the_tall_centred_box(guest_page):
    guest_page.set_viewport_size({"width": 390, "height": 844}); guest_page.reload(); guest_page.wait_for_function("typeof G === 'object'")
    b = guest_page.evaluate("[BOX_WIDE, phoneBox().y0 + phoneBox().y1 - 2 * CY]")
    assert b[0] is False and abs(b[1]) < 1e-9

def test_no_switch_mid_wave(guest_page):
    guest_page.evaluate("G.started = true; sendWave()")
    guest_page.wait_for_function("G.enemies.some(e => !e.dead)")
    guest_page.set_viewport_size({"width": 390, "height": 844}); guest_page.wait_for_timeout(600)
    assert guest_page.evaluate("BOX_WIDE") is True          # still wide while enemies ride
    guest_page.evaluate("for (const e of G.enemies) e.dead = true; G.spawns.length = 0; G.fleetQ.length = 0; G.nextIn = 30")
    guest_page.wait_for_function("BOX_WIDE === false", timeout=3000)
```

- [ ] **Step 2: Run** `.venv/bin/pytest apps/spire/tests/test_spire_landscape_browser.py -q` (from exec-fn) - Expected: the mid-wave test FAILS (it switches at once or never).
- [ ] **Step 3: Implement** `boxPending` / `boxSwitchIfIdle` and the perflog field.
- [ ] **Step 4: Run** the same command - Expected: 3 passed.
- [ ] **Step 5: Commit**: "Box switches only on a clear field; perflog records the box".

### Task 4: Lanes even out their copies

**Files:**
- Modify: `web/aspira-waves.js:276-323` (`laneTurnScores`, `laneBestTurn`, their comment block)
- Test: `scripts/spire-smoke/smoke.mjs`

**Interfaces:**
- Produces: `laneTurnScores(pi, k)` -> an array of `LANE_TURNS` entries `{ spread: number, total: number }` - per turn, the k copies' on-screen lengths (measured as today), `spread = max - min`, `total = sum`; cache key gains the box (`BOX_WIDE`). `laneBestTurn(pi, k, n)`: candidates = turns with `spread <= minSpread + LANE_EVEN_SLACK * maxTotal`; of those, turns with `total >= bestCandidateTotal * (1 - LANE_TURN_SLACK)`; of those, nearest the wave's usual `laneTurn(n)` (as today). `const LANE_EVEN_SLACK = 0.02`. k = 1: spread is 0 everywhere, so it reduces to today's rule.

- [ ] **Step 1: Write the failing smoke check**

```js
check("lanes: every pick has the smallest copy spread (within slack)", () => {
  const e = boot({}, { w: 390, h: 844 });
  const bad = e.run(`(() => { const out = []; for (let pi = 1; pi < PATHS.length; pi += 2) for (const k of [2, 3, 6]) {
      const sc = laneTurnScores(pi, k), t = laneBestTurn(pi, k, 7), i = Math.round(t / (Math.PI * 2 / LANE_TURNS)) % LANE_TURNS;
      const minS = Math.min(...sc.map(s => s.spread)), maxT = Math.max(...sc.map(s => s.total));
      if (sc[i].spread > minS + LANE_EVEN_SLACK * maxT + 1e-9) out.push(pi + "/" + k); } return out; })()`);
  if (bad.length) return "picks not the most even: " + bad.join(", ");
});
```

(The smoke boot has no 3D warp, so `laneBestTurn` must not return early there: check how it gates on `warp.p` / `AUTO_POS` and pass `SIM_REAL_LANES = true` in the check if needed.)

- [ ] **Step 2: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: FAIL (`.spread` undefined).
- [ ] **Step 3: Implement** the Interfaces; `laneSoon` keeps calling `laneBestTurn` unchanged.
- [ ] **Step 4: Run** `node scripts/spire-smoke/smoke.mjs` - Expected: all pass.
- [ ] **Step 5: Commit**: "Lanes turned so a wave's copies have the most similar on-screen lengths (LANE_EVEN_SLACK)".

### Task 5: Portrait wave list compact, never over the core or the starting slots

**Files:**
- Modify: `web/aspira-wavelist.js:5,50,119-143` (row height by screen)
- Modify: `web/aspira.css:63-90,693` (`.asp-left` portrait-phone rules)
- Test: `tests/test_spire_landscape_browser.py`

**Interfaces:**
- Consumes: `BOX_WIDE` (Task 1); `CELLS`, `OPEN_SLOTS`, `CX`, `CY`, `CORE_R`; `warpProject` (3D) / `cam` (2D) for screen spots.
- Produces: `const WAVE_ROW_H_PHONE = 14` (portrait phone; landscape and desktop keep `WAVE_ROW_H` 22); `function waveRowH(): number`; `function boardScreenRect(x: number, y: number, r: number): DOMRect-like {left, top, right, bottom}` in CSS px (3D: through `warpProject`; 2D: `cam`); `function fitWaveList(): void` - after `updateWaveList` lays out, while `.asp-left`'s rect overlaps the core's rect (`r = CORE_R`) or an OPEN starting slot's (`r = CELL_S`) plus `var(--space-2)`, it drops the last row (down to the live waves); runs on every list update and on resize.

- [ ] **Step 1: Write the failing browser test**

```python
PHONES = [(360, 640), (375, 667), (390, 664), (393, 659), (412, 732), (430, 740)]

@pytest.mark.parametrize("w,h", PHONES)
def test_wave_list_clears_core_and_starting_slots(guest_page, w, h):
    guest_page.set_viewport_size({"width": w, "height": h}); guest_page.reload(); guest_page.wait_for_function("typeof G === 'object'")
    guest_page.evaluate("G.started = true; sendWave(); updateHud && updateHud()"); guest_page.wait_for_timeout(400)
    hit = guest_page.evaluate("""() => { const L = document.querySelector('.asp-left').getBoundingClientRect();
      const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const spots = [[CX, CY, CORE_R], ...CELLS.filter(c => OPEN_SLOTS.includes(c.ang)).map(c => [c.x, c.y, CELL_S])];
      return spots.filter(([x, y, r]) => ov(L, boardScreenRect(x, y, r))).length; }""")
    assert hit == 0
```

- [ ] **Step 2: Run** `.venv/bin/pytest apps/spire/tests/test_spire_landscape_browser.py -q -k wave_list` - Expected: FAIL (`boardScreenRect` undefined).
- [ ] **Step 3: Implement** the Interfaces (row spacing in CSS via a portrait-phone media query `(orientation: portrait) and (width < 700px)`, matching `waveRowH()`).
- [ ] **Step 4: Run** the same command - Expected: 6 passed.
- [ ] **Step 5: Commit**: "Portrait wave list compact (WAVE_ROW_H_PHONE 14), never over the core or a starting slot (fitWaveList)".

### Task 6: Ship

**Files:**
- Modify: `ARCHITECTURE.md` (the play box rows of §7 / §10 that describe the box, the core's place, lane turning, the wave list), `web/aspira-changelog.js` (top entry, `u`/balance lines), `web/aspira-version.txt` (next PATCH)

- [ ] **Step 1:** Run `node scripts/spire-smoke/smoke.mjs` and `.venv/bin/pytest apps/spire/tests -q` (from exec-fn) - Expected: all pass.
- [ ] **Step 2:** Changelog lines (player words, a fact each): "Board: the core sits in the middle of the screen; on a landscape screen the board turns to fill it." / "Lanes: a wave's lanes are turned so each copy is on screen about as long as the others." / "Wave list: tighter rows on phones, never over the core or the first tower slots." Version: next PATCH.
- [ ] **Step 3:** ARCHITECTURE.md: replace the box description (core `VIEW_UP_K` above centre) with the centred two-shape box, `setPlayBox` / `turnSlots` / the between-waves switch, the lane rule (`LANE_EVEN_SLACK`), and `fitWaveList`.
- [ ] **Step 4:** Commit in `apps/spire`, push, bump exec-fn's pointer, deploy (`ssh wai-root@wai-lau.net 'bash /exec-fn/scripts/deploy.sh'`), check `https://wai-lau.net/aspira-version.txt`.
- [ ] **Step 5:** Hand off to the balance battery (the owner's next step): the box and lane rule change balance, so marks and trios rerun after this ships.
