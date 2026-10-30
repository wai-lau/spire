"""/spire landscape play box (WebKit / playwright): the box follows the window shape, and switches only between waves.

Self-contained: the page is built from THIS checkout's template and served from its web/ (then exec-fn's web/ for chrome.css),
so it tests the worktree, not whatever the live server holds.

    cd <exec-fn> && .venv/bin/pytest apps/spire/tests/test_spire_landscape_browser.py -q -p no:cacheprovider
"""
from pathlib import Path

import pytest

pytest.importorskip("playwright.sync_api")
from playwright.sync_api import sync_playwright  # noqa: E402

pytestmark = pytest.mark.browser

HERE = Path(__file__).resolve()
REPO = HERE.parent.parent
EXEC_FN = next(p for p in HERE.parents if (p / "api/main.py").exists() and (p / "web/chrome.css").exists())
TEMPLATE = (REPO / "api/templates/aspira.html").read_text()
HTML = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<link rel="stylesheet" href="/chrome.css"></head><body>' + TEMPLATE + "</body></html>")
HOST = "http://spire.test"


def _serve(route):
    path = route.request.url[len(HOST):].split("?")[0].split("#")[0]
    if path in ("", "/", "/spire.html"):
        return route.fulfill(status=200, content_type="text/html", body=HTML)
    for root in (REPO / "web", EXEC_FN / "web"):
        f = root / path.lstrip("/")
        if f.is_file() and root.resolve() in f.resolve().parents:
            return route.fulfill(status=200, path=str(f))
    route.fulfill(status=404, body="")


@pytest.fixture(scope="module")
def _pw():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="module")
def _browser(_pw):
    b = _pw.webkit.launch()
    yield b
    b.close()


@pytest.fixture
def spire_page(_browser):
    """spire_page(w, h): a ready /spire page at that viewport."""
    ctxs = []

    def make(w=1280, h=800):
        ctx = _browser.new_context(viewport={"width": w, "height": h})
        ctxs.append(ctx)
        page = ctx.new_page()
        page.route(HOST + "/**", _serve)
        page.goto(HOST + "/spire.html")
        page.wait_for_function("typeof G === 'object'")
        return page

    yield make
    for c in ctxs:
        c.close()


def test_landscape_window_gets_the_wide_box(spire_page):
    assert spire_page(1280, 800).evaluate("BOX_WIDE") is True


def test_portrait_window_gets_the_tall_centred_box(spire_page):
    page = spire_page(390, 844)
    b = page.evaluate("[BOX_WIDE, phoneBox().y0 + phoneBox().y1 - 2 * CY]")
    assert b[0] is False and abs(b[1]) < 1e-9


def test_no_switch_mid_wave(spire_page):
    page = spire_page(1280, 800)
    page.evaluate("G.started = true; sendWave()")
    page.wait_for_function("G.enemies.some(e => !e.dead)")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(600)
    assert page.evaluate("BOX_WIDE") is True  # still wide while enemies ride
    page.evaluate("for (const e of G.enemies) e.dead = true; G.spawns.length = 0; G.fleetQ.length = 0; G.nextIn = 30")
    page.wait_for_function("BOX_WIDE === false", timeout=3000)


PHONES = [(360, 640), (375, 667), (390, 664), (393, 659), (412, 732), (430, 740)]


@pytest.mark.parametrize("w,h", PHONES)
def test_wave_list_clears_core_and_starting_slots(spire_page, w, h):
    page = spire_page(w, h)
    page.evaluate("G.started = true; sendWave()")
    page.wait_for_timeout(600)
    hit = page.evaluate("""() => { const L = document.querySelector('.asp-left').getBoundingClientRect();
      const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const spots = [[CX, CY, CORE_R], ...CELLS.filter(c => OPEN_SLOTS.includes(c.ang)).map(c => [c.x, c.y, CELL_S])];
      return spots.filter(([x, y, r]) => ov(L, boardScreenRect(x, y, r))).length; }""")
    assert hit == 0
    assert page.evaluate("document.querySelector('.asp-dots').getBoundingClientRect().height") == 14


CHALLENGE_VIEWS = [(360, 640), (640, 360), (844, 390)]


