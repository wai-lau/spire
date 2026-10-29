// /aspira - the WAVE LIST bottom-left (split from aspira-ui.js at its 500-line
// cap): one row per wave still alive and the next ones - Roman number, the
// enemies as one icon each sized by HP (tessellating when long), the name.
// UI only; loaded before aspira-ui.js, whose updateHud calls updateWaveList.
const WAVE_NEXT = 3 /* the next 3 waves only (owner, 2026-10-27: "only show the next 3 waves, not 10"; was filled to 10 rows) */, WAVE_DEAD_A = 0.18, WAVE_ICON = [5, 18], WAVE_SPAN = 110, WAVE_SPAN_PHONE = 95, SWARM_MIN = 4, WAVE_ROW_H = 22, WAVE_ROW_H_PHONE = 14, WAVE_BOSS_PX = 22; // WAVE_ROW_H: every row's height (owner: consistent) // SWARM_MIN: the smallest tessellated diamond box (px); a boss's icon, always the biggest // the upcoming-wave icons' size range (px); rows up to this many never overlap
// the list's headings: the boxed live waves, then the rest (owner, 2026-10-09)
const WAVE_HEAD = { now: "warped in", next: "warping in..." }; // (owner: "replace upcoming waves with: warping in...")

// the enemy itself (owner): the same polygon the board draws (poly() in
// aspira-draw.js), as a small inline SVG in the type's colour
// gap: px between this icon and the next (negative overlaps them); dy: a
// vertical nudge (px); x, y: an absolute spot inside a lattice band (CSS lengths)
// a type's polygon is the same every time: built once (perf, 2026-10-16: the list rebuilt ~1500 icons 4x a second, 8 ms a rebuild)
const ICON_PTS = {};
function iconPts(type) {
  if (ICON_PTS[type]) return ICON_PTS[type];
  if (type === "swarm") return (ICON_PTS[type] = "3.5,3.5 16.5,3.5 16.5,16.5 3.5,16.5"); // a SQUARE for the cube (owner, 2026-10-16: "use squares to represent cubes instead of hexagon") - its board silhouette is a hexagon
  const d = ENEMIES[type], n = d.pointy ? d.sides * 2 : d.sides, pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / n, r = d.pointy && i % 2 ? 8 * (d.pointy === true ? 0.45 : d.pointy) : 8;
    pts.push((10 + Math.cos(a) * r).toFixed(1) + "," + (10 + Math.sin(a) * r).toFixed(1));
  }
  return (ICON_PTS[type] = pts.join(" "));
}
function enemyIcon(type, px, gap, dy, x, y, dim) {
  return '<svg class="asp-eicon" viewBox="0 0 20 20"' + (px ? ' style="width:' + px.toFixed(2) + 'px;height:' + px.toFixed(2) + 'px;margin-right:' + (gap ?? 1).toFixed(2) + 'px' + (dy ? ';transform:translateY(' + dy.toFixed(2) + 'px)' : "") + (x != null ? ';position:absolute;left:' + x + ';top:' + y : "") + (dim ? ';opacity:' + WAVE_DEAD_A : "") + '"' : "") + ' aria-label="' + type + '"><polygon points="' + iconPts(type) + '"/></svg>';
}

