// /aspira — the END SCREEN's stats (owner, 2026-10-06): under "core breached" /
// "ascendant", a line for EVERY tower ranked by damage dealt (level, kills,
// damage, share; the core's copy too if it fought; named by its build), and BELOW Play
// again a line for each wave that TOOK LIVES - what it was (type x count, or the boss's
// name, from G.planLog) and how many (G.leaks, counted where an enemy reaches
// the core), MOST LIVES FIRST, three rows tall and the rest a scroll away (owner, 2026-10-19:
// "sort the lives lost by amount of lives / box should only show 3 ... to make more space for scores"; TOP PLAYERS
// swapped up to where the leaks were). UI only; gameOver / winGame call renderEndStats.
// a tower's NAME is its build (owner: "name the towers"): the tier names of its
// two strongest axes, strongest first - "Superconductor · Charge"
function buildName(t) {
  const tree = SKILL_TREES[t.kind] || [];
  return tree.map(ax => ({ n: skillOf(t, ax.id), ax })).filter(o => o.n).sort((a, b) => b.n - a.n).slice(0, 2)
    .map(o => o.ax.tiers[o.n - 1].name).join(" · ");
}
// THE END SCREEN SHRINKS TO FIT (owner, 2026-11-10: "lives lost table should show min 3 rows (4 incl header), if the endscreen
// things don't fit at minimum rows, reduce font size until it does"): endFit steps --end-z (a zoom on each of the overlay's parts,
// aspira-endstats.css) down from 1 by END_Z_STEP until endFits holds, never under END_Z_MIN; it runs once the overlay shows
// (gameOver shows it after renderEndStats, past the breach), again after the TOP PLAYERS board's fetch, and on resize
const END_Z_STEP = 0.05, END_Z_MIN = 0.35;
function endFits(ov) { // the title, the result line, every tower row, the lives-lost head + three rows and Play again inside the overlay, unclipped; the board's own parts inside it
  const vw = innerWidth, floor = Math.min(innerHeight, ov.getBoundingClientRect().bottom - parseFloat(getComputedStyle(ov).paddingBottom));
  const els = [$("asp-ov-title"), $("asp-ov-text"), ...document.querySelectorAll("#asp-ov-stats tr"), ...[...document.querySelectorAll("#asp-ov-leaks tr")].slice(0, 4), $("asp-ov-btn")];
  if (ov.scrollHeight > ov.clientHeight + 1) return false;
  const asc = $("asp-asc"); if (asc && !asc.hidden && asc.scrollHeight > asc.clientHeight + 1) return false; // (its list may scroll; never drawn over the title)
  for (const el of els) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.top < -0.5 || r.left < -0.5 || r.right > vw + 0.5 || r.bottom > floor + 0.5) return false;
    for (let a = el.parentElement; a && a !== ov; a = a.parentElement) { // a scrolling parent cutting it off
      const s = getComputedStyle(a);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const A = a.getBoundingClientRect();
      if (r.bottom > A.bottom + 1 || r.right > A.right + 1 || r.top < A.top - 1 || r.left < A.left - 1) return false;
    }
  }
  return true;
}
function endFit() { // -> false while the overlay is hidden
  const ov = $("asp-ov"), root = document.documentElement.style;
  if (!ov || ov.hidden) return false;
  let z = 1;
  root.setProperty("--end-z", "1");
  while (z > END_Z_MIN + 1e-9 && !endFits(ov)) { z = Math.max(END_Z_MIN, z - END_Z_STEP); root.setProperty("--end-z", z.toFixed(2)); }
  return true;
}
function endFitSoon(frames = 240) { // each frame until the overlay shows (about 4 s at most), then once more after the board's fetch
  requestAnimationFrame(() => { if (endFit()) setTimeout(endFit, 400); else if (frames > 0) endFitSoon(frames - 1); });
}
addEventListener("resize", () => endFit());
function renderEndStats() {
  const box = $("asp-ov-stats"), top = $("asp-ov-leaks"); // the leaks sit BELOW Play again (owner, 2026-10-19; were above the title)
  if (!box || !top) return;
  const rows = [...G.towers];
  const total = rows.reduce((a, t) => a + (t.dealt || 0), 0) || 1;
  rows.sort((a, b) => (b.dealt || 0) - (a.dealt || 0));
  // no level and no base name (owner): the row's colour says which tower
  let html = '<table class="asp-end-towers"><tr><th>tower</th><th>kills</th><th>damage</th><th>share</th></tr>';
  for (const t of rows) {
    html += '<tr data-kind="' + t.kind + '"><td>' + (t.isCore ? "core · " : "") + (buildName(t) || TOWERS[t.kind].ab) + "</td><td>" +
      (t.kills || 0) + "</td><td>" + short(Math.round(t.dealt || 0)) + "</td><td>" + Math.round(100 * (t.dealt || 0) / total) + "%</td></tr>";
  }
  html += "</table>";
  box.innerHTML = html;
  html = '<div class="asp-end-waves"><table><tr><th>wave</th><th>what</th><th>lives</th></tr>';
  const leakWaves = Object.keys(G.leaks || {}).map(Number).sort((a, b) => (G.leaks[b] || 0) - (G.leaks[a] || 0) || a - b); // most lives first, then by wave
  endFitSoon();
  if (!leakWaves.length) { top.innerHTML = '<p class="asp-end-leak">no lives lost</p>'; return; }
  for (const n of leakWaves) { // only the waves that took lives (owner)
    const p = (G.planLog || {})[n], lost = G.leaks[n];
    const what = !p ? "—" : p.type === "bonus" ? arcanaOf(n).name : p.count + " " + p.type;
    html += "<tr" + (lost ? ' class="asp-end-leak"' : "") + "><td>W" + n + "</td><td>" + what + "</td><td>" + (lost ? "−" + lost : "·") + "</td></tr>";
  }
  html += "</table></div>";
  top.innerHTML = html;
}
