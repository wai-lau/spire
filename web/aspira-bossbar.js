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
const BOSS_SEG_U = 280, BOSS_SEG_GAP = 10, BOSS_SEG_JIT = 0.4, BOSS_PIECE_W = [12, 44], BOSS_CORRIDOR = 80, BOSS_PIECE_OUT = 1.5, BOSS_PIECE_STEP = 2; // BOSS_SEG_U: every piece this long, no jitter along the lane (owner, 2026-10-27); BOSS_CORRIDOR: a piece stays inside this much across the lane - no overlap with the next turn (owner: "ensure that there is no overlap") // ("way thicker", "increase spacing" - owner, 2026-10-27) // BOSS_PIECE_W: a piece's width at the core end .. the 100% end, u (owner, 2026-10-27: "widen the boxes as much as possible"); BOSS_PIECE_OUT: its outline, u; BOSS_PIECE_STEP: u between a piece's points (owner: "resolution too low" at the lane's 10)
const bossHash = (e, i, k) => { let h = (e.id * 7919 + i * 104729 + k * 31) | 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }; // 0..1
// COMPUTED ONCE A BOSS (owner, 2026-10-26: "can we precompute these if slow?"): the span and every piece's points, kept on the boss
// (e.bar) and rebuilt only when the towers' reach changes (the 100% end moves with it) - a frame only picks each piece's part either
// side of where the HP left begins
function bossGeo(e) {
  const reach = typeof reachCircles === "function" ? reachCircles() : [], key = reach.map(c => Math.round(c.x) + "," + Math.round(c.y) + "," + Math.round(c.r)).join("|");
  if (e.bar && e.bar.key === key) return e.bar;
  const a = bossHitS(e), b = PATHS[e.pi].len - bossBarOut(), ang = e.ang || 0, pieces = []; let s = a, i = 0;
  while (s < b) {
    const s1 = Math.min(b, s + BOSS_SEG_U), f = (b - (s + s1) / 2) / (b - a); // f: 1 at the 100% end, 0 at the core
    const w = Math.min(BOSS_CORRIDOR, (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * f) * (1 + BOSS_SEG_JIT * (2 * bossHash(e, i, 2) - 1))), lim = (BOSS_CORRIDOR - w) / 2, off = Math.max(-lim, Math.min(lim, w * (2 * bossHash(e, i, 3) - 1))), pts = []; // off: up to its own width, kept inside the corridor
    for (let t = s; ; t += BOSS_PIECE_STEP) {
      const u = Math.min(t, s1), q = pathAt(e.pi, u, ang), q2 = pathAt(e.pi, u + 1, ang), l = Math.hypot(q2.x - q.x, q2.y - q.y) || 1, nx = -(q2.y - q.y) / l, ny = (q2.x - q.x) / l;
      pts.push({ s: u, x: q.x + nx * off, y: q.y + ny * off, nx, ny }); if (t >= s1) break;
    }
    pieces.push({ s0: s, s1, w, pts }); s = s1 + BOSS_SEG_GAP; i++;
  }
  return e.bar = { key, a, b, pieces };
}
const bossLerp = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, nx: p.nx, ny: p.ny });
// ON THE TOP LAYER (owner, 2026-10-26: "I want it crisp like the numbers"): the bar, its track and marks are drawn through warpEntities'
// pop (at), straight onto the screen at device resolution like the %HP labels and the damage numbers - on the board's moving layer they
// were a texture resampled through the warp, soft at any zoom
// a piece is a BOX with an outline and slightly rounded corners (owner, 2026-10-27: "add a red outline to the boxes / round the corners",
// then "roundness of edge should be ~5% of thickness"): the quad filled, then its outline stroked with round joins - BOSS_PIECE_ROUND of
// the width in the fill colour (the corners' radius), and the outline colour BOSS_PIECE_OUT further out, under it
const BOSS_PIECE_ROUND = 0.05;
function bossPiece(g, from, to, at, fill, line) { // the piece's stretch [from, to]: its points inside, the ends interpolated
  if (to - from < 1) return;
  const P = g.pts, sel = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (p.s < from) { if (i + 1 < P.length && P[i + 1].s > from) sel.push(bossLerp(p, P[i + 1], (from - p.s) / (P[i + 1].s - p.s))); continue; }
    if (p.s > to) { if (i > 0 && P[i - 1].s < to) sel.push(bossLerp(P[i - 1], p, (to - P[i - 1].s) / (p.s - P[i - 1].s))); break; }
    sel.push(p);
  }
  if (sel.length < 2) return;
  const m = sel[sel.length >> 1], rad = g.w * BOSS_PIECE_ROUND, h = g.w / 2 - rad; // the quad drawn rad inside the width: the round-joined stroke brings it back out
  at(m.x, m.y, () => {
    ctx.beginPath();
    for (let i = 0; i < sel.length; i++) { const p = sel[i]; if (i) ctx.lineTo(p.x + p.nx * h, p.y + p.ny * h); else ctx.moveTo(p.x + p.nx * h, p.y + p.ny * h); }
    for (let i = sel.length - 1; i >= 0; i--) { const p = sel[i]; ctx.lineTo(p.x - p.nx * h, p.y - p.ny * h); }
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
  const own = COL[ENEMIES.bonus.color], inv = invertColor(own), all = skyPal(), on = skyOn();
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.pts[g.pts.length >> 1], c = all || (on && Math.hypot(m.x - bossInv.x, m.y - bossInv.y) < bossInv.r) ? inv : own; bossPiece(g, Math.max(g.s0, hp), g.s1, at, c, c); }
  }
  ctx.globalAlpha = 1;
}
function drawBossTrack(at = (x, y, fn) => fn()) { // the HP gone: the pieces' white part from the 100% end to where the HP left begins
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e), own = COL[ENEMIES.bonus.color], inv = invertColor(own), all = skyPal(), on = skyOn(); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.pts[g.pts.length >> 1], c = all || (on && Math.hypot(m.x - bossInv.x, m.y - bossInv.y) < bossInv.r) ? inv : own; bossPiece(g, g.s0, Math.min(g.s1, hp), at, COL.white, c); } // hollow: white in the lane's outline
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
