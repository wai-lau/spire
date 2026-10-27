// THE BOSS'S HP ALONG ITS LANE - the bar, its pieces, marks and labels, split out of aspira-bosses.js (the 500-line cap, 2026-10-27);
// drawn on the top layer through warpEntities (aspira-warp.js) and clipped out under every tower and die (bossClip)
const BOSS_BAR_W = 2.2, BOSS_BAR_TRACK = 0.3; // as thin as a lit lane's opaque core, LIT_LINE_SOFT's last (owner, 2026-10-26: "a lot thinner"; was 21); the track = full HP, translucent
const BOSS_BAR_MARKS = [0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0], BOSS_MARK_U = 14; // ...and 0% at the core (owner, 2026-10-26) // %HP ticks across the lane (owner, 2026-10-26: "add markers at 80 60 40 20 10 and 5% hp along the lane"), BOSS_MARK_U long
// THE BOSS'S HP ALONG ITS LANE (owner, 2026-10-26: "show the boss HPs along their lane, this way we can tell if we need to step our
// game up" / "it should stay in place" / "hp removal should come from outside in, not inside out / it should make the lane white
// instead of red"): the bar lies STILL on the lane, anchored at the CORE and reaching out toward the mouth by the HP left as a share
// of the whole lane - so it shrinks from the mouth end as the boss is hurt - over a translucent track of the whole lane (full HP);
// the boss rides in along it. Once the boss is INSIDE the bar (its HP share at or past the lane it has left) the bar turns WHITE:
// it arrives with HP to spare at this pace; before that it is the boss's own colour. One bar a boss (the Lovers two, the Devil
// six); on the board, so 3D warps it onto the floor (a line along the horizon through the core, 2026-10-09 .. 10-26)
// THE BAR'S SPAN (owner, 2026-10-26: "start 100% 50u onto the screen, end the hp bar about 100u before the boss lane reaches the core" /
// "the HP should be the lane color, the non-hp should be a white core (remember these colors are inverted or sth)"): from BOSS_BAR_IN u
// past the mouth (100%) to BOSS_BAR_OUT u short of the core (0%); the HP left in the lane's colour, drawn as the lane is (it turns over
// with the lane under the sky), the rest a WHITE core kept white under the sky (skyKeep - drawSceneTop)
const BOSS_LANE_STEP = 10, BOSS_BAR_IN = 50; const bossBarOut = () => (typeof coreOuterR === "function" ? coreOuterR() : CORE_R); // the 0% end AT the core - its rim, not its centre, or the last few % hide under it (owner, 2026-10-26: "leave it at core" / "disappears before boss dies")
// the 100% end: where the boss first comes within a tower's reach on its lane (owner, 2026-10-26: "boss label should start where the boss is
// hittable, not at the edge of the screen"), else BOSS_BAR_IN past the mouth
function bossHitS(e) { const P = PATHS[e.pi], s0 = entryS(e.pi), reach = typeof reachCircles === "function" ? reachCircles() : []; for (let s = s0; s < P.len; s += BOSS_LANE_STEP) if (inReach(pathAt(e.pi, s, e.ang || 0), reach)) return s; return s0 + BOSS_BAR_IN; }
const bossSpan = e => { const g = barGeo(e); return { a: g.a, b: g.b, hp: g.b - (g.b - g.a) * Math.max(0, e.hp) / e.max }; }; // a: the 100% end, b: the 0% end, hp: where the HP left begins
// THE BAR IN PIECES (owner, 2026-10-26: "the width should increase as we approach the edge / chop up the hp lane into segments and
// jitter the size of each segment, jitter segments spatially on axis perpendicular to lane, but never more than 100% of the segment's
// width"): along the span, pieces BOSS_SEG_U long (each +-BOSS_SEG_JIT of it), BOSS_SEG_GAP apart; the bar BOSS_BAR_W wide at the core
// end, BOSS_BAR_WIDEN x that at the 100% end, each piece's width jittered the same and the piece set across the lane by up to its own
// width. A fixed hash a piece (the boss's id, the piece's index): the layout holds still from frame to frame
const BOSS_SEG_GAP = 10, BOSS_SEG_JIT = 0, BOSS_PIECE_W = [12, 44], BOSS_CORRIDOR = 80, BOSS_SHOVE = 0, BOSS_PIECE_OUT = 1.5, BOSS_PIECE_STEP = 2; // BOSS_SHOVE: a piece's slide along its mean ray, of its width - 0: none (owner, 2026-10-27: "try it without the segment position jitter"; a full width was "weirdly offset from the lane"); BOSS_CORRIDOR: the most a piece may take across the lane - less where the spiral's turns are closer (the pitch there) // BOSS_SEG_GAP: between two pieces, across their cut; BOSS_SEG_JIT: a piece's width jitter; BOSS_PIECE_W: a piece's width at the core end .. the 100% end, u (owner, 2026-10-27: "widen the boxes as much as possible", "way thicker"); BOSS_CORRIDOR: a piece stays inside this much across the lane - no overlap with the next turn; BOSS_PIECE_OUT: its outline, u; BOSS_PIECE_STEP: u between a piece's points
// THE CUTS (owner, 2026-10-27: "choose 24 points on the edge of the screen equally radially distant around the core, then add some radial
// jitter, these are the lines that chop up the hp bar into segments. Each of these lines should cut the hp bar exactly once, at which
// intersection is randomly decided"): BOSS_RAYS rays from the core, evenly spaced round it, each turned by up to BOSS_RAY_JIT of the
// spacing; a ray crosses the spiral lane once a turn - ONE of its crossings inside the span, picked by hash, is its cut, and the piece
// ends there lie ALONG THE RAY (owner, 2026-10-27: "the aligned spoke is more important") - so the cuts on every turn line up as spokes
const BOSS_RAYS = 24, BOSS_RAY_JIT = 0, BOSS_CUT_MIN = 0.25, BOSS_PIECE_ROUND = 0.05; // BOSS_RAY_JIT / BOSS_SEG_JIT 0: no jitter at all - even spokes, the smooth width taper (owner, 2026-10-27: "try without jitters"; were 0.4 / 0.2) // BOSS_CUT_MIN: a ray flatter than this against the lane (its sine) cuts square; BOSS_PIECE_ROUND: a piece's corner radius, of its width
const bossHash = (e, i, k) => { let h = (e.id * 7919 + i * 104729 + k * 31) | 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }; // 0..1
// COMPUTED ONCE A BOSS (owner, 2026-10-26: "can we precompute these if slow?"): the span, the lane's points over it, the cuts and every
// piece, kept on the boss (e.bar) and rebuilt only when the towers' reach changes (the 100% end moves with it) - a frame only picks each
// piece's part either side of where the HP left begins
function barGeo(e) {
  const reach = typeof reachCircles === "function" ? reachCircles() : [], key = reach.map(c => Math.round(c.x) + "," + Math.round(c.y) + "," + Math.round(c.r)).join("|");
  if (e.bar && e.bar.key === key) return e.bar;
  const a = bossHitS(e), b = PATHS[e.pi].len - bossBarOut(), ang = e.ang || 0, TAU = Math.PI * 2;
  const L = []; let prevA = null, turn = 0; // the lane over the span: s, the point, its normal, its angle round the core UNWRAPPED (th)
  for (let s = Math.max(0, a - BOSS_CORRIDOR * 2); ; s += BOSS_PIECE_STEP) { // (from before the 100% end: its ray cut reaches back past it on one side)
    const u = Math.min(s, b), q = pathAt(e.pi, u, ang), q2 = pathAt(e.pi, u + 1, ang), l = Math.hypot(q2.x - q.x, q2.y - q.y) || 1, nx = -(q2.y - q.y) / l, ny = (q2.x - q.x) / l;
    const th0 = Math.atan2(q.y - CY, q.x - CX); if (prevA !== null) { const d = th0 - prevA; if (d > Math.PI) turn -= TAU; else if (d < -Math.PI) turn += TAU; } prevA = th0;
    L.push({ s: u, x: q.x, y: q.y, nx, ny, th: th0 + turn }); if (s >= b) break;
  }
  const at = s => { let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m].s <= s) lo = m; else hi = m; } return L[lo]; }; // the sample at s
  const cuts = [];
  for (let i = 0; i < BOSS_RAYS; i++) {
    const th = (i + BOSS_RAY_JIT * (2 * bossHash(e, i, 4) - 1)) * TAU / BOSS_RAYS, xs = [];
    for (let j = 1; j < L.length; j++) { const p = L[j - 1], q = L[j]; if (q.s < a) continue; const k0 = Math.floor((p.th - th) / TAU), k1 = Math.floor((q.th - th) / TAU); if (k0 !== k1) { const f = (th + Math.max(k0, k1) * TAU - p.th) / (q.th - p.th || 1e-9); xs.push(p.s + (q.s - p.s) * Math.max(0, Math.min(1, f))); } } // (crossings inside the span only)
    if (xs.length) cuts.push({ s: xs[Math.floor(bossHash(e, i, 5) * xs.length) % xs.length], d: { x: Math.cos(th), y: Math.sin(th) } });
  }
  cuts.sort((p, q) => p.s - q.s);
  const sgn = Math.sign(L[L.length - 1].th - L[0].th) || 1; // the lane's winding round the core: +1 its angle grows toward the core
  // the slant of a cut: how far along the lane a side h off the lane meets the cut's ray, per unit of h (cot of ray against lane)
  const cot = c => { const C = at(c.s), tx = C.ny, ty = -C.nx, rx = C.x - CX, ry = C.y - CY, rl = Math.hypot(rx, ry) || 1, sn = Math.abs(tx * ry - ty * rx) / rl; return sn < BOSS_CUT_MIN ? 1 / BOSS_CUT_MIN : Math.abs(tx * rx + ty * ry) / rl / sn; };
  // the corridor at s: the lane one turn in and one turn out (the same angle round the core, +-2 pi) less a gap - a piece this wide
  // keeps a gap to the next turn (the inner turns sit closer than BOSS_CORRIDOR)
  const corrAt = s => { const m = at(s), rm = Math.hypot(m.x - CX, m.y - CY) || 1, rs = [];
    for (const dth of [-TAU, TAU]) { let best = null; for (const p of L) if (Math.abs(p.th - (m.th + dth)) < 0.05) { const r = Math.hypot(p.x - CX, p.y - CY); if (best === null || Math.abs(r - rm) < Math.abs(best - rm)) best = r; } if (best !== null) rs.push(Math.abs(best - rm) - BOSS_SEG_GAP); }
    return Math.max(4, Math.min(BOSS_CORRIDOR, ...rs)); };
  const wAt = s => Math.min(corrAt(s), (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * (b - s) / (b - a)) * (1 + BOSS_SEG_JIT)); // the widest a piece can be at s
  // THE PIECES' BOUNDS: the 100% end, the cuts, the 0% end - EVERY one a ray through the core (owner, 2026-10-27: "the cuts don't all seem
  // to use the core as a vanishing point"); a cut is kept only if the piece before it has room for both slanted ends and a gap, else it
  // is skipped and the piece runs on to the next - so no piece's ends ever cross (a bow-tie that read as overlap)
  const bounds = [{ s: a, gap: 0 }];
  for (const c of [...cuts.map(c => ({ s: c.s, gap: BOSS_SEG_GAP })), { s: b, gap: 0 }]) { const last = bounds[bounds.length - 1], need = BOSS_SEG_GAP + (wAt(last.s) / 2) * cot(last) + (wAt(c.s) / 2) * cot(c) + 2; if (c.s - last.s > need) bounds.push(c); else if (!c.gap) { if (bounds.length > 1) bounds.pop(); bounds.push(c); } }
  // a cut's LINE: the ray from the core through the lane point there, turned by half its gap (as an angle at that radius) toward the piece;
  // val(P) > 0 inside the piece. toward: +1 the piece lies at greater s than the cut, -1 at less
  const rayLine = (c, toward) => { const C = at(c.s), r = Math.hypot(C.x - CX, C.y - CY) || 1, al = Math.atan2(C.y - CY, C.x - CX) + toward * sgn * (c.gap / 2) / r, ca = Math.cos(al), sa = Math.sin(al), k = toward * sgn; return P => k * (ca * (P.y - CY) - sa * (P.x - CX)); };
  // a side cut at a line: from pts[i] (inside) toward the piece's start (back) or end, the first point past the line, interpolated; null if none
  const sideCut = (pts, i, val, back) => {
    if (val(pts[i]) < 0) return null;
    for (let j = i; back ? j > 0 : j < pts.length - 1; j += back ? -1 : 1) { const q = pts[j], r = pts[j + (back ? -1 : 1)], vq = val(q), vr = val(r); if (vr < 0) { const f = vq / (vq - vr || 1e-9); return { x: q.x + (r.x - q.x) * f, y: q.y + (r.y - q.y) * f, s: q.s + (r.s - q.s) * f, j }; } }
    return null;
  };
  const pieces = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const c0 = bounds[i], c1 = bounds[i + 1], f = (b - (c0.s + c1.s) / 2) / (b - a); // f: 1 at the 100% end, 0 at the core
    const w = Math.min(corrAt((c0.s + c1.s) / 2), (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * f) * (1 + BOSS_SEG_JIT * (2 * bossHash(e, i, 2) - 1)));
    const rad = w * BOSS_PIECE_ROUND, h = w / 2 - rad, reach = w * 4 + BOSS_SEG_GAP, base = L.filter(p => p.s >= c0.s - reach && p.s <= c1.s + reach); if (base.length < 2) continue;
    const side = sg => base.map(p => ({ s: p.s, x: p.x + p.nx * sg * h, y: p.y + p.ny * sg * h })), mi = base.findIndex(p => p.s >= (c0.s + c1.s) / 2), m = mi < 0 ? base.length >> 1 : mi;
    const v0 = rayLine(c0, 1), v1 = rayLine(c1, -1), s0 = c0.s + c0.gap / 2, s1 = c1.s - c1.gap / 2; // (s0 / s1: the square fallback, and the piece's reach along the lane)
    const sides = [1, -1].map(sg => { let P = side(sg); // the side cut at its two ends along the rays, square (by s) where a ray never crosses it
      const e0 = sideCut(P, m, v0, true), e1 = sideCut(P, m, v1, false);
      const from = e0 ? e0.j : P.findIndex(p => p.s >= s0), to = e1 ? e1.j : (P.length - 1 - [...P].reverse().findIndex(p => p.s <= s1));
      if (from < 0 || to < from) return null;
      P = P.slice(from, to + 1); if (e0) P.unshift({ x: e0.x, y: e0.y, s: e0.s }); if (e1) P.push({ x: e1.x, y: e1.y, s: e1.s });
      return P.length >= 2 ? P : null; });
    if (!sides[0] || !sides[1]) continue;
    pieces.push({ s0, s1, w, Lp: sides[0], Rp: sides[1] });
  }
  return e.bar = { key, a, b, pieces, L, sgn };
}
// the piece's part on one side of the HP boundary - a RAY through the core at the lane point of hp (so it points at the core like
// every cut): keepCore keeps the part toward the core (the HP left), else the part toward the mouth (the HP gone)
function barSplit(P, bar, hp, keepCore) {
  const L = bar.L; let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m].s <= hp) lo = m; else hi = m; }
  const p = L[lo], q = L[Math.min(L.length - 1, lo + 1)], f = q.s > p.s ? (hp - p.s) / (q.s - p.s) : 0, x = p.x + (q.x - p.x) * f, y = p.y + (q.y - p.y) * f, al = Math.atan2(y - CY, x - CX), ca = Math.cos(al), sa = Math.sin(al), k = (keepCore ? 1 : -1) * bar.sgn;
  const val = pt => k * (ca * (pt.y - CY) - sa * (pt.x - CX)), out = []; let prev = null;
  for (const pt of P) { const v = val(pt); if (prev && (v >= 0) !== (prev.v >= 0)) { const fr = prev.v / (prev.v - v || 1e-9); out.push({ x: prev.x + (pt.x - prev.x) * fr, y: prev.y + (pt.y - prev.y) * fr }); } if (v >= 0) out.push(pt); prev = { x: pt.x, y: pt.y, v }; }
  return out;
}
// a piece is a BOX with an outline and slightly rounded corners (owner, 2026-10-27: "add a red outline to the boxes / round the corners",
// then "roundness of edge should be ~5% of thickness"): the quad filled, then its outline stroked with round joins - BOSS_PIECE_ROUND of
// the width in the fill colour (the corners' radius), the outline colour BOSS_PIECE_OUT further out, under it
function barPiece(g, bar, hp, keepCore, at, fill, line) { // the piece's part on keepCore's side of the HP boundary at hp (hp null: the whole piece)
  let Lp = g.Lp, Rp = g.Rp;
  if (hp != null) { if (keepCore ? hp >= g.s1 : hp <= g.s0) return; if (keepCore ? hp > g.s0 : hp < g.s1) { Lp = barSplit(Lp, bar, hp, keepCore); Rp = barSplit(Rp, bar, hp, keepCore); } }
  if (Lp.length < 2 || Rp.length < 2) return;
  const rad = g.w * BOSS_PIECE_ROUND, mp = Lp[Lp.length >> 1];
  at(mp.x, mp.y, () => {
    ctx.beginPath();
    Lp.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i].x, Rp[i].y);
    ctx.closePath(); ctx.lineJoin = "round";
    ctx.strokeStyle = line; ctx.lineWidth = 2 * (rad + BOSS_PIECE_OUT); ctx.stroke();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 2 * rad; ctx.stroke();
  });
}