@pytest.mark.parametrize("w,h", CHALLENGE_VIEWS)
def test_challenge_button_stays_in_window_clear_of_speed_bar_and_wave_list(spire_page, w, h):
    page = spire_page(w, h)
    page.evaluate("G.started = true; G.wave = STAR_EVERY; G.enemies.length = 0; G.spawns.length = 0; "
                  "bossInv.phase = 'off'; bossInv.offAt = 0; G.nextIn = 30; refreshPanels(); fitWaveList()")
    page.wait_for_timeout(1500)
    r = page.evaluate("""() => {
      const R = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const btn = document.getElementById('asp-challenge');
      const vis = !btn.hidden && btn.style.visibility !== 'hidden';
      const speed = [...document.querySelectorAll('#asp-speed button')].map(R);
      const list = [...document.getElementById('asp-wavenote').children].filter(c => !c.style.display && c.offsetHeight).map(R);
      return { vis, btn: R(btn), speed, list, w: innerWidth, h: innerHeight }; }""")
    assert r["vis"]
    b = r["btn"]
    assert b["l"] >= 0 and b["t"] >= 0 and b["r"] <= r["w"] and b["b"] <= r["h"], b
    hit = lambda o: b["l"] < o["r"] and o["l"] < b["r"] and b["t"] < o["b"] and o["t"] < b["b"]  # noqa: E731
    assert not any(hit(o) for o in r["speed"]), "over the speed buttons"
    assert not any(hit(o) for o in r["list"]), "over the wave list"


def test_resize_before_the_first_wave_switches_promptly(spire_page):
    page = spire_page(1280, 800)
    assert page.evaluate("G.started") is False
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_function("BOX_WIDE === false", timeout=3000)


# --- the landscape tilt: the on-screen floor area equals portrait's (needs WebGL: WebKit has it headless; Playwright's Chromium 148
# headless shell gets no WebGL context with any swiftshader/angle flag, so these ran on chromium + swiftshader only until 2026-10-30) ---


@pytest.fixture
def gl_page(_pw):
    ctxs = []
    b = _pw.webkit.launch()

    def make(w, h, **opts):
        ctx = b.new_context(viewport={"width": w, "height": h}, **opts)
        ctxs.append(ctx)
        page = ctx.new_page()
        page.route(HOST + "/**", _serve)
        page.goto(HOST + "/spire.html")
        page.wait_for_function("typeof G === 'object' && !!warp.p", timeout=20000)
        page.wait_for_timeout(300)
        return page

    yield make
    for c in ctxs:
        c.close()
    b.close()


@pytest.mark.parametrize("w,h", [(844, 390), (640, 360), (1280, 800)])
def test_landscape_floor_area_matches_portrait_on_the_same_screen_turned(gl_page, w, h):
    page = gl_page(w, h)
    assert page.evaluate("q3d()") is True and page.evaluate("BOX_WIDE") is True
    area, tilt = page.evaluate("[boxFloorArea(), warpTilt()]")
    turned = gl_page(h, w)  # the same screen held the other way: portrait at the default tilt
    assert turned.evaluate("BOX_WIDE") is False
    goal = turned.evaluate("boxFloorArea()")
    print("AREA", w, h, area, goal, tilt)
    assert abs(area - goal) <= 0.02 * goal
    assert page.evaluate("tiltSolved !== \"\"") is True


def test_portrait_keeps_the_default_tilt(gl_page):
    page = gl_page(390, 844)
    assert page.evaluate("BOX_WIDE") is False
    assert page.evaluate("warpTilt() === WARP.tilt && WARP.tilt === 0.55") is True


# --- desktop scroll zoom (owner, 2026-10-19): the wheel zooms the VIEW about the core; the gameplay box stays the fit's ---
def _set_zoom(page, z):
    page.evaluate(f"viewZoom = {z}; zoomApply()")
    page.wait_for_timeout(250)  # a few frames: warp.p made under the new view