// one wave-list row's icons, LEFT-ALIGNED in a band `span` x WAVE_ROW_H: one
// line if it fits at natural size (never for a swarm, owner: at least 2 rows);
// else 2 rows zigzagging; else 3 - columns alternating two icons (top, bottom)
// and one (middle). In 2 and 3 rows the VERTICAL step EQUALS the horizontal one
// (owner), TESS_STEP of an icon so diagonal neighbours just clear each other;
// icons shrink only as far as the row's height and width force, down to
// SWARM_MIN px, and columns squeeze (overlap) past that.
// a PORTRAIT PHONE gets compact rows (WAVE_ROW_H_PHONE; the CSS media query on .asp-dots matches), so the list stays clear of the centred core
const PHONE_PORTRAIT_Q = "(orientation: portrait) and (width < 700px)";
const waveRowH = () => matchMedia(PHONE_PORTRAIT_Q).matches ? WAVE_ROW_H_PHONE : WAVE_ROW_H;
const TESS_STEP = 0.72, WAVE_PACK_MAX = 5;
// a band's HTML depends only on its arguments: kept (perf - most rows are the same from one rebuild to the next)
const BAND_MEMO = new Map(), BAND_MEMO_MAX = 200;
function waveBand(type, count, px, span, alive) {
  const key = type + "|" + count + "|" + px + "|" + span + "|" + alive + "|" + waveRowH();
  let html = BAND_MEMO.get(key);
  if (html === undefined) {
    if (BAND_MEMO.size >= BAND_MEMO_MAX) BAND_MEMO.clear();
    BAND_MEMO.set(key, (html = waveBandHtml(type, count, px, span, alive)));
  }
  return html;
}
function waveBandHtml(type, count, px, span, alive) {
  // alive (a live wave): that many icons solid, the rest faded to WAVE_DEAD_A (owner)
  const H = waveRowH(), fade = k => alive != null && k >= alive;
  const place = (pts, b) => '<span class="asp-band" style="width:' + span + "px;height:" + H + 'px">' +
    pts.map(([x, y], k) => enemyIcon(type, b, 0, 0, x.toFixed(2) + "px", y.toFixed(2) + "px", fade(k))).join("") + "</span>";
  if (type !== "swarm" && count * (px + 2) - 2 <= span) return place(Array.from({ length: count }, (_, k) => [k * (px + 2), (H - px) / 2]), px);
  // rows R: R-1 vertical steps of the same size as the column step
  const lattice = R => {
    const cols = R === 2 ? count : Math.ceil(count * 2 / R); // two columns hold R icons: the even rows, then the odd
    let b = Math.min(px, (H - 1) / ((R - 1) * TESS_STEP + 1)); // fits the height
    const fitW = cols > 1 ? span / ((cols - 1) * TESS_STEP + 1) : b;
    const fits = fitW >= b;
    b = Math.max(SWARM_MIN, Math.min(b, fitW));
    const st = cols > 1 ? Math.min(b * TESS_STEP, (span - b) / (cols - 1)) : 0, top = (H - (R - 1) * st - b) / 2, pts = [];
    if (R === 2) for (let k = 0; k < count; k++) pts.push([k * st, top + (k % 2) * st]);
    else { let left = count; for (let c = 0; left > 0; c++) for (let r = c % 2; r < R; r += 2) { if (left-- <= 0) break; pts.push([c * st, top + r * st]); } }
    return { fits, html: () => place(pts, b), b }; // (html built only for the layout picked)
  };
  // 2 rows whenever they fit the width, then 3, 4, up to WAVE_PACK_MAX (owner, 2026-10-13: "allow swarm to pack into up to 5 rows
  // instead of just 3"); past that the last one, squeezed
  for (let R = 2; R < WAVE_PACK_MAX; R++) { const l = lattice(R); if (l.fits) return l.html(); }
  return lattice(WAVE_PACK_MAX).html();
}

// wave n -> how many of its enemies are still alive or yet to spawn (only waves with any)
function liveWaves() {
  const m = new Map(), add = (n, v) => m.set(n, (m.get(n) || 0) + v);
  for (const e of G.enemies) if (!e.dead && !e.bossKin) add(e.n, 1);
  for (const w of G.spawns) add(w.n, w.list.length - w.idx);
  return m;
}

