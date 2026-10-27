// THE BOSS'S HP ALONG ITS LANE - the bar, its pieces, marks and labels, split out of aspira-bosses.js (the 500-line cap, 2026-10-27);
// drawn on the top layer through warpEntities (aspira-warp.js) and clipped out under every tower and die (bossClip)
const BOSS_BAR_W = 2.2, BOSS_BAR_TRACK = 0.3; // as thin as a lit lane's opaque core, LIT_LINE_SOFT's last (owner, 2026-10-26: "a lot thinner"; was 21); the track = full HP, translucent
const BOSS_BAR_MARKS = [0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0]; // the %HP marks along the lane (owner, 2026-10-26: "add markers at 80 60 40 20 10 and 5% hp along the lane"), ...and 0% at the core (owner, 2026-10-26) - drawn as numbers on the bar (drawBossLabels)
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
const BOSS_SEG_GAP = 10, BOSS_SEG_JIT = 1 /* (owner, 2026-10-27: "5x thickness jitter"; was 0.2) */, BOSS_PIECE_W = [5, 44], BOSS_CORRIDOR = 80, BOSS_SHOVE = 1, BOSS_PIECE_OUT = 1.5, BOSS_PIECE_STEP = 2; // BOSS_SHOVE: a piece's slide ALONG ITS SPOKE (every point moved out or in along its own ray from the core, so the cut ends stay rays through it), as a share of the free room between it and the turns either side - 1: the whole room, 0: none (owner, 2026-10-27: "add placement jitter now, but along the spokes and still [no overlap]"; an earlier slide along the mean ray was "weirdly offset from the lane"); BOSS_CORRIDOR: the most a piece may take across the lane - less where the spiral's turns are closer (the pitch there) // BOSS_SEG_GAP: between two pieces, across their cut; BOSS_SEG_JIT: a piece's width jitter; BOSS_PIECE_W: a piece's width at the core end .. the 100% end, u (owner, 2026-10-27: "widen the boxes as much as possible", "way thicker"); BOSS_CORRIDOR: a piece stays inside this much across the lane - no overlap with the next turn; BOSS_PIECE_OUT: its outline, u; BOSS_PIECE_STEP: u between a piece's points
// THE CUTS (owner, 2026-10-27: "choose 24 points on the edge of the screen equally radially distant around the core, then add some radial
// jitter, these are the lines that chop up the hp bar into segments. Each of these lines should cut the hp bar exactly once, at which
// intersection is randomly decided"): BOSS_RAYS rays from the core, evenly spaced round it, each turned by up to BOSS_RAY_JIT of the
// spacing; a ray crosses the spiral lane once a turn - EVERY crossing inside the span is a cut (owner, 2026-10-27: "without placement
// jitter"; one a ray, picked by hash, left long uncut runs), and the piece ends there lie ALONG THE RAY (owner, 2026-10-27: "the aligned
// spoke is more important") - so the cuts on every turn line up as spokes
const BOSS_RAYS = 24, BOSS_RAY_JIT = 0.4, BOSS_CUT_MIN = 0.25, BOSS_PIECE_ROUND = 0.05, BOSS_PIECE_MIN = 0.5, BOSS_PIECE_FLOOR = 20, BOSS_SLIDE_MAX = 30, BOSS_SLIDE_W = 1, BOSS_GAP_CORE = 0.3, BOSS_OUT_CORE = 0.3, BOSS_FLOOR_CORE = 0.15, BOSS_CUT_MARGIN = 2; // BOSS_PIECE_MIN: a piece at least this much of its width long, else the cut is skipped; BOSS_PIECE_FLOOR: no piece thinner, u, unless the turns either side sit closer (owner, 2026-10-27: "floor 10u", "floor 30u", then "min width should be like 20u"; was 4); BOSS_SLIDE_MAX: a piece's slide along its spoke, u, at most; BOSS_SLIDE_W: ...and at most this many of its own widths; BOSS_GAP_CORE / BOSS_OUT_CORE / BOSS_FLOOR_CORE: the gap, the outline and the width floor at the core, of their full values at the 100% end (owner, 2026-10-27: "outer gaps 10u / inner gaps 3u"; the outline 0.45 u, the floor 3 u); BOSS_CUT_MARGIN: u of slack a cut needs past the slant room, scaled the same; BOSS_CUT_MIN: a ray flatter than this against the lane (its sine) cuts square; BOSS_PIECE_ROUND: a piece's corner radius, of its width
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
    for (const s of xs) cuts.push({ s, d: { x: Math.cos(th), y: Math.sin(th) } }); // EVERY crossing cuts (owner, 2026-10-27: "without placement jitter"; was one a ray, picked by hash)
  }
  cuts.sort((p, q) => p.s - q.s);
  const sgn = Math.sign(L[L.length - 1].th - L[0].th) || 1; // the lane's winding round the core: +1 its angle grows toward the core
  // where s sits between the core's rim (0) and the 100% end (1), by radius: the corners' roundness, and the gap between pieces - a full
  // BOSS_SEG_GAP out at the 100% end, BOSS_GAP_CORE of it at the core, where a 10 u gap was most of a spoke's spacing and few cuts fit
  // (owner, 2026-10-27: "increase likelihood of chop near core")
  // (share: along the span - the lane's last stretch swings in and out of the core's radius; the width taper uses the same)
  const share = s => Math.max(0, Math.min(1, (b - s) / (b - a || 1)));
  // EVERYTHING TAPERS TO THE CORE (owner, 2026-10-27: "segments should get progressively thinner as lane approaches core, but keep
  // jittering" / "gap width should also get progressively smaller towards core" / "keep having segments all the way to the core"): the
  // width's floor, the gap, the outline and the cut's margin each shrink with share, to a share of themselves at the core
  const gapAt = s => BOSS_SEG_GAP * Math.max(BOSS_GAP_CORE, share(s)), outAt = s => BOSS_PIECE_OUT * Math.max(BOSS_OUT_CORE, share(s)), floorAt = s => BOSS_PIECE_FLOOR * Math.max(BOSS_FLOOR_CORE, share(s));
  // the slant of a cut: how far along the lane a side h off the lane meets the cut's ray, per unit of h (cot of ray against lane)
  const cot = c => { const C = at(c.s), tx = C.ny, ty = -C.nx, rx = C.x - CX, ry = C.y - CY, rl = Math.hypot(rx, ry) || 1, sn = Math.abs(tx * ry - ty * rx) / rl; return sn < BOSS_CUT_MIN ? 0 : Math.abs(tx * rx + ty * ry) / rl / sn; }; // (0: a flat ray cuts SQUARE - rayLine - and a square end needs no slant room; it once counted 1 / BOSS_CUT_MIN and no cut fit on the lane's last stretch into the core)
  // the corridor at s: the lane one turn in and one turn out (the same angle round the core, +-2 pi) less a gap - a piece this wide
  // keeps a gap to the next turn (the inner turns sit closer than BOSS_CORRIDOR)
  const corrAt = (s, cap = BOSS_CORRIDOR) => { const m = at(s), rm = Math.hypot(m.x - CX, m.y - CY) || 1, rs = [];
    for (const dth of [-TAU, TAU]) { let best = null; for (const p of L) if (Math.abs(p.th - (m.th + dth)) < 0.05) { const r = Math.hypot(p.x - CX, p.y - CY); if (best === null || Math.abs(r - rm) < Math.abs(best - rm)) best = r; } if (best !== null) rs.push(Math.abs(best - rm) - BOSS_SEG_GAP); }
    return Math.max(4, Math.min(cap, ...rs)); };
  // piece i's width at s: the taper (BOSS_PIECE_W at the core end .. the 100% end) jittered by its hash, inside the corridor, never under BOSS_PIECE_FLOOR
  const marksS = BOSS_BAR_MARKS.map(f => b - (b - a) * f), markIn = (s0, s1) => marksS.findIndex(m => m >= s0 - 1e-6 && m <= s1 + 1e-6); // the mark (its index in BOSS_BAR_MARKS) between s0 and s1, -1 none: the piece holding one carries its number and is at least BOSS_LABEL_W wide (owner, 2026-10-27: "min thickness of segment with a number should be 50")
  const wOf = (i, s, s0, s1) => Math.min(corrAt(s), Math.max(markIn(s0, s1) >= 0 ? BOSS_LABEL_W : 0, floorAt(s), (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * (b - s) / (b - a)) * (1 + BOSS_SEG_JIT * (2 * bossHash(e, i, 2) - 1)))); // (the corridor last: the floor never pushes a piece into the next turn)
  // the piece's slide along its spoke: at most BOSS_SLIDE_MAX (owner, 2026-10-27: "cap spoke jitter to +/-30u so that they cover lane"), and
  // at most the room left between its width and the turns either side (half each way, so two turns' pieces slid toward each other still
  // keep the gap - the real pitch, not BOSS_CORRIDOR). Along the lane a slide changes nothing: the piece is cut after it slides
  const slideOf = (i, s, w) => BOSS_SHOVE * Math.min(BOSS_SLIDE_MAX, BOSS_SLIDE_W * w, Math.max(0, (corrAt(s, Infinity) - w) / 2)) * (2 * bossHash(e, i, 3) - 1); // (BOSS_SLIDE_W * w: a thin piece slides less, in step with its width - owner, 2026-10-27: "ensure that spoke jitter is reduced proportionally to thickness")
  const slid = (P, d) => P.map(p => { const dx = p.x - CX, dy = p.y - CY, r = Math.hypot(dx, dy) || 1, k = (r + d) / r; return { s: p.s, x: CX + dx * k, y: CY + dy * k }; });
  // THE PIECES' BOUNDS: the 100% end, the cuts, the 0% end - EVERY one a ray through the core (owner, 2026-10-27: "the cuts don't all seem
  // to use the core as a vanishing point"); a cut is kept only if the piece before it has room for both slanted ends and a gap, else it
  // is skipped and the piece runs on to the next - so no piece's ends ever cross (a bow-tie that read as overlap)
  const bounds = [{ s: a, gap: 0 }];
  // ...and no piece shorter than BOSS_PIECE_MIN of its width (owner, 2026-10-27: "min piece length sure" - two jittered spokes 3 degrees apart made a sliver)
  for (const c of [...cuts.map(c => ({ s: c.s, gap: gapAt(c.s) })), { s: b, gap: 0 }]) { const last = bounds[bounds.length - 1], w = wOf(bounds.length - 1, (last.s + c.s) / 2, last.s, c.s) /* (the piece this cut would close: its own width) */, gap = (last.gap + c.gap) / 2, need = Math.max(gap + (w / 2) * (cot(last) + cot(c)) + BOSS_CUT_MARGIN * Math.max(BOSS_GAP_CORE, share(c.s)), gap + BOSS_PIECE_MIN * w); if (c.s - last.s > need) bounds.push(c); else if (!c.gap) { if (bounds.length > 1) bounds.pop(); bounds.push(c); } }
  // a cut's LINE: the ray from the core through the lane point there, turned by half its gap (as an angle at that radius) toward the piece;
  // val(P) > 0 inside the piece. toward: +1 the piece lies at greater s than the cut, -1 at less
  const rayLine = (c, toward) => { const C = at(c.s), tx = C.ny, ty = -C.nx, rx = C.x - CX, ry = C.y - CY, r = Math.hypot(rx, ry) || 1;
    if (Math.abs(tx * ry - ty * rx) / r < BOSS_CUT_MIN) return P => toward * (tx * (P.x - C.x) + ty * (P.y - C.y)) - c.gap / 2; // SQUARE where the ray runs along the lane (the last stretch into the core): across the lane at the cut, half a gap toward the piece
    const al = Math.atan2(ry, rx), ca = Math.cos(al), sa = Math.sin(al), k = toward * sgn; return P => k * (ca * (P.y - CY) - sa * (P.x - CX)) - c.gap / 2; }; // PARALLEL to the ray, half a gap over (owner, 2026-10-27: "why are gaps inconsistent?" - two rays a gap-angle apart made a wedge, wider at a wide piece's outer edge than its inner): a gap is the same width at any radius
  // a side cut at a line: the side's crossing of it nearest pts[i] (the piece's middle), toward the piece's start (back) or end, interpolated;
  // j the last point inside. Near the core a side sits several u along the lane from its base (the normal is far from radial), so a short
  // piece's middle may already be PAST its end line: then the search backs up to the last point inside instead of giving up (a square end
  // there sat 2 u from its neighbour and overlapped once slid, 2026-10-27). null: no crossing within the side's reach
  const sideCut = (pts, i, val, back) => {
    const d = back ? -1 : 1; let j = i;
    if (val(pts[i]) >= 0) { while (j + d >= 0 && j + d < pts.length && val(pts[j + d]) >= 0) j += d; if (j + d < 0 || j + d >= pts.length) return null; }
    else { while (j >= 0 && j < pts.length && val(pts[j]) < 0) j -= d; if (j < 0 || j >= pts.length) return null; }
    const q = pts[j], r = pts[j + d], vq = val(q), vr = val(r), f = vq / (vq - vr || 1e-9);
    return { x: q.x + (r.x - q.x) * f, y: q.y + (r.y - q.y) * f, s: q.s + (r.s - q.s) * f, j };
  };
  const pieces = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const c0 = bounds[i], c1 = bounds[i + 1], w = wOf(i, (c0.s + c1.s) / 2, c0.s, c1.s), mk = markIn(c0.s, c1.s);
    const mid = (c0.s + c1.s) / 2, rad = w * BOSS_PIECE_ROUND * share(mid), out = outAt(mid); // the corners rounder the farther from the core, square at it (owner, 2026-10-27: "reduce the corner roundedness correlated to distance from core, no roundness at core")
    const h = w / 2 - rad, reach = w * 4 + BOSS_SEG_GAP, base = L.filter(p => p.s >= c0.s - reach && p.s <= c1.s + reach); if (base.length < 2) continue;
    const side = sg => base.map(p => ({ s: p.s, x: p.x + p.nx * sg * h, y: p.y + p.ny * sg * h })), mi = base.findIndex(p => p.s >= (c0.s + c1.s) / 2), m = mi < 0 ? base.length >> 1 : mi;
    const v0 = rayLine(c0, 1), v1 = rayLine(c1, -1), s0 = c0.s + c0.gap / 2, s1 = c1.s - c1.gap / 2; // (s0 / s1: the square fallback, and the piece's reach along the lane)
    // SLID FIRST, THEN CUT (owner, 2026-10-27: "when we jitter along spoke, can we shift along lane so that gaps stay consistent?"): the cut
    // lines stand still, so whatever a piece's slide - or its neighbour's - each keeps its own side of the line and the gap is exact
    const d = slideOf(i, mid, w), sides = [1, -1].map(sg => { let P = slid(side(sg), d); // the side cut at its two ends along the rays, square (by s) where a ray never crosses it
      const e0 = sideCut(P, m, v0, true), e1 = sideCut(P, m, v1, false);
      const from = e0 ? e0.j : P.findIndex(p => p.s >= s0), to = e1 ? e1.j : (P.length - 1 - [...P].reverse().findIndex(p => p.s <= s1));
      if (from < 0 || to < from - 1) return null; // (to = from - 1: no sample between the two crossings, the side is just the two of them)
      P = P.slice(from, to + 1); if (e0) P.unshift({ x: e0.x, y: e0.y, s: e0.s }); if (e1) P.push({ x: e1.x, y: e1.y, s: e1.s });
      return P.length >= 2 ? P : null; });
    if (!sides[0] || !sides[1]) continue;
    pieces.push({ s0, s1, w, d, rad, out, mi: mk, cs0: c0.s, cs1: c1.s, g0: c0.gap, g1: c1.gap, Lp: sides[0], Rp: sides[1] }); // (mi: the mark it carries, -1 none; cs0 / cs1, g0 / g1: its cuts and their gaps - drawBossLabels)
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
// EVERY POINT PROJECTED (owner, 2026-10-27: "why is the outer layer jagged" - a piece drawn flat about its midpoint, as the dice are, sat up
// to 54 px off the lane's projection at its ends, so each stepped against its neighbour): the outline is traced in canvas px through
// warpProjectScratch (aspira-warp.js), its widths by the perspective's scale at the piece's middle
function barPiece(g, bar, hp, keepCore, fill, line) { // the piece's part on keepCore's side of the HP boundary at hp (hp null: the whole piece)
  let Lp = g.Lp, Rp = g.Rp;
  if (hp != null) { if (keepCore ? hp >= g.s1 : hp <= g.s0) return; if (keepCore ? hp > g.s0 : hp < g.s1) { Lp = barSplit(Lp, bar, hp, keepCore); Rp = barSplit(Rp, bar, hp, keepCore); } }
  if (Lp.length < 2 || Rp.length < 2) return;
  const mp = Lp[Lp.length >> 1], k = cam.k * (warpProjectScratch(mp.x, mp.y).s || 1), rad = g.rad * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath();
  Lp.forEach((p, i) => { const P = warpProjectScratch(p.x, p.y); if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y); });
  for (let i = Rp.length - 1; i >= 0; i--) { const P = warpProjectScratch(Rp[i].x, Rp[i].y); ctx.lineTo(P.x, P.y); }
  ctx.closePath(); ctx.lineJoin = "round";
  ctx.strokeStyle = line; ctx.lineWidth = 2 * (rad + g.out * k); ctx.stroke();
  ctx.fillStyle = fill; ctx.fill(); if (rad > 0.01) { ctx.strokeStyle = fill; ctx.lineWidth = 2 * rad; ctx.stroke(); } // (a square piece at the core: no rounding stroke - a 0 lineWidth would keep the last)
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
function drawBossBar() { // the HP left, in the lane's SHOWN colour: each piece's part past where the HP left begins
  // the top layer sits above the sky's flip, so a piece under the sky takes the INVERTED colour by hand - the lane's own under it has been
  // turned over by the shader (owner, 2026-10-27: "why are the segments white and blue" - cyan, the Star's own, over the flipped red lane)
  const own = COL[ENEMIES.bonus.color], inv = invertColor(own);
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.Lp[g.Lp.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; barPiece(g, e.bar, hp, true, c, c); }
  }
  ctx.globalAlpha = 1;
}
function drawBossTrack() { // the HP gone: the pieces' white part from the 100% end to where the HP left begins
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e), own = COL[ENEMIES.bonus.color], inv = invertColor(own); ctx.globalAlpha = 1;
    for (const g of e.bar.pieces) { const m = g.Lp[g.Lp.length >> 1], c = inSkyPt(m.x, m.y) ? inv : own; barPiece(g, e.bar, hp, false, COL.white, c); } // hollow: white in the lane's outline
  }
  ctx.globalAlpha = 1;
}
// THE %HP NUMBERS ON THE BAR (owner, 2026-10-27: "get rid of the arrows / numbers in white, on the hp bar / have the bottom of the number
// aligned with one of the spokes" / "drop the % and resize numbers to fit on the segment they are on / min thickness of segment with a
// number should be 50"; 2026-10-26: the marks at 80 60 40 20 10 5 and 0%): each number lies ON the piece that holds its mark (barGeo
// makes that piece BOSS_LABEL_W wide where the turns allow), its bottom along one of the piece's two cut lines (spokes) - the one whose
// way into the piece is UP on the screen, so it never reads upside down - half a gap plus BOSS_LABEL_PAD in from it, centred on the
// piece's own radius (its slide included), reading along the spoke; BOSS_LABEL_PX[0] at the core to [1] at the 100% end, shrunk to fit
// the piece's width (its length along the spoke) and length (its height). White over the HP left; the lane's colour over the HP gone
const BOSS_LABEL_PX = [12, 24], BOSS_LABEL_PAD = 2, BOSS_LABEL_W = 50, BOSS_LABEL_CAP = 0.8; // BOSS_LABEL_CAP: a number's height, of its size
function drawBossLabels() {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const hp = Math.max(0, e.hp) / e.max, ang = e.ang || 0;
    for (const p of e.bar.pieces) {
      if (!(p.mi >= 0)) continue;
      const f = BOSS_BAR_MARKS[p.mi], str = String(Math.round(f * 100)), tan = s => { const Q = pathAt(e.pi, s, ang), Q2 = pathAt(e.pi, s + 1, ang), l = Math.hypot(Q2.x - Q.x, Q2.y - Q.y) || 1; return { Q, tx: (Q2.x - Q.x) / l, ty: (Q2.y - Q.y) / l }; };
      // the edge: the start cut (into the piece: +s) if +s is up on the screen there, else the end cut (into the piece: -s)
      const E0 = tan(p.cs0), S0 = warpProject(E0.Q.x, E0.Q.y), S1 = warpProject(E0.Q.x + E0.tx * 10, E0.Q.y + E0.ty * 10), start = S1.y - S0.y <= 0;
      const E = start ? E0 : tan(p.cs1), sg = start ? 1 : -1, gap = start ? p.g0 : p.g1, vx = E.tx * sg, vy = E.ty * sg, rx = E.Q.x - CX, ry = E.Q.y - CY, rl = Math.hypot(rx, ry) || 1;
      const inset = gap / 2 + BOSS_LABEL_PAD, W = { x: CX + rx / rl * (rl + p.d) + vx * inset, y: CY + ry / rl * (rl + p.d) + vy * inset }, S = warpProject(W.x, W.y), k = cam.k * (S.s || 1); // the baseline's middle
      const Up = warpProject(W.x + vx * 10, W.y + vy * 10), ex = Up.x - S.x, ey = Up.y - S.y, el = Math.hypot(ex, ey) || 1, th = Math.atan2(ex / el, -ey / el); // "up" on the screen -> the text's rotation
      ctx.font = "100px " + CANVAS_FONT; const w100 = ctx.measureText(str).width || 60; // the string's width at 100 px: the fit along the spoke
      const px = Math.min(BOSS_LABEL_PX[0] + (BOSS_LABEL_PX[1] - BOSS_LABEL_PX[0]) * f, (p.w - 2 * BOSS_LABEL_PAD) * 100 / w100, (p.s1 - p.s0 - inset - BOSS_LABEL_PAD) / BOSS_LABEL_CAP);
      if (px < 3) continue;
      ctx.setTransform(k * Math.cos(th), k * Math.sin(th), -k * Math.sin(th), k * Math.cos(th), S.x, S.y); ctx.globalAlpha = 1;
      text(str, 0, -px * 0.45, px, hp >= f ? "white" : ENEMIES.bonus.color, false); // (text centres on y: the bottom sits on the line)
    }
  }
}