// EVERYTHING THAT IS NOT BACKGROUND OCCLUDES THE BAR (owner, 2026-10-27): on the top layer it would lie over the towers' prisms and
// the dice, so the canvas is CLIPPED to all but them first - each tower's hull (warp.hulls: its prism's corners on screen) and a circle
// round each live enemy's die, each wound against the full canvas (the nonzero rule: a hole whatever it overlaps)
const BOSS_OCCLUDE_K = 1.6;
function bossClip() {
  const hull = pts => { const P = [...pts].sort((a, b) => a.x - b.x || a.y - b.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
    for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return [...lo.slice(0, -1), ...up.slice(0, -1)]; }; // (monotone chain: counter-clockwise by the shoelace sign - the canvas rect below is clockwise)
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(0, 0, cv.width, cv.height);
  for (const pts of (typeof warp !== "undefined" && warp.hulls) || []) { const h = hull(pts.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))); if (h.length < 3) continue; h.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }
  for (const e of G.enemies) { if (e.dead || !e.seen) continue; const P = warpProject(e.x, e.y), r = solidSize(e) * BOSS_OCCLUDE_K * cam.k * (P.s || 1); if (!(r > 0)) continue; ctx.moveTo(P.x + r, P.y); ctx.arc(P.x, P.y, r, 0, Math.PI * 2, true); }
  ctx.clip();
}
function drawBossBar(at = (x, y, fn) => fn()) { // the HP left, in the lane's SHOWN colour: each piece's part past where the HP left begins
  // the top layer sits above the sky's flip, so a piece under the sky takes the INVERTED colour by hand - the lane's own under it has been
  // turned over by the shader (owner, 2026-10-27: "why are the segments white and blue" - cyan, the Star's own, over the flipped red lane)
  const own = COL[ENEMIES.bonus.color], inv = invertColor(own);
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.Lp[g.Lp.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; barPiece(g, e.bar, hp, true, at, c, c); }
  }
  ctx.globalAlpha = 1;
}
function drawBossTrack(at = (x, y, fn) => fn()) { // the HP gone: the pieces' white part from the 100% end to where the HP left begins
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e), own = COL[ENEMIES.bonus.color], inv = invertColor(own); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.Lp[g.Lp.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; barPiece(g, e.bar, hp, false, at, COL.white, c); } // hollow: white in the lane's outline
  }
  ctx.globalAlpha = 1;
}
// THE %HP MARKS AND THEIR LABELS (owner, 2026-10-26: "label the boss lane hp markers, ensure that the inversion doesn't affect the orange
// color / when the hp is below marker, make the label grey"): a tick across the lane and its "80%" beside it, orange (the threat colour)
// while the boss's HP is still at or above that share, grey once under it; drawn through skyKeep (drawSceneTop) so the boss sky's
// inversion leaves the orange alone
const BOSS_LABEL_PX = 9, BOSS_LABEL_OFF = 13;
function drawBossMarks(at = (x, y, fn) => fn()) {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { a: A, b: B } = bossSpan(e), hp = Math.max(0, e.hp) / e.max;
    for (const f of BOSS_BAR_MARKS) {
      const s = B - (B - A) * f /* f of the bar's span back from its 0% end */, col = hp >= f ? "threat" : "grid", a = pathAt(e.pi, s - 2, e.ang || 0), b = pathAt(e.pi, s + 2, e.ang || 0), q = pathAt(e.pi, s, e.ang || 0);
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
      at(q.x, q.y, () => { ctx.lineWidth = BOSS_BAR_W; ctx.lineCap = "butt"; ctx.globalAlpha = 0.9; ctx.strokeStyle = COL[col]; ctx.beginPath(); ctx.moveTo(q.x - nx * BOSS_MARK_U / 2, q.y - ny * BOSS_MARK_U / 2); ctx.lineTo(q.x + nx * BOSS_MARK_U / 2, q.y + ny * BOSS_MARK_U / 2); ctx.stroke(); });
    }
  }
  ctx.globalAlpha = 1;
}
// ...their LABELS on the top layer, flat at each mark's spot like a damage number (owner, 2026-10-26: "boss labels are unreadable? wrong
// layer?" - on the floor 3D warped them); at: 3D's placer (warpEntities' popRun), 2D draws in place
function drawBossLabels(at = (x, y, fn) => fn()) {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { a: A, b: B } = bossSpan(e), hp = Math.max(0, e.hp) / e.max;
    for (const f of BOSS_BAR_MARKS) {
      const s = B - (B - A) * f, a = pathAt(e.pi, s - 2, e.ang || 0), b = pathAt(e.pi, s + 2, e.ang || 0), q = pathAt(e.pi, s, e.ang || 0);
      const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, x = q.x - (b.y - a.y) / L * (BOSS_MARK_U / 2 + BOSS_LABEL_OFF), y = q.y + (b.x - a.x) / L * (BOSS_MARK_U / 2 + BOSS_LABEL_OFF);
      at(x, y, () => { ctx.globalAlpha = 1; text(Math.round(f * 100) + "%", x, y, BOSS_LABEL_PX, hp >= f ? "threat" : "grid", false); }); // no outline (owner, 2026-10-26)
    }
  }
}
