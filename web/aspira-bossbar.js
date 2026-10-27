// THE BOSS'S HP ALONG ITS LANE - the bar, its pieces, marks and labels, split out of aspira-bosses.js (the 500-line cap, 2026-10-27);
// drawn on the top layer through warpEntities (aspira-warp.js) and clipped out under every tower and die (bossClip)
const BOSS_BAR_W = 2.2, BOSS_BAR_TRACK = 0.3; // as thin as a lit lane's opaque core, LIT_LINE_SOFT's last (owner, 2026-10-26: "a lot thinner"; was 21); the track = full HP, translucent
const BOSS_BAR_MARKS = [0.85, 0.65, 0.4, 0.25, 0.1, 0.05]; // the %HP marks along the lane (owner, 2026-10-27: "the numbers: 0 10 25 40 60 90", then "90 and 60 are confusing, use 65 and 85", then "instead of 0, just use 5%" - the 0 sat misaligned on the lane's last swing into the core; 2026-10-26: 80 60 40 20 10 5 and 0 at the core) - drawn as numbers on the bar (drawBossLabels)
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
const BOSS_SEG_GAP = 10, BOSS_SEG_JIT = 2 /* (owner, 2026-10-27: "5x thickness jitter", then "double the thickness jitter"; was 0.2, then 1: the taper x 1 +- this, the floor catching what falls under it) */, BOSS_PIECE_W = [5, 44], BOSS_CORRIDOR = 80, BOSS_PIECE_POW = 2 /* the taper's curve: share ^ this - 1 linear; higher grows slowly near the core, fast toward the edge (owner, 2026-10-27: "increase the rate at which the thickness grows as the lane approaches the edge") */, BOSS_SHOVE = 1, BOSS_PIECE_OUT = 1.5, BOSS_PIECE_STEP = 2; // BOSS_SHOVE: a piece's slide ALONG ITS SPOKE (every point moved out or in along its own ray from the core, so the cut ends stay rays through it), as a share of the free room between it and the turns either side - 1: the whole room, 0: none (owner, 2026-10-27: "add placement jitter now, but along the spokes and still [no overlap]"; an earlier slide along the mean ray was "weirdly offset from the lane"); BOSS_CORRIDOR: the most a piece may take across the lane - less where the spiral's turns are closer (the pitch there) // BOSS_SEG_GAP: between two pieces, across their cut; BOSS_SEG_JIT: a piece's width jitter; BOSS_PIECE_W: a piece's width at the core end .. the 100% end, u (owner, 2026-10-27: "widen the boxes as much as possible", "way thicker"); BOSS_CORRIDOR: a piece stays inside this much across the lane - no overlap with the next turn; BOSS_PIECE_OUT: its outline, u; BOSS_PIECE_STEP: u between a piece's points
// THE CUTS (owner, 2026-10-27: "choose 24 points on the edge of the screen equally radially distant around the core, then add some radial
// jitter, these are the lines that chop up the hp bar into segments. Each of these lines should cut the hp bar exactly once, at which
// intersection is randomly decided"): BOSS_RAYS rays from the core, evenly spaced round it, each turned by up to BOSS_RAY_JIT of the
// spacing; a ray crosses the spiral lane once a turn - EVERY crossing inside the span is a cut (owner, 2026-10-27: "without placement
// jitter"; one a ray, picked by hash, left long uncut runs), and the piece ends there lie ALONG THE RAY (owner, 2026-10-27: "the aligned
// spoke is more important") - so the cuts on every turn line up as spokes
const BOSS_RAYS = 24, BOSS_RAY_JIT = 0.4, BOSS_CUT_MIN = 0.25, BOSS_PIECE_ROUND = 0.05, BOSS_PIECE_MIN = 0.5, BOSS_PIECE_FLOOR = 40, BOSS_SLIDE_MAX = 30, BOSS_SLIDE_W = 1, BOSS_LANE_KEEP = 1, BOSS_GAP_CORE = 0.3, BOSS_OUT_CORE = 0.3, BOSS_FLOOR_CORE = 0.15, BOSS_CUT_MARGIN = 2; // BOSS_PIECE_MIN: a piece at least this much of its width long, else the cut is skipped; BOSS_PIECE_FLOOR: no piece thinner, u, unless the turns either side sit closer (owner, 2026-10-27: "floor 10u", "floor 30u", "min width should be like 20u", then "min width in general should be 2x what it is now (+ scaling)"; was 4); BOSS_SLIDE_MAX: a piece's slide along its spoke, u, at most; BOSS_SLIDE_W: ...and at most this many of its own widths; BOSS_LANE_KEEP: u of piece kept past the lane's line on its far side after a slide; BOSS_GAP_CORE / BOSS_OUT_CORE / BOSS_FLOOR_CORE: the gap, the outline and the width floor at the core, of their full values at the 100% end (owner, 2026-10-27: "outer gaps 10u / inner gaps 3u"; the outline 0.45 u, the floor 3 u); BOSS_CUT_MARGIN: u of slack a cut needs past the slant room, scaled the same; BOSS_CUT_MIN: a ray flatter than this against the lane (its sine) cuts square; BOSS_PIECE_ROUND: a piece's corner radius, of its width
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
  const marksS = BOSS_BAR_MARKS.map(f => b - (b - a) * f), markIn = (s0, s1) => marksS.findIndex(m => m >= s0 - 1e-6 && m <= s1 + 1e-6); // the mark (its index in BOSS_BAR_MARKS) between s0 and s1, -1 none: the piece holding one carries its number and is at least BOSS_LABEL_W wide - the lowest mark's BOSS_LABEL_W0 - where the turns allow (owner, 2026-10-27: "min thickness of segment with a number should be 50" / "except for 0, allow it to be 30u"; a taper to the core was tried and dropped)
  const wOf = (i, s, s0, s1) => { const mk = markIn(s0, s1); return Math.min(corrAt(s), Math.max(mk < 0 ? 0 : BOSS_BAR_MARKS[mk] <= 0.05 ? BOSS_LABEL_W0 : BOSS_LABEL_W, floorAt(s), (BOSS_PIECE_W[0] + (BOSS_PIECE_W[1] - BOSS_PIECE_W[0]) * Math.pow(share(s), BOSS_PIECE_POW)) * (1 + BOSS_SEG_JIT * (2 * bossHash(e, i, 2) - 1)))); }; // (the corridor last: the floor never pushes a piece into the next turn)
  // the piece's slide along its spoke: at most BOSS_SLIDE_MAX (owner, 2026-10-27: "cap spoke jitter to +/-30u so that they cover lane"), and
  // at most the room left between its width and the turns either side (half each way, so two turns' pieces slid toward each other still
  // keep the gap - the real pitch, not BOSS_CORRIDOR). Along the lane a slide changes nothing: the piece is cut after it slides
  const slideOf = (i, s, w) => BOSS_SHOVE * Math.min(BOSS_SLIDE_MAX, BOSS_SLIDE_W * w, Math.max(0, w / 2 - BOSS_BAR_W / 2 - BOSS_LANE_KEEP), Math.max(0, (corrAt(s, Infinity) - w) / 2)) * (2 * bossHash(e, i, 3) - 1); // (BOSS_SLIDE_W * w: a thin piece slides less, in step with its width - owner, 2026-10-27: "ensure that spoke jitter is reduced proportionally to thickness"; w / 2 - the lane's half width - BOSS_LANE_KEEP: the piece still covers the lane's line - owner, 2026-10-27: "make sure that the lane is completely covered by the pieces")
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
function barPiece(g, bar, hp, keepCore, fill, line, off = 0) { // the piece's part on keepCore's side of the HP boundary at hp (hp null: the whole piece); off: u out along its spoke (the fly-in)
  let Lp = g.Lp, Rp = g.Rp; const sh = off ? q => { const dx = q.x - CX, dy = q.y - CY, r = Math.hypot(dx, dy) || 1, k = (r + off) / r; return { x: CX + dx * k, y: CY + dy * k }; } : q => q;
  if (hp != null) { if (keepCore ? hp >= g.s1 : hp <= g.s0) return; if (keepCore ? hp > g.s0 : hp < g.s1) { Lp = barSplit(Lp, bar, hp, keepCore); Rp = barSplit(Rp, bar, hp, keepCore); } }
  if (Lp.length < 2 || Rp.length < 2) return;
  const mp = Lp[Lp.length >> 1], k = cam.k * (warpProjectScratch(mp.x, mp.y).s || 1), rad = g.rad * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath();
  Lp.forEach((p, i) => { const q = sh(p), P = warpProjectScratch(q.x, q.y); if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y); });
  for (let i = Rp.length - 1; i >= 0; i--) { const q = sh(Rp[i]), P = warpProjectScratch(q.x, q.y); ctx.lineTo(P.x, P.y); }
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
// THE FLY-IN (owner, 2026-10-27: "after the triangle fully expands, have the segments fly in from off-screen into place; jitter their
// speeds and launch time, but the arrival time should be ordered" / "reverse arrival order" / "I want to see all the segments overlapping
// and slowly approaching like an armada of ships, then, look they are slamming into place" / "they should start off screen, slide to
// armada position, and then when everything is in armada pos, slam one at a time"): three acts once the boss sky is FULL (bossInv.t0 +
// BOSS_SKY_T).
//   1. THE APPROACH, the first BAR_APPROACH s: every piece slides in along its own spoke from past the screen's farthest corner
//      (barFlyFrom) to ONE ring, BAR_RING_PAD past the bar's outermost piece - pieces from every turn stacked there, overlapping - each
//      on its own schedule by hash (arriving between 0.6 and 1 of the act, over 0.5 to 1 of the time before that), easing to a stop.
//   2. THE ARMADA: there it drifts in slowly, BAR_DRIFT u/s (+-BAR_DRIFT_JIT), until its moment.
//   3. THE SLAM, ring by ring (owner, 2026-10-27: "group the pieces into rings - a ring has no overlapping segments along the spoke -
//      then slam them group by group" / "starting with innermost group" / "within a group, slam one at a time"): the pieces in rings,
//      no two of a ring on one spoke (barRings), the innermost ring first, a ring's pieces one at a time in a random order (by hash); the
//      landings BAR_FLY_SPAN s in all from BAR_FLY_LEAD after the approach, evenly, BAR_RING_PAUSE s more between rings (0: owner,
//      2026-10-27, "no time gap between rings") - each piece
//      covering the rest of its spoke over BAR_SLAM s (+-BAR_SLAM_JIT), eased IN (motionless, then faster and faster).
// Before the sky is full every piece waits off-screen. The boss's lane and glow light only after the last slam (bossBarInT - litLanes,
// aspira-lanes.js: "draw lane and lane glow after hp slides in"), and the numbers fade in then, over BAR_LABEL_FADE s (owner, 2026-10-27:
// "fade in the numbers at the end") - they never fly. Each landing THUDS (barThud), pitched to the piece's area.
const BAR_APPROACH = 1.6, BAR_FLY_LEAD = 0.4, BAR_FLY_SPAN = 2.5, BAR_RING_PAUSE = 0, BAR_SLAM = 0.35, BAR_SLAM_JIT = 0.4, BAR_RING_PAD = 40, BAR_DRIFT = 30, BAR_DRIFT_JIT = 0.5; // BAR_RING_PAD: the ring sits this far past the bar's outermost piece - on screen wherever the outer turn is
const BAR_LABEL_FADE = 0.6; // s: the numbers' fade-in, from the last slam
const bossBarInT = () => BAR_APPROACH + BAR_FLY_LEAD + BAR_FLY_SPAN; // s after the sky is full until the bar is in
const barInT = () => (typeof bossInv === "undefined" || bossInv.phase !== "in") ? Infinity : performance.now() / 1000 - (bossInv.t0 + BOSS_SKY_T); // s since the boss sky filled (Infinity: no fly-in on - every piece home); BOSS_SKY_T: the spokes, then the triangle - aspira-bosses.js
const barLabelA = () => Math.max(0, Math.min(1, (barInT() - bossBarInT()) / BAR_LABEL_FADE)); // the numbers' alpha
const barR = g => { const m = g.Lp[g.Lp.length >> 1]; return Math.hypot(m.x - CX, m.y - CY); }; // a piece's radius, u: its middle's
const barArea = g => { let a = 0; const Q = g.Lp.concat(g.Rp.slice().reverse()); for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; }; // a piece's area, u^2 (shoelace round its outline)
const BAR_THUD_HZ = [60, 360], BAR_THUD_VOL = [0.1, 0.26]; // the biggest piece's thud .. the smallest's; the loudness the other way
function barThud(e, g) { // a piece slamming home: a thud, lower and louder the bigger the piece (owner, 2026-10-27: "play a thud sound, pitched to area of segment") - by log area between the bar's own smallest and biggest
  if (typeof sfx !== "function") return; const B = e.bar; if (!B.lnA) { const ls = B.pieces.map(q => Math.log(q.area ||= barArea(q))); B.lnA = [Math.min(...ls), Math.max(...ls)]; }
  const k = (Math.log(g.area ||= barArea(g)) - B.lnA[0]) / Math.max(1e-6, B.lnA[1] - B.lnA[0]); // 0 the smallest .. 1 the biggest
  sfx("thud", BAR_THUD_HZ[1] + (BAR_THUD_HZ[0] - BAR_THUD_HZ[1]) * k, BAR_THUD_VOL[0] + (BAR_THUD_VOL[1] - BAR_THUD_VOL[0]) * k);
}
function barRings(e) { // the pieces in RINGS - no two of a ring on one spoke, their angles round the core disjoint - and each ring's turn to slam
  const P = e.bar.pieces, wrap = d => Math.atan2(Math.sin(d), Math.cos(d)), thAt = cs => { const Q = pathAt(e.pi, cs, e.ang || 0); return Math.atan2(Q.y - CY, Q.x - CX); };
  const A = P.map(g => { const t0 = thAt(g.cs0), d = wrap(thAt(g.cs1) - t0); return { th: t0 + d / 2, hs: Math.abs(d) / 2 }; }); // each: its SPINE's angle round the core, cut to cut, and half span - the lane's line, not the outline: a square cut's corner pokes past its ray by w / 2 / r, and that sliver is no shared spoke (it stranded a piece in a ring of its own)
  const apart = (i, j) => Math.abs(wrap(A[i].th - A[j].th)) >= A[i].hs + A[j].hs, rings = [], ring = new Array(P.length);
  for (const i of P.map((g, a) => a).sort((a, b) => barR(P[a]) - barR(P[b]))) { let k = rings.findIndex(R => R.every(j => apart(i, j))); if (k < 0) { k = rings.length; rings.push([]); } rings[k].push(i); ring[i] = k; } // first fit from the core out: ring k is the k-th turn, near enough
  const seq = new Array(P.length); let q = 0; for (const M of rings) { for (let a = M.length - 1; a > 0; a--) { const b = Math.floor(bossHash(e, M[a], 10) * (a + 1)); [M[a], M[b]] = [M[b], M[a]]; } for (const i of M) seq[i] = q++; } // seq: the piece's turn to slam - ring by ring from the innermost (owner, 2026-10-27: "starting with innermost group"; a random order was asked first, then this), within a ring one at a time in an order drawn by hash ("within a group, slam one at a time" / "within a group, I want random"; a sweep round the core was tried between): Fisher-Yates, the same every frame, another per boss
  return { ring, seq, n: rings.length };
}
const barFar = () => Math.max(...[[0, 0], [cv.width, 0], [0, cv.height], [cv.width, cv.height]].map(([px, py]) => Math.hypot((px - cam.ox) / cam.k - CX, (py - cam.oy) / cam.k - CY))); // u from the core to the screen's farthest corner
const barFlyFrom = () => barFar() * 1.1 + 100; // u out along a spoke: past that corner
function barFlyOff(e, i) { // piece i: how far out along its spoke it still is, u (0: in place)
  const t = barInT(); if (t === Infinity) return 0; const far = barFlyFrom(); if (t < 0) return far;
  const g = e.bar && e.bar.pieces[i]; if (!g) return 0; const arm = (e.bar.rMax ||= Math.max(...e.bar.pieces.map(barR))) + BAR_RING_PAD - barR(g); // out of place: at the armada's ring, and off-screen
  const h = k => bossHash(e, i, k), arrive = BAR_APPROACH * (0.6 + 0.4 * h(8)), dur = arrive * (0.5 + 0.5 * h(9)), launch = arrive - dur; // act 1, its own
  if (t < arrive) { const u = Math.max(0, Math.min(1, (t - launch) / dur)), ease = 1 - (1 - u) * (1 - u) * (1 - u); return arm + (far - arm) * (1 - ease); }
  const R = e.bar.rings ||= barRings(e), N = e.bar.pieces.length, pause = Math.min(BAR_RING_PAUSE, BAR_FLY_SPAN / 2 / Math.max(1, R.n - 1)), land = BAR_APPROACH + BAR_FLY_LEAD + R.seq[i] * (BAR_FLY_SPAN - (R.n - 1) * pause) / Math.max(1, N - 1) + R.ring[i] * pause, slam = BAR_SLAM * (1 + BAR_SLAM_JIT * (2 * h(6) - 1)), v = BAR_DRIFT * (1 + BAR_DRIFT_JIT * (2 * h(7) - 1)), t0 = land - slam; // act 3: at its ring's turn
  const drift = tt => Math.max(0, arm - v * (tt - arrive)); // act 2: from where it stopped, in slowly (never past its place)
  if (t >= land) { if (!g.home) { g.home = true; barThud(e, g); } return 0; } if (t < t0) return drift(t); // (home: its thud once, the frame it lands - bar and track both ask)
  const u = (t - t0) / slam; return (1 - u * u * u) * drift(t0); // act 3
}
// ON THE ENTITY LAYER AT THE FLOOR'S LEVEL (owner, 2026-10-27: "tower ranges and effects should appear above hp"): the bar is drawn in
// warpEntities' part A, between the floor and the dice - so the dice, the beams, the shield lines and the towers' layer cover it, and
// the ranges (drawRangesOver) go right over it. Part A is drawn BEFORE the sky's flip (the difference inside a spreading triangle,
// the whole inverted palette under a full one), so a piece takes the lane's OWN colour and comes out turned over with it; what must
// show WHITE on screen (the HP-gone boxes, the numbers) is drawn in whatever that flip turns into white - barWhite
const barWhite = pt => (inverted || (skyOn() && !skyPal() && inSkyPt(pt.x, pt.y))) ? invertColor(COL.white) : COL.white;
function drawBossBarFloor() { drawBossBar(); drawBossTrack(); drawBossLabels(); }
function drawBossBar() { // the HP left, in the lane's own colour (turned over with it under the sky): each piece's part past where the HP left begins
  const own = COL[ENEMIES.bonus.color];
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e); ctx.globalAlpha = 1;
    e.bar.pieces.forEach((g, i) => barPiece(g, e.bar, hp, true, own, own, barFlyOff(e, i)));
  }
  ctx.globalAlpha = 1;
}
function drawBossTrack() { // the HP gone: the pieces' white part from the 100% end to where the HP left begins
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const { hp } = bossSpan(e), own = COL[ENEMIES.bonus.color]; ctx.globalAlpha = 1;
    e.bar.pieces.forEach((g, i) => { const m = g.Lp[g.Lp.length >> 1]; barPiece(g, e.bar, hp, false, barWhite(m), own, barFlyOff(e, i)); }); // hollow: white in the lane's outline
  }
  ctx.globalAlpha = 1;
}
// THE %HP NUMBERS ON THE BAR (owner, 2026-10-27: "get rid of the arrows / numbers in white, on the hp bar / have the bottom of the number
// aligned with one of the spokes" / "drop the % and resize numbers to fit on the segment they are on / min thickness of segment with a
// number should be 50" / "align the top of the number with a new spoke pointed at the core" - "letters don't need to fill"; 2026-10-26:
// the marks): each number lies on the piece that holds its mark (barGeo makes that piece BOSS_LABEL_W wide where the turns allow), at
// its natural size - BOSS_LABEL_PX[0] at the core to [1] at the 100% end, shrunk to the piece - against the piece's outer side
// along the spoke, its bottom on one of the piece's cut lines (a spoke), its top a ray through the core the number's height above it at
// that radius, its sides along the lane like the piece's: the number is a wedge, narrower toward the core, skewed like the piece. It is a cached sprite drawn in
// BOSS_LABEL_STRIPS strips, each a parallelogram between the two lines at its place, so it takes the wedge and the floor's perspective
// together (one canvas affine cannot bend a box into a wedge). The bottom is the cut whose way into the piece is UP on the screen, read
// the way that is not mirrored: never upside down. White over the HP left; the lane's colour as shown (turned over under the sky) over
// the HP gone
const BOSS_LABEL_PX = [12, 24], BOSS_LABEL_PAD = 2, BOSS_LABEL_W = 50, BOSS_LABEL_W0 = 30, BOSS_LABEL_STRIPS = 16, BOSS_LABEL_SPRITE_PX = 96, labelSprites = new Map();
function labelSprite(str, col) { // the number drawn once, cropped to its glyphs' box (digits: baseline to cap height)
  const key = str + "|" + col, hit = labelSprites.get(key); if (hit) return hit;
  const m = document.createElement("canvas"), x = m.getContext("2d"); x.font = BOSS_LABEL_SPRITE_PX + "px " + CANVAS_FONT;
  const mt = x.measureText(str), asc = Math.ceil(mt.actualBoundingBoxAscent || BOSS_LABEL_SPRITE_PX * 0.72), desc = Math.ceil(mt.actualBoundingBoxDescent || 0), w = Math.ceil(mt.width) + 2;
  m.width = w; m.height = asc + desc + 2; x.font = BOSS_LABEL_SPRITE_PX + "px " + CANVAS_FONT; x.textBaseline = "alphabetic"; x.fillStyle = col; x.fillText(str, 1, 1 + asc);
  const sp = { cv: m, w, h: m.height }; if (labelSprites.size > 32) labelSprites.clear(); labelSprites.set(key, sp); return sp;
}
function drawBossLabels() {
  for (const e of G.enemies) {
    if (!e.arcana || e.dead) continue;
    const hp = Math.max(0, e.hp) / e.max, ang = e.ang || 0, wind = e.bar.sgn, la = barLabelA(); if (la <= 0) continue; // (the numbers fade in once the last ring is home)
    e.bar.pieces.forEach(p => {
      if (!(p.mi >= 0)) return;
      const f = BOSS_BAR_MARKS[p.mi], mp = p.Lp[p.Lp.length >> 1], own = COL[ENEMIES.bonus.color], sp = labelSprite(String(Math.round(f * 100)), hp >= f ? barWhite(mp) : own); // (over the HP gone: the lane's own colour, turned over with the box's outline)
      // a cut of the piece: the lane point there, its angle round the core and radius, the way into the piece round the core (dir: +1
      // with the lane's winding past the start cut, against it before the end cut)
      const edge = (cs, gap, sg) => { const Q = pathAt(e.pi, cs, ang), rx = Q.x - CX, ry = Q.y - CY; return { cs, sg, th: Math.atan2(ry, rx), r: Math.hypot(rx, ry) || 1, gap, dir: sg * wind }; };
      const e0 = edge(p.cs0, p.g0, 1), e1 = edge(p.cs1, p.g1, -1), S0 = warpProject(CX + Math.cos(e0.th) * e0.r, CY + Math.sin(e0.th) * e0.r), S1 = warpProject(CX + Math.cos(e1.th) * e1.r, CY + Math.sin(e1.th) * e1.r), E = S1.y <= S0.y ? e0 : e1; // the bottom: the cut the other lies ABOVE on the screen
      // the number's size: its height, BOSS_LABEL_PX by its share, no more than the piece's extent round the core at its radius less
      // the two half gaps and the pads, its width by the sprite's own shape, no more than the piece's width
      const rc = E.r + p.d, span = Math.abs(((e1.th - e0.th) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI), room = span * rc - (p.g0 + p.g1) / 2 - 2 * BOSS_LABEL_PAD; // span: the piece's angle round the core, cut to cut
      // the number's uprights run ALONG THE LANE, as the piece's sides do (owner, 2026-10-27: "this 65 should look skewed towards the core not
      // away" - square to the spoke they matched no edge): t the lane's tangent where the number sits - just past its cut, not the piece's
      // middle (the spiral turns 30 degrees over a long piece: "the left side of the 25 looks slanted off the segment") - turned toward the
      // top; square where the lane runs nearly along the spoke; sn its slant off the spoke - a side of the number is h long along t, h * sn across
      const um = { x: Math.cos(E.th), y: Math.sin(E.th) }, nx = -um.y * E.dir, ny = um.x * E.dir, sq = E.cs + E.sg * (E.gap / 2 + BOSS_LABEL_PAD + BOSS_LABEL_PX[1] / 2), Qm = pathAt(e.pi, sq, ang), Qm2 = pathAt(e.pi, sq + 1, ang), tl0 = Math.hypot(Qm2.x - Qm.x, Qm2.y - Qm.y) || 1;
      let tx = (Qm2.x - Qm.x) / tl0, ty = (Qm2.y - Qm.y) / tl0; if (tx * nx + ty * ny < 0) { tx = -tx; ty = -ty; } let sn = Math.abs(tx * um.y - ty * um.x); if (sn < BOSS_CUT_MIN) { tx = nx; ty = ny; sn = 1; }
      let h = Math.min(BOSS_LABEL_PX[0] + (BOSS_LABEL_PX[1] - BOSS_LABEL_PX[0]) * f, room / sn), w = h * sp.w / sp.h; if (w > p.w - 2 * BOSS_LABEL_PAD) { w = p.w - 2 * BOSS_LABEL_PAD; h = w * sp.h / sp.w; } if (h < 2) return;
      // the wedge: its bottom the cut line itself (the spoke through the lane point, half a gap and the pad over, into the piece), from
      // the piece's outer corner at that cut, the pad in, w along it toward the core - against the OUTER side (owner, 2026-10-27: "left-or
      // right align them, whichever side is the outer side"; centred along the spoke before); its top the ray through the core standing
      // the number's rise above the bottom at rc; a point of the top: from its point on the bottom along t to that ray
      const inset = E.gap / 2 + BOSS_LABEL_PAD, ub = { x: Math.cos(E.th), y: Math.sin(E.th) }, ox = -ub.y * E.dir * inset, oy = ub.x * E.dir * inset, tt = E.th + E.dir * (inset + h * sn) / rc, v = { x: Math.cos(tt), y: Math.sin(tt) }, cL = E === e0 ? p.Lp[0] : p.Lp[p.Lp.length - 1], cR = E === e0 ? p.Rp[0] : p.Rp[p.Rp.length - 1], r1 = Math.max(Math.hypot(cL.x - CX, cL.y - CY), Math.hypot(cR.x - CX, cR.y - CY)) - BOSS_LABEL_PAD, r0 = r1 - w, txv = tx * v.y - ty * v.x || 1e-9; // against the piece's OUTER corner at that cut (owner, 2026-10-27: "left-or right align them, whichever side is the outer side")
      const bot = x => ({ x: CX + ub.x * (r0 + (r1 - r0) * x) + ox, y: CY + ub.y * (r0 + (r1 - r0) * x) + oy }), top = x => { const B = bot(x), bx = B.x - CX, by = B.y - CY, la = -(bx * v.y - by * v.x) / txv; return { x: B.x + tx * la, y: B.y + ty * la }; };
      const pr = q => warpProject(q.x, q.y), Bl = pr(bot(0)), Br = pr(bot(1)), Tl = pr(top(0)), flip = (Br.x - Bl.x) * (Tl.y - Bl.y) - (Br.y - Bl.y) * (Tl.x - Bl.x) > 0; // read the way that is not mirrored
      const N = BOSS_LABEL_STRIPS, at = (fn, x) => pr(fn(flip ? 1 - x : x)), sw = sp.w / N;
      let B0 = at(bot, 0), T0 = at(top, 0);
      for (let i = 0; i < N; i++) { // strip i: the sprite's slice [i * sw, (i + 1) * sw] onto the parallelogram B0 -> B1 along the bottom, T0 up
        const B1 = at(bot, (i + 1) / N), T1 = at(top, (i + 1) / N), ax = ((B1.x - B0.x) + (T1.x - T0.x)) / 2 / sw, ay = ((B1.y - B0.y) + (T1.y - T0.y)) / 2 / sw;
        ctx.setTransform(ax, ay, (B0.x - T0.x) / sp.h, (B0.y - T0.y) / sp.h, T0.x, T0.y); ctx.globalAlpha = la;
        ctx.drawImage(sp.cv, i * sw, 0, sw + 1, sp.h, 0, 0, sw + 1, sp.h); // (a px of overlap: no seam)
        B0 = B1; T0 = T1;
      }
    });
  }
}
