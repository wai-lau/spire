"""/spire END SCREEN FITS (WebKit / playwright; owner, 2026-11-10: "lives lost table should show min 3 rows (4 incl header), if the
endscreen things don't fit at minimum rows, reduce font size until it does"): a lost game with 6 towers (every slot) and 8 waves that took lives, at
phone portrait / landscape, tablet and desktop sizes - the lives-lost table's header and its first 3 rows on screen and unclipped, the
title, the result line, every tower row and Play again on screen, the TOP PLAYERS board not spilling over them, the overlay itself not overflowing (aspira-endstats.js endFit).

Self-contained: the page is built from THIS checkout's template and served from its web/ (then exec-fn's web/ for chrome.css), so it
tests the worktree, not whatever the live server holds. SPIRE_EXEC_FN names exec-fn when this checkout is not inside it (a copy).

    cd <exec-fn> && .venv/bin/pytest apps/spire/tests/test_spire_endfit_browser.py -q -p no:cacheprovider
"""
import os
from pathlib import Path

import pytest

pytest.importorskip("playwright.sync_api")
from playwright.sync_api import sync_playwright  # noqa: E402

pytestmark = pytest.mark.browser

HERE = Path(__file__).resolve()
REPO = HERE.parent.parent
EXEC_FN = Path(os.environ["SPIRE_EXEC_FN"]) if os.environ.get("SPIRE_EXEC_FN") else next(
    p for p in HERE.parents if (p / "api/main.py").exists() and (p / "web/chrome.css").exists())
TEMPLATE = (REPO / "api/templates/aspira.html").read_text()


def _shell():
    """The page in exec-fn's REAL shell, as the dev server builds it (as test_spire_cardfit_browser.py)."""
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


SIZES = [(320, 568), (360, 640), (390, 844), (412, 915), (667, 375), (844, 390), (915, 412), (768, 1024), (1024, 768), (1280, 720),
         (1366, 768), (1920, 1080)]
# a lost game: 6 towers (every slot) with kills and damage, 8 waves that took lives -> gameOver()
END = r"""() => {
  G = newGame(); G.money = 1e12; const kinds = ['arc', 'frz', 'sol', 'acd', 'grv', 'ifr'];
  CELLS.forEach(c => { ui.build = kinds[G.towers.length]; placeTower(c); }); ui.build = null;  // the open slots (3 at the start)
  CELLS.forEach((c, i) => { if (G.towers.some(t => t.cell === i)) return;  // the slots a later game opens: every slot, 6 towers
    G.towers.push({ ...G.towers[0], id: G.id++, kind: kinds[G.towers.length], cell: i, x: c.x, y: c.y }); });
  G.towers.forEach((t, i) => { t.kills = 1000 + 37 * i; t.dealt = 1e7 * (i + 1); });
  G.wave = 64; G.leaks = {}; G.planLog = G.planLog || {};
  [12, 19, 27, 33, 41, 48, 55, 63].forEach((n, i) => { G.leaks[n] = 8 - i; });
  gameOver(); }"""
# -> every way the end screen fails to fit, [] when it fits
MEASURE = r"""() => {
  const ov = document.getElementById('asp-ov'); if (!ov || ov.hidden) return ['no end screen'];
  const vw = innerWidth, vh = innerHeight, O = ov.getBoundingClientRect(), bad = [];
  const floor = Math.min(vh, O.bottom - parseFloat(getComputedStyle(ov).paddingBottom));  // the overlay's content box ends here
  if (ov.scrollHeight > ov.clientHeight + 1) bad.push('overlay overflows ' + ov.scrollHeight + ' > ' + ov.clientHeight);
  const de = document.documentElement; if (de.scrollWidth > vw + 1 || de.scrollHeight > vh + 1) bad.push('page overflows ' + de.scrollWidth + 'x' + de.scrollHeight);
  const clipped = el => { const r = el.getBoundingClientRect(); for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a);
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const A = a.getBoundingClientRect(); if (r.bottom > A.bottom + 1 || r.right > A.right + 1 || r.top < A.top - 1 || r.left < A.left - 1) return true; } } return false; };
  const check = (el, what) => { if (!el) { bad.push('missing: ' + what); return; } const r = el.getBoundingClientRect();
    if (!r.width || !r.height) bad.push('not shown: ' + what);
    else if (r.top < -0.5 || r.left < -0.5 || r.right > vw + 0.5 || r.bottom > floor + 0.5) bad.push('off screen: ' + what + ' bottom ' + Math.round(r.bottom) + ' > ' + Math.round(floor));
    else if (clipped(el)) bad.push('clipped: ' + what); };
  check(document.getElementById('asp-ov-title'), 'title');
  check(document.getElementById('asp-ov-text'), 'result line');
  const towers = [...document.querySelectorAll('#asp-ov-stats tr')];
  if (towers.length !== 7) bad.push('tower table has ' + towers.length + ' rows, want 7 (header + 6)');
  towers.forEach((tr, i) => check(tr, i ? 'tower row ' + i : 'tower header'));
  const leak = [...document.querySelectorAll('#asp-ov-leaks tr')];
  if (leak.length < 9) bad.push('lives-lost table has ' + leak.length + ' rows, want 9 (header + 8)');
  leak.slice(0, 4).forEach((tr, i) => check(tr, i ? 'lives-lost row ' + i : 'lives-lost header'));
  check(document.getElementById('asp-ov-btn'), 'Play again');
  const asc = document.getElementById('asp-asc'); if (asc && !asc.hidden && asc.scrollHeight > asc.clientHeight + 1) bad.push('TOP PLAYERS board overflows ' + asc.scrollHeight + ' > ' + asc.clientHeight + ' (drawn over the rest)');
  return [...new Set(bad)].slice(0, 8); }"""


@pytest.mark.parametrize("w,h", SIZES, ids=[f"{w}x{h}" for w, h in SIZES])
def test_end_screen_fits(_browser, w, h):
    mob = w < 500 or h < 500
    ctx = _browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
    try:
        page = ctx.new_page()
        page.route(HOST + "/**", _serve)
        page.goto(HOST + "/spire.html")
        page.wait_for_function("typeof G === 'object' && CELLS.length && typeof gameOver === 'function'")
        page.evaluate("() => { const c = document.getElementById('asp-resume'); if (c) c.remove(); }")
        page.evaluate(END)
        page.wait_for_function("document.documentElement.style.getPropertyValue('--end-z') !== ''", timeout=10000)  # (the fit has run: the overlay shows after the breach)
        page.wait_for_timeout(600)  # (and again 400 ms on, after the board's fetch)
        bad = page.evaluate(MEASURE)
        assert not bad, f"{w}x{h}: " + "; ".join(bad)
    finally:
        ctx.close()
