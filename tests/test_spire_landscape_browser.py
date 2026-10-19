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
SHOT = REPO / ".superpowers/sdd/2026-10-19-landscape-box/task-5-360.png"


@pytest.mark.parametrize("w,h", PHONES)
def test_wave_list_clears_core_and_starting_slots(spire_page, w, h):
    page = spire_page(w, h)
    page.evaluate("G.started = true; sendWave()")
    page.wait_for_timeout(600)
    hit = page.evaluate("""() => { const L = document.querySelector('.asp-left').getBoundingClientRect();
      const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const spots = [[CX, CY, CORE_R], ...CELLS.filter(c => OPEN_SLOTS.includes(c.ang)).map(c => [c.x, c.y, CELL_S])];
      return spots.filter(([x, y, r]) => ov(L, boardScreenRect(x, y, r))).length; }""")
    if (w, h) == (360, 640):
        page.screenshot(path=str(SHOT))
    assert hit == 0
    assert page.evaluate("document.querySelector('.asp-dots').getBoundingClientRect().height") == 14