def test_desktop_starts_zoomed_out_and_the_wheel_zooms_in_to_the_cap(gl_page):
    page = gl_page(1280, 800)
    assert abs(page.evaluate("cam.k / cam.fit") - 0.7) < 1e-6
    core = "[cam.ox + CX * cam.k - (cam.fitOx + CX * cam.fit), cam.oy + CY * cam.k - (cam.fitOy + CY * cam.fit)]"
    page.mouse.move(640, 400)
    page.mouse.wheel(0, -100)
    page.wait_for_timeout(100)
    z1 = page.evaluate("cam.k / cam.fit")
    assert 0.72 < z1 < 0.85, z1  # one notch ~10%
    assert all(abs(d) < 1e-6 for d in page.evaluate(core))  # about the core: it keeps its fitted spot
    for _ in range(30):
        page.mouse.wheel(0, -100)
    page.wait_for_timeout(100)
    assert abs(page.evaluate("cam.k / cam.fit") - 1.5) < 1e-6
    for _ in range(40):
        page.mouse.wheel(0, 100)
    page.wait_for_timeout(100)
    assert abs(page.evaluate("cam.k / cam.fit") - 0.5) < 1e-6
    assert all(abs(d) < 1e-6 for d in page.evaluate(core))


GRID = """(() => { const out = []; for (let x = CX - 900; x <= CX + 900; x += 30) for (let y = CY - 900; y <= CY + 900; y += 30)
  out.push(phoneInside(x, y) ? 1 : 0); return out.join(""); })()"""
LEGAL = """(() => { const c = CELLS[CELLS.reduce((b, c, i) => Math.hypot(c.x - CX, c.y - CY) > Math.hypot(CELLS[b].x - CX, CELLS[b].y - CY) ? i : b, 0)];
  const t = { id: -1, kind: "acd", cell: CELLS.indexOf(c), x: c.x, y: c.y, lvl: 5, cd: 0, mode: DEFAULT_MODE.acd, spent: 0 }, out = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, s = legalSpot(t, { x: c.x + Math.cos(a) * 2000, y: c.y + Math.sin(a) * 2000 });
    out.push(s ? s.x.toFixed(3) + "," + s.y.toFixed(3) : "null"); } return out; })()"""


@pytest.mark.parametrize("w,h", [(1280, 800), (800, 1000)])
def test_the_gameplay_box_is_the_same_at_every_zoom(gl_page, w, h):
    page = gl_page(w, h)
    seen = {}
    for z in (0.7, 1.0, 1.4):
        _set_zoom(page, z)
        assert abs(page.evaluate("cam.k / cam.fit") - z) < 1e-6
        seen[z] = (page.evaluate(GRID), page.evaluate(LEGAL), page.evaluate("bossBarR()") if page.evaluate("typeof bossBarR") == "function" else 0)
    grid = seen[1.0][0]
    assert "0" in grid and "1" in grid
    assert seen[0.7] == seen[1.0] == seen[1.4]


def test_the_outline_draws_the_gameplay_box_under_the_zoomed_view(gl_page):
    page = gl_page(1280, 800)
    _set_zoom(page, 0.7)
    # every fit-box corner, through the floor and the zoomed view, lands INSIDE the screen (smaller than it)
    pts = page.evaluate("phoneOutline3d().map(q => [q.x, q.y, warp.ent.width, warp.ent.height])")
    assert len(pts) == 4
    for x, y, W, H in pts:
        assert 0 < x < W and 0 < y < H, (x, y, W, H)
    _set_zoom(page, 1.0)
    b = page.evaluate("viewCam(() => { const b = phoneRect3d(); return [b.x0, b.y0, b.x1, b.y1]; })")
    pts = page.evaluate("phoneOutline3d().map(q => [q.x, q.y])")
    xs, ys = sorted(p[0] for p in pts), sorted(p[1] for p in pts)
    assert abs(xs[0] - b[0]) < 0.5 and abs(xs[-1] - b[2]) < 0.5 and abs(ys[0] - b[1]) < 0.5 and abs(ys[-1] - b[3]) < 0.5


def test_touch_phone_has_no_zoom(gl_page):
    page = gl_page(390, 844, has_touch=True, is_mobile=True)
    assert page.evaluate("matchMedia('(pointer: fine)').matches") is False
    assert page.evaluate("cam.k === cam.fit && viewZoom === 1") is True
    page.evaluate("""document.elementFromPoint(195, 422).dispatchEvent(new WheelEvent("wheel",
      { deltaY: -300, clientX: 195, clientY: 422, bubbles: true, cancelable: true }))""")  # (mobile WebKit refuses page.mouse.wheel)
    page.wait_for_timeout(100)
    assert page.evaluate("cam.k === cam.fit") is True
