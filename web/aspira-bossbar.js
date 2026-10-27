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
const bossSpan = e => { const g = bossGeo(e); return { a: g.a, b: g.b, hp: g.b - (g.b - g.a) * Math.max(0, e.hp) / e.max }; }; // a: the 100% end, b: the 0% end, hp: where the HP left begins
// THE BAR IN PIECES (owner, 2026-10-26: "the width should increase as we approach the edge / chop up the hp lane into segments and
// jitter the size of each segment, jitter segments spatially on axis perpendicular to lane, but never more than 100% of the segment's
// width"): along the span, pieces BOSS_SEG_U long (each +-BOSS_SEG_JIT of it), BOSS_SEG_GAP apart; the bar BOSS_BAR_W wide at the core
// end, BOSS_BAR_WIDEN x that at the 100% end, each piece's width jittered the same and the piece set across the lane by up to its own
// width. A fixed hash a piece (the boss's id, the piece's index): the layout holds still from frame to frame
const BOSS_SEG_GAP = 10, BOSS_SEG_JIT = 0.4, BOSS_PIECE_W = [12, 44], BOSS_CORRIDOR = 80, BOSS_PIECE_OUT = 1.5, BOSS_PIECE_STEP = 2; // BOSS_SEG_GAP: between two pieces, across their cut; BOSS_SEG_JIT: a piece's width jitter; BOSS_PIECE_W: a piece's width at the core end .. the 100% end, u (owner, 2026-10-27: "widen the boxes as much as possible", "way thicker"); BOSS_CORRIDOR: a piece stays inside this much across the lane - no overlap with the next turn; BOSS_PIECE_OUT: its outline, u; BOSS_PIECE_STEP: u between a piece's points
// THE CUTS (owner, 2026-10-27: "choose 24 points on the edge of the screen equally radially distant around the core, then add some radial
// jitter, these are the lines that chop up the hp bar into segments. Each of these lines should cut the hp bar exactly once, at which
// intersection is randomly decided"): BOSS_RAYS rays from the core, evenly spaced round it, each turned by up to BOSS_RAY_JIT of the
// spacing; a ray crosses the spiral lane once a turn - ONE of its crossings inside the span, picked by hash, is its cut, and the piece
// ends there are cut ALONG THE RAY (bossPiece trims each side by the cut's slant). The 100% and 0% ends stay square
const BOSS_RAYS = 24, BOSS_RAY_JIT = 0.4, BOSS_CUT_SIN = 0.3; // BOSS_CUT_SIN: the flattest cut allowed (the sine of ray against lane), for the gap and the trims
const bossHash = (e, i, k) => { let h = (e.id * 7919 + i * 104729 + k * 31) | 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }; // 0..1
// COMPUTED ONCE A BOSS (owner, 2026-10-26: "can we precompute these if slow?"): the span, the lane's points over it, the cuts and every
// piece, kept on the boss (e.bar) and rebuilt only when the towers' reach changes (the 100% end moves with it) - a frame only picks each
// piece's part either side of where the HP left begins
function bossGeo(e) {
  const reach = typeof reachCircles === "function" ? reachCircles() : [], key = reach.map(c => Math.round(c.x) + "," + Math.round(c.y) + "," + Math.round(c.r)).join("|");
  if (e.bar && e.bar.key === key) return e.bar;
  const a = bossHitS(e), b = PATHS[e.pi].len - bossBarOut(), ang = e.ang || 0, TAU = Math.PI * 2;
  const L = []; let prevA = null, turn = 0; // the lane over the span: s, the point, its normal, its angle round the core UNWRAPPED (th)
  for (let s = a; ; s += BOSS_PIECE_STEP) {
    const u = Math.min(s, b), q = pathAt(e.pi, u, ang), q2 = pathAt(e.pi, u + 1, ang), l = Math.hypot(q2.x - q.x, q2.y - q.y) || 1, nx = -(q2.y - q.y) / l, ny = (q2.x - q.x) / l;
    const th0 = Math.atan2(q.y - CY, q.x - CX); if (prevA !== null) { const d = th0 - prevA; if (d > Math.PI) turn -= TAU; else if (d < -Math.PI) turn += TAU; } prevA = th0;
    L.push({ s: u, x: q.x, y: q.y, nx, ny, th: th0 + turn }); if (s >= b) break;
  }
  const at = s => { let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m].s <= s) lo = m; else hi = m; } return L[lo]; }; // the sample at s
  const slant = c => { const p = at(c.s), tx = p.ny, ty = -p.nx; return Math.max(BOSS_CUT_SIN, Math.abs(tx * c.d.y - ty * c.d.x)); }; // |lane tangent x ray|: 1 square, small when the ray runs along the lane
  const cuts = [];
  for (let i = 0; i < BOSS_RAYS; i++) {
    const th = (i + BOSS_RAY_JIT * (2 * bossHash(e, i, 4) - 1)) * TAU / BOSS_RAYS, xs = [];
    for (let j = 1; j < L.length; j++) { const p = L[j - 1], q = L[j], k0 = Math.floor((p.th - th) / TAU), k1 = Math.floor((q.th - th) / TAU); if (k0 !== k1) { const f = (th + Math.max(k0, k1) * TAU - p.th) / (q.th - p.th || 1e-9); xs.push(p.s + (q.s - p.s) * Math.max(0, Math.min(1, f))); } }
    if (xs.length) cuts.push({ s: xs[Math.floor(bossHash(e, i, 5) * xs.length) % xs.length], d: { x: Math.cos(th), y: Math.sin(th) } });
  }
  cuts.sort((p, q) => p.s - q.s);
  const bounds = [{ s: a, d: null }]; for (const c of cuts) if (c.s - bounds[bounds.length - 1].s > BOSS_SEG_GAP * 2 && b - c.s > BOSS_SEG_GAP * 2) bounds.push(c); bounds.push({ s: b, d: null }); // (a cut within two gaps of the last: dropped)
  const pieces = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    // EACH PIECE SHOVED TOWARD OR AWAY FROM THE CORE (owner, 2026-10-27: "jitter these formed segments towards or away from the core / make
    // segments jittered inward smaller so that they do not overlap, and make outwardly pushed pieces bigger to maintain gap size"): a
    // homothety about the core by k - the rays through the core map to themselves, so a shoved piece's ends still lie along its cuts; it
    // shrinks inward and grows outward with its sector, width too; its gap along the lane is set / k so the gap across the cut stays
    const c0 = bounds[i], c1 = bounds[i + 1], mid = at((c0.s + c1.s) / 2), rm = Math.hypot(mid.x - CX, mid.y - CY) || 1;
    const f = (b - (c0.s + c1.s) / 2) / (b - a), w0 = Math.min(BOSS_CORRIDOR, (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * f) * (1 + BOSS_SEG_JIT * (2 * bossHash(e, i, 2) - 1))), lim = (BOSS_CORRIDOR - w0) / 2; // f: 1 at the 100% end, 0 at the core
    const shove = Math.max(-lim, Math.min(lim, w0 * (2 * bossHash(e, i, 3) - 1))), k = 1 + shove / rm, w = w0 * k; // shove: up to its width, inside the corridor
    const s0 = c0.d ? c0.s + BOSS_SEG_GAP / 2 / slant(c0) / k : c0.s, s1 = c1.d ? c1.s - BOSS_SEG_GAP / 2 / slant(c1) / k : c1.s; // the gap, measured across the cut, on the shoved piece
    if (s1 - s0 < 2) continue;
    const pts = L.filter(p => p.s >= s0 - BOSS_CORRIDOR && p.s <= s1 + BOSS_CORRIDOR).map(p => ({ s: p.s, x: CX + (p.x - CX) * k, y: CY + (p.y - CY) * k, nx: p.nx, ny: p.ny })); // (a margin each end: the slanted cuts reach past s0 / s1 on one side)
    pieces.push({ s0, s1, w, k, pts, cut0: c0.d, cut1: c1.d });
  }
  return e.bar = { key, a, b, pieces };
}
const bossLerp = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, nx: p.nx, ny: p.ny });
function bossSide(P, from, to, h) { // one side of a piece: its points between from and to (the ends interpolated), h along the normal
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (p.s < from) { if (i + 1 < P.length && P[i + 1].s > from) out.push(bossLerp(p, P[i + 1], (from - p.s) / (P[i + 1].s - p.s))); continue; }
    if (p.s > to) { if (i > 0 && P[i - 1].s < to) out.push(bossLerp(P[i - 1], p, (to - P[i - 1].s) / (p.s - P[i - 1].s))); break; }
    out.push(p);
  }
  return out.map(p => ({ x: p.x + p.nx * h, y: p.y + p.ny * h }));
}
// a piece is a BOX with an outline and slightly rounded corners (owner, 2026-10-27: "add a red outline to the boxes / round the corners",
// then "roundness of edge should be ~5% of thickness"): each side's points between its own ends - a side's end at a ray cut is moved
// along the lane by the cut's slant (h x cot of ray against lane), so the end edge lies ALONG the ray - then the quad filled and its
// outline stroked with round joins: BOSS_PIECE_ROUND of the width in the fill colour (the corners' radius), the outline colour
// BOSS_PIECE_OUT further out, under it
const BOSS_PIECE_ROUND = 0.05;
function bossPiece(g, from, to, at, fill, line) { // the piece's stretch [from, to] along the lane
  if (to - from < 1) return;
  const rad = g.w * BOSS_PIECE_ROUND, h = g.w / 2 - rad, P = g.pts;
  const trim = (d, s, sign) => { // how far along the lane a side's end moves for a cut along ray d at s: the side sits sign x h off the lane
    let p = P[0]; for (const q of P) { if (q.s > s) break; p = q; } const tx = p.ny, ty = -p.nx, cr = tx * d.y - ty * d.x, nd = p.nx * d.y - p.ny * d.x;
    return Math.abs(cr) < BOSS_CUT_SIN ? 0 : -sign * h * nd / cr / (g.k || 1); // (/ k: a shoved piece's lane units are k long)
  };
  const c0 = Math.abs(from - g.s0) < 1e-6 ? g.cut0 : null, c1 = Math.abs(to - g.s1) < 1e-6 ? g.cut1 : null;
  const Lp = bossSide(P, from + (c0 ? trim(c0, from, 1) : 0), to + (c1 ? trim(c1, to, 1) : 0), h), Rp = bossSide(P, from + (c0 ? trim(c0, from, -1) : 0), to + (c1 ? trim(c1, to, -1) : 0), -h);
  if (Lp.length < 2 || Rp.length < 2) return;
  const m = Lp[Lp.length >> 1];
  at(m.x, m.y, () => {
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
    for (const g of e.bar.pieces) { const m = g.pts[g.pts.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; bossPiece(g, Math.max(g.s0, hp), g.s1, at, c, c); }
  }
  ctx.globalAlpha = 1;
}
function drawBossTrack(at = (x, y, fn) => fn()) { // the HP gone: the pieces' white part from the 100% end to where the HP left begins
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e), own = COL[ENEMIES.bonus.color], inv = invertColor(own); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.pts[g.pts.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; bossPiece(g, g.s0, Math.min(g.s1, hp), at, COL.white, c); } // hollow: white in the lane's outline
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