// a COMBO wave by its own name (owner, 2026-10-18: "for the waves that have multiple features, label them as such in the next wave
// indicator"; 2026-10-22 the names: "Psi-swarm / Shell-fast / Hyper-armor / Hyper-shield") - once its after-60 lever is in play
// (TYPE_TUNE, aspira-waves.js): a swarm with a share of shields, a fast with a share of armor, armor or shields at another speed
const COMBO_NAME = { swarm: "psi-swarm", fast: "shell-fast", armor: "hyper-armor", shield: "hyper-shield" };
const comboOn = (type, n) => { const l = TUNE_AFTER[type]; if (!l || tuneSection(n) < TUNE_LATE) return false; const v = tune(type, l, n); return TUNE_SHARE[type] ? v > 0 : v !== 1; };
const waveName = (type, n) => (comboOn(type, n) ? COMBO_NAME[type] : type);
const WAVE_PLANS = new Map(); // n -> its plan, as the list last drew it (a tap opens its card: aspira-wavecard.js)
function updateWaveList() {
  // the waves still alive and the next ones, one per row (owner; waves are fixed, so they are
  // known): its Roman number : its enemies, ONE ICON EACH, sized by HP : name.
  // No count, no HP figure (owner) - the icons say both. Sizes run on a log
  // scale across the ten waves, WAVE_ICON[0] .. WAVE_ICON[1] px. A plain enemy
  // is named by type in lowercase, a boss by its arcana, its icon inverted as
  // on its own sky.
  // the list keeps every wave still ALIVE (an enemy alive or yet to spawn) and
  // the current one, then the next WAVE_NEXT upcoming waves (owner). A live wave's icons: `alive` solid, the dead faded.
  const live = liveWaves(), rows = [];
  const rowOf = (n, w) => {
    WAVE_PLANS.set(n, w); // (the wave card reads it - aspira-wavecard.js)
    const boss = w.type === "bonus";
    const hp = enemyHp(w.type, n) * (boss ? bossHpMul(arcanaOf(n).id) * BOSS_LANE_HP * BOSS_HEFT : 1); // (a boss: its spawn's own multipliers - bossHpMul, aspira-bosses.js; the 20% of its escorts' HP it takes on is not counted)
    return { n, w, boss, hp, alive: live.get(n), cur: n === G.wave || live.has(n) }; // highlighted: every wave still ALIVE, and the current one (owner)
  };
  // after a boss, until "challenge" is tapped, the beaten boss's row goes too (owner, 2026-10-12): only the button and what is coming
  for (const n of [...new Set([...live.keys(), ...(G.wave > 0 && !afterBoss() ? [G.wave] : [])])].sort((a, b) => a - b)) {
    if (G.planLog && G.planLog[n]) rows.push(rowOf(n, G.planLog[n]));
  }
  let prev = G.lastType;
  // nothing past the last boss (owner): the game is won at WIN_WAVE
  for (let i = 1; i <= WAVE_NEXT && G.wave + i <= WIN_WAVE; i++) {
    const n = G.wave + i, w = wavePlan(n, prev);
    if (w.type !== "bonus") prev = w.type; // the boss wave does not break the alternation
    rows.push(rowOf(n, w));
  }
  // the log scale spans the ORDINARY enemies only (owner: sizes did not read -
  // one boss's HP squeezed the rest into the middle); a boss is always WAVE_BOSS_PX
  const plain = rows.filter(r => !r.boss).map(r => r.hp);
  const lo = Math.log(Math.min(...plain)), hi = Math.log(Math.max(...plain));
  const pxOf = (hp, boss) => boss ? WAVE_BOSS_PX : Math.round(WAVE_ICON[0] + (WAVE_ICON[1] - WAVE_ICON[0]) * (hi > lo ? (Math.log(hp) - lo) / (hi - lo) : 0.5));
  // every row is the SAME FIXED width, wave after wave (owner): WAVE_SPAN, or
  // WAVE_SPAN_PHONE on a phone (to clear the build buttons)
  const span = matchMedia("(width < 700px)").matches ? WAVE_SPAN_PHONE : WAVE_SPAN;
  // the list's two HEADINGS (owner, 2026-10-09: "move upcoming waves to below the rectangle and above
  // it show current wave"): the one above the list names the boxed live waves; "upcoming waves" then
  // heads the rest INSIDE the grid, a full-width cell padded with three hidden ones so the columns'
  // nth-child rules still count five cells a row
  // The incoming wave's COUNTDOWN rides the "warping in..." heading (owner, 2026-10-09: "left align" -
  // the rows sit flush under the headings; the countdown had a column of its own left of them).
  // None while a boss is up or next (a boss waits for a clear field)
  const curRows = rows.filter(r => r.cur).length;
  const eta = G.started && !bossUp() && !bossNext() ? ' <span class="asp-eta">' + Math.ceil(Math.max(0, G.nextIn)) + "s</span>" : "";
  const lab = $("asp-wavelabel"), chal = afterBoss(); // after a boss: the CHALLENGE button where the countdown was (aspira-waves.js)
  const labHtml = chal ? "" : curRows ? WAVE_HEAD.now : WAVE_HEAD.next + eta; // (the CHALLENGE button sits under the core - placeChallenge)
  if (lab.dataset.h !== labHtml) { lab.dataset.h = labHtml; lab.innerHTML = labHtml; }
  const btn = $("asp-challenge"), label = chal ? "Challenge " + arcanaOf(G.wave + STAR_EVERY).name : ""; // (owner, 2026-10-12: back from "PROCEED", capital C)
  btn.hidden = !chal; btn.onclick ||= () => challengeNext();
  if (btn.textContent !== label) btn.textContent = label;
  let note = "", i = 0;
  for (const { n, w, boss, hp, alive } of rows) {
    if (curRows && i++ === curRows) note += '<span class="asp-wavelabel asp-wavesub">' + WAVE_HEAD.next + eta + "</span>" + "<i hidden></i>".repeat(4);
    // rows LEFT-ALIGNED at their natural size (owner: not justified); a row too
    // long for the fixed width `span` TESSELLATES into 2, then 3 staggered rows
    // (waveBand), overlapping only past that. The box is always `span` wide, so
    // the name column never moves. A boss sits centred between two lines.
    const px = Math.min(pxOf(hp, boss), waveRowH());
    let icons = boss
      ? '<span class="asp-bline"></span>' + enemyIcon(w.type, px, 2).repeat(w.count - 1) + enemyIcon(w.type, px, 0) + '<span class="asp-bline"></span>'
      : waveBand(w.type, w.count, px, span, alive);
    // NO wave numbers (owner, 2026-10-06); the first column is empty and takes no room since the
    // countdown moved to the heading, the ":" column is empty
    note += "<span></span><span></span>" +
      '<span class="asp-dots e-' + ENEMIES[w.type].color + (boss ? " e-boss" : "") + '" data-n="' + n + '" style="width:' + span + 'px">' + icons + "</span>" +
      '<span class="asp-hpcol" data-n="' + n + '">' + dmgUnits(Math.round(hp)) + "hp</span>" + // each unit's HP in its OWN column (owner, 2026-10-19: "turn the wave thing into a table, hp and type in their own columns")
      '<span data-n="' + n + '">' + (boss ? "<b>" + arcanaOf(n).name + "</b>" : waveName(w.type, n)) + "</span>"; // boss names BOLD (owner); each unit's HP LEFT of its name (owner, 2026-10-19: "show HP value to the left of unit in wave indicator e.g. 20hp swarm")
  }
  // the waves still ALIVE (and the current one) sit at the top: ONE rounded green box round them all
  // (owner, 2026-10-09: "replace the current wave highlight with a single rounded green rectangle";
  // was a white band on each row). Placed on the grid's rows but out of the flow, and LAST so the
  // columns' nth-child rules still count five cells a row
  if (curRows) note += '<i class="asp-curbox" style="grid-row:1 / ' + (curRows + 1) + '"></i>';
  if (note !== lastNote) { $("asp-wavenote").innerHTML = note; lastNote = note; } // innerHTML re-reads normalised, so compare the source
  waveLiveRows = curRows; fitWaveList();
}
// THE LIST NEVER COVERS THE CORE OR A STARTING SLOT (owner, 2026-10-19 landscape box): a board shape's rectangle on screen, in CSS px
// (3D: its corners through warpProject under the texture camera; 2D: cam, device px / dpr)
function boardScreenRect(x, y, r) {
  const pts = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
  let P;
  if (phoneOn3d()) {
    const e = warp.ent.getBoundingClientRect(), sx = e.width / warp.ent.width, sy = e.height / warp.ent.height;
    P = viewCam(() => pts.map(([px, py]) => { const q = warpProject(px, py, 0); return { x: e.left + q.x * sx, y: e.top + q.y * sy }; }));
  } else {
    const c = cv.getBoundingClientRect(), d = canvasDpr();
    P = pts.map(([px, py]) => ({ x: c.left + (cam.ox + px * cam.k) / d, y: c.top + (cam.oy + py * cam.k) / d }));
  }
  const xs = P.map(q => q.x), ys = P.map(q => q.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
let waveLiveRows = 0, waveGapPx = 0;
// while the list's rect overlaps the core's (CORE_R) or an OPEN starting slot's (CELL_S), plus var(--space-2), drop its last row (down to the live waves);
// rows are five grid cells, the "warping in" sub-heading one more row; runs on every list update and on resize
function fitWaveList() {
  const note = $("asp-wavenote"), box = document.querySelector(".asp-left");
  if (!note || !box) return;
  const cells = [...note.children].filter(c => !c.classList.contains("asp-curbox"));
  for (const c of cells) if (c.style.display) c.style.display = "";
  if (!matchMedia(PHONE_PORTRAIT_Q).matches) return;
  if (!waveGapPx) { const t = document.createElement("div"); t.style.cssText = "position:absolute;visibility:hidden;width:var(--space-2)"; document.body.appendChild(t); waveGapPx = t.getBoundingClientRect().width; t.remove(); }
  const spots = [[CX, CY, CORE_R], ...CELLS.filter(c => OPEN_SLOTS.includes(c.ang)).map(c => [c.x, c.y, CELL_S])].map(([x, y, r]) => boardScreenRect(x, y, r));
  const chal = $("asp-challenge"); if (chal && !chal.hidden) spots.push(chal.getBoundingClientRect()); // (the Challenge button too)
  const g = waveGapPx, hits = () => { const L = box.getBoundingClientRect(); return spots.some(b => L.left < b.right + g && b.left - g < L.right && L.top < b.bottom + g && b.top - g < L.bottom); };
  for (let n = Math.ceil(cells.length / 5); n > Math.max(waveLiveRows, 1) && hits(); n--)
    for (const c of cells.slice((n - 1) * 5)) c.style.display = "none";
}
if (typeof addEventListener === "function") addEventListener("resize", () => typeof G === "object" && fitWaveList());
// the CHALLENGE button UNDER THE CORE, centred on it (owner, 2026-10-12: "move the challenge button under the core, centered
// horizontally"): below the core's life rings, followed every frame (the camera moves), in 2D and 3D alike
const CHALLENGE_BELOW = 16; // world units under the life rings / the lowest slot
// it shows CHALLENGE_DELAY s after the sky has turned back (owner, 2026-10-13: "challenge the X should only appear 2 seconds after
// the inversion effect finishes"; bossInv.offAt, aspira-bosses.js)
const CHALLENGE_DELAY = 1; /* 1 s sooner (owner, 2026-10-17: "the initial fade in should happen 1s faster"; was 2) */
function placeChallenge() {
  const btn = $("asp-challenge");
  if (btn.hidden) return;
  const ready = bossInv.phase === "off" && performance.now() / 1000 - (bossInv.offAt || 0) >= CHALLENGE_DELAY;
  btn.style.visibility = ready ? "" : "hidden";
  if (!ready) return;
  // under the core AND clear of the build slots round it (a slot under the button could not be tapped)
  const wy = Math.max(CY + CORE_R + LIFE_GAP * LIFE_RINGS, ...CELLS.map(c => c.y + CELL_S * TOWER_K)) + CHALLENGE_BELOW, root = $("asp").getBoundingClientRect();
  if (!(typeof warp !== "undefined" && warp.ent && warp.p)) return; // (before the first 3D frame: placed on the next)
  const c0 = { k: cam.k, ox: cam.ox, oy: cam.oy }; // projected as warp3d does: under the texture camera (warpRes)
  cam.k *= warpRes(); cam.ox *= warpRes(); cam.oy *= warpRes();
  let P; try { P = warpProject(CX, wy, 0); } finally { Object.assign(cam, c0); }
  const r = warp.ent.getBoundingClientRect();
  const x = r.left + P.x * r.width / warp.ent.width, y = r.top + P.y * r.height / warp.ent.height;
  // ...and INSIDE the window, above the speed bar (landscape phones put the lowest slot past it): clamped by its own rect
  const b = btn.getBoundingClientRect(), foot = document.querySelector(".asp-foot"), fy = foot ? foot.getBoundingClientRect().top : innerHeight, g = waveGapPx || 8;
  const cx = Math.min(Math.max(x, root.left + b.width / 2 + g), root.right - b.width / 2 - g), cy = Math.max(root.top + g, Math.min(y, fy - b.height - g));
  const L = (cx - root.left) + "px", T = (cy - root.top) + "px";
  if (btn.style.left === L && btn.style.top === T) return;
  btn.style.left = L; btn.style.top = T; fitWaveList(); // (the list keeps clear of it: it moved)
}
