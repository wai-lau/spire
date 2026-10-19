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
def _browser():
    with sync_playwright() as p:
        b = p.webkit.launch()
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


def _lit(page):
    # (wave = a boss just beaten: the field is clear and the Challenge button holds the next wave back, yet the next ordinary wave's lanes preview)
    page.evaluate("""G.started = true; G.wave = STAR_EVERY; G.over = false; bossInv.phase = "off"; G.enemies.length = 0; G.spawns.length = 0; G.fleetQ.length = 0;
      G.nextIn = 2; window.__lit = laneSoon().length""")
    return page.evaluate("window.__lit")


def test_resize_waits_while_the_lane_preview_is_lit_then_switches(spire_page):
    page = spire_page(1280, 800)
    assert _lit(page) > 0, "setup: the preview should be lit"
    page.evaluate("window.__hold = setInterval(() => { G.nextIn = 2; }, 20)")  # keep the countdown lit
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(700)
    assert page.evaluate("BOX_WIDE") is True and page.evaluate("laneSoon().length") > 0
    page.evaluate("clearInterval(window.__hold); G.nextIn = 30")  # preview over, field clear
    page.wait_for_function("BOX_WIDE === false", timeout=3000)


def test_resize_before_the_first_wave_switches_promptly(spire_page):
    page = spire_page(1280, 800)
    assert page.evaluate("G.started") is False
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_function("BOX_WIDE === false", timeout=3000)
