"""/spire TOWER CARD FITS (WebKit / playwright; owner, 2026-11-06: "ensure all tower sections fit on tower upgrade card at any reasonable
resolution"): every tower at a full build (its longest stats), at phone portrait / landscape, tablet and desktop sizes - the card on
screen, nothing in it clipped or off screen, the card not scrolling, the page not overflowing (aspira-cardfit.js fitPop / fitTight).

Self-contained: the page is built from THIS checkout's template and served from its web/ (then exec-fn's web/ for chrome.css),
so it tests the worktree, not whatever the live server holds.

    cd <exec-fn> && .venv/bin/pytest apps/spire/tests/test_spire_cardfit_browser.py -q -p no:cacheprovider
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

def _shell():
    """The page in exec-fn's REAL shell, as the dev server builds it (pages._render_page over web/index.html): its viewport, its base
    styles, a full-height body - a bare page lays the board out differently, and the card with it."""
    import sys
    sys.path.insert(0, str(EXEC_FN / "api"))
    import pages
    pages._STATIC_INDEX = EXEC_FN / "web/index.html"
    out = pages._render_page("aspira", TEMPLATE, full_height=True, guest=True, show_nav=False, crt=False)
    return out if isinstance(out, str) else out.body.decode()


HTML = _shell()
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


SIZES = [(360, 640), (390, 844), (412, 915), (844, 390), (915, 412), (768, 1024), (1024, 768), (1280, 720), (1366, 768), (1920, 1080)]
KINDS = ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"]
# a full build (first axis V, the others IV), selected, paused; -> every way the card fails to fit, [] when it fits
MEASURE = r"""kind => {
  G = newGame(); G.money = 1e12; ui.build = kind; placeTower(CELLS[0]); ui.build = null; const t = G.towers[0];
  SKILL_TREES[kind].forEach((a, k) => { for (let i = 0; i < (k === 0 ? 5 : 4); i++) upgradeTower(t, a.id, true); });
  ui.paused = true; ui.sel = t.id; refreshPanels();
  const pop = document.getElementById('asp-pop'); if (!pop || pop.hidden) return ['no card'];
  const vw = innerWidth, vh = innerHeight, P = pop.getBoundingClientRect(), bad = [];
  if (P.top < -0.5 || P.left < -0.5 || P.bottom > vh + 0.5 || P.right > vw + 0.5) bad.push('card off screen');
  if (pop.scrollHeight > pop.clientHeight + 1) bad.push('card scrolls ' + pop.scrollHeight + ' > ' + pop.clientHeight);
  const de = document.documentElement; if (de.scrollWidth > vw + 1 || de.scrollHeight > vh + 1) bad.push('page overflows ' + de.scrollWidth + 'x' + de.scrollHeight);
  const clipped = el => { const r = el.getBoundingClientRect(); for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a);
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const A = a.getBoundingClientRect(); if (r.bottom > A.bottom + 1 || r.right > A.right + 1 || r.top < A.top - 1 || r.left < A.left - 1) return true; } } return false; };
  for (const el of pop.querySelectorAll('*')) { if (!el.offsetParent || el.children.length) continue; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const what = (el.className || el.tagName) + ' "' + (el.textContent || '').trim().slice(0, 16) + '"';
    if (r.bottom > vh + 0.5 || r.right > vw + 0.5 || r.top < -0.5 || r.left < -0.5) bad.push('off screen: ' + what); else if (clipped(el)) bad.push('clipped: ' + what); }
  return [...new Set(bad)].slice(0, 8); }"""


@pytest.mark.parametrize("w,h", SIZES, ids=[f"{w}x{h}" for w, h in SIZES])
def test_tower_card_fits_every_tower(_browser, w, h):
    mob = w < 500 or h < 500
    ctx = _browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
    try:
        page = ctx.new_page()
        page.route(HOST + "/**", _serve)
        page.goto(HOST + "/spire.html")
        page.wait_for_function("typeof G === 'object' && CELLS.length && typeof refreshPanels === 'function'")
        page.evaluate("() => { const c = document.getElementById('asp-resume'); if (c) c.remove(); }")
        fails = {}
        for kind in KINDS:
            page.evaluate(MEASURE, kind)
            page.wait_for_timeout(100)  # (the fit runs on the next frame's placePop too)
            bad = page.evaluate(MEASURE, kind)
            if bad:
                fails[kind] = bad
        assert not fails, f"{w}x{h}: " + "; ".join(f"{k}: {v}" for k, v in fails.items())
    finally:
        ctx.close()
