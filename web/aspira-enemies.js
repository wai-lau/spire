// /aspira — drawing an ENEMY: its body, outlines, tracer, and the marks the
// towers' upgrades leave on it. Split out of aspira-draw.js (500-line cap);
// same global scope, loaded right after it.

// the bonus STAR trails a shooting-star tracer (owner): ONE filled shape, so
// nothing overlaps and compounds (layered strokes banded where they stacked).
// The tail tapers from the star's width to a point TRAIL behind it along its
// lane, filled with a radial gradient fading out from the star. Fast enemies
// trail a much SHORTER one (owner); only the star adds a shadow-blur glow (a
// whole Fast wave blurring would cost too much).
// EVERY enemy trails one now, fast the longest after the star (owner, 2026-10-09: "give every enemy tracers,
// fast longer ones"; fast was 48, the rest had none); a swarm's is short - there are hundreds
const TRAIL = { bonus: 320, fast: 120, shield: 80, armor: 80 }, // swarm: none (owner: "remove tracers on swarm"); all but fast doubled (owner, 2026-10-09: "double length of all tracers except fast"; were 160 / 40 / 40)
  TRAIL_STEP = 6, TRAIL_ALPHA = 0.55;
const BREACH_SPOKES = 24; // the most Breach spokes drawn on one enemy
function drawStarTrail(e, size) {
  const tail = TRAIL[e.type], pts = [];
  // CURVED: the lane behind it (owner, 2026-10-09: "they should be curved" - a straight tail along the heading was
  // tried and dropped), shifted by how far it wanders off the lane (a swarmer's jitter) so the tail meets the body
  const here = pathAt(e.pi, e.s, e.ang || 0), ox = e.x - here.x, oy = e.y - here.y;
  // (perf: one search for the head, then a walk back down the lane's points - was a binary search per sample)
  const lp = PATHS[e.pi].pts, ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0);
  let j;
  { let lo = 0, hi = lp.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lp[m].s <= e.s) lo = m; else hi = m; } j = lo; }
  // FOLLOWS THE BODY OFF ITS SPOT (owner, 2026-10-22: "tracers should follow enemies when moved by gravity"): a formation member's tail is laid
  // from its formation spot, so a GRV pull (or any shove) left it behind - the whole tail shifts by how far the body is off that spot
  let fx = 0, fy = 0;
  if (e.form) { const q = { x: 0, y: 0 }; formOffset(e, q, e.s); fx = e.x - q.x; fy = e.y - q.y; if (!Number.isFinite(fx) || !Number.isFinite(fy)) fx = fy = 0; }
  for (let d = 0; d <= tail; d += TRAIL_STEP) {
    const sd = Math.max(0, e.s - d);
    // a FORMATION's member (aspira-formations.js): each point laid across the lane AT that point, with the roll there -
    // a fixed shift taken at the head drifted off the body wherever the lane curves or the V rolls (owner, 2026-10-11)
    if (e.form) { const q = { x: 0, y: 0 }; formOffset(e, q, sd); q.x += fx; q.y += fy; pts.push(q); continue; } // (formOffset sets q whole: no pathAt first - perf) // + fx, fy: off its formation spot
    while (j > 0 && lp[j].s > sd) j--;
    const a = lp[j], b = lp[Math.min(lp.length - 1, j + 1)], f = sd >= b.s ? 1 : Math.max(0, (sd - a.s) / (b.s - a.s || 1));
    const px = a.x + (b.x - a.x) * f - CX, py = a.y + (b.y - a.y) * f - CY;
    pts.push({ x: CX + px * ca - py * sa + ox, y: CY + px * sa + py * ca + oy });
  }
  const n = pts.length - 1, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = size * 0.55 * (1 - i / n), nx = -(b.y - a.y) / len * w, ny = (b.x - a.x) / len * w;
    L.push({ x: pts[i].x + nx, y: pts[i].y + ny }); R.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  // every tail FADES toward its end (owner, 2026-10-09: "make all tracers lose opacity towards tail"): the star's
  // by a radial gradient from it, the rest by a straight one from the body to the tail's end (the fast ones were a
  // plain fill while a gradient each looked like a late-game frame cost, 2026-10-05)
  const col = COL[ENEMIES[e.type].color], star = e.type === "bonus";
  // (a point off the lane is NaN: a gradient on it THROWS and took the whole 3D overlay's frame down with it - no tracer then)
  const ends = star ? [e.x, e.y, tail] : [pts[0].x, pts[0].y, pts[n].x, pts[n].y];
  if (!ends.every(Number.isFinite)) return;
  const g = star ? ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, tail) : ctx.createLinearGradient(...ends);
  g.addColorStop(0, col); g.addColorStop(1, "transparent");
  ctx.beginPath(); ctx.moveTo(L[0].x, L[0].y);
  for (const p of L) ctx.lineTo(p.x, p.y);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i].x, R[i].y);
  ctx.closePath();
  ctx.fillStyle = g; ctx.globalAlpha = TRAIL_ALPHA * enemyVis(e);
  ctx.fill(); // (no shadowBlur on a boss's tail: a blur the size of the boss over its whole trail, six Devils at once, was
  // most of a boss frame - owner, 2026-10-11: "greatly improve boss perf, specifically for the devil boss")
  ctx.globalAlpha = 1;
}
// how FROZEN an enemy shows, 0..1: its slow (e.slowF, the share of its speed lost - effSpeed) over FROST_FULL, the slow
// that shows full cyan - so a light chill is a hint of frost and a deep freeze is solid (2D outline; 3D tint, aspira-solids.js)
const FROST_FULL = 0.6;
// how much RIME an enemy holds, 0..1 of FRZ_RIME_FULL (aspira-frz.js): its outline that much white (owner, 2026-10-12)
const rimeK = e => frostShare(e); // (aspira-frz.js)
const frostK = e => (e.slowT > 0 ? Math.min(1, Math.max(0, (e.slowF || 0) / FROST_FULL)) : 0);
// solid: the 3D view draws the body itself as a real die (warpSolid, aspira-solids.js) - here only its tracer, shields and marks
// an enemy SHRINKS with its HP, to SHRINK_MIN of its size at none - a boss to SHRINK_MIN_BOSS (owner, 2026-10-13: "enemies should
// have a min size of 5%, bosses min size of 10%"; were 45% and 0%). solidSize (aspira-solids.js) too
const SHRINK_MIN = 0.05, SHRINK_MIN_BOSS = 0.1;
const hpShrink = (e, f) => { const m = e.arcana ? SHRINK_MIN_BOSS : SHRINK_MIN; return m + (1 - m) * f; };
// OFF SCREEN = FAINT (owner, 2026-10-19: "enemies off screen should have their opacity reduced by 80%, and fade in over 1s as they enter
// the screen"): ENEMY_OFF_A until e.seen latches (enemySeen), then up to full over ENEMY_FADE_S of real time (e.seenAt, stepEnemies - the same second at any game speed)
const ENEMY_OFF_A = 0.2, ENEMY_FADE_S = 1;
const enemyVis = e => !e.seen ? ENEMY_OFF_A : e.seenAt == null ? 1 : Math.min(1, ENEMY_OFF_A + (1 - ENEMY_OFF_A) * (performance.now() - e.seenAt) / (1000 * ENEMY_FADE_S));
function drawEnemy(e, solid) {
  // damage shows as both size and opacity: full HP = full size, solid; near death small (hpShrink), faint
  // a ghost (dead enemy) is INVISIBLE: it only carries the beams that follow it
  if (e.dead) return;
  const d = ENEMIES[e.type], f = Math.max(0, e.hp / e.max), size = d.size * hpShrink(e, f) * (e.sizeMul || 1) * drawSizeK(e);
  if (TRAIL[e.type] && !(solid && farFx(e))) { // 3D: no tracers in the far ring
    drawStarTrail(e, size);
  }
  // outlines brighten as the enemy closes on the core (faint beyond the rim,
  // full at the core), still dimmed by lost HP
  const near = 1 - Math.min(1, Math.max(0, (Math.hypot(e.x - CX, e.y - CY) - CORE_R) / (RIM_R - CORE_R)));
  ctx.globalAlpha = (0.1 + 0.9 * near) * (0.7 + 0.3 * f) * enemyVis(e);
  // armor = a thick outline
  // Permafrost (a slow that never ends) draws the freeze outline thicker (owner)
  const perma = e.slowT === Infinity;
  // shield = SEGMENTS (owner): one per charge, on rings of its own shape
  if (e.shield > 0 || e.shSegs) {
    e.shSegs = syncSegs(e.shSegs || [], shieldShown(e, d.sides), d.sides, undefined, true);
    // (drawn as lines on the floor round the die: aspira-walls.js)
  }
  ctx.globalAlpha = 1;
  if (e.charged || e.charge) { // ARC's Static charge: a border in ARC's colour just outside the outline (owner) - ONE PER CHARGE held (Capacitance, 2026-10-08)
    ctx.strokeStyle = COL[TOWERS.arc.color]; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; // ARC's colour, whatever it is - thin and faint (owner, 2026-10-08: "reduce intensity")
    const n = e.charge ? Math.min(5, e.charge.list.length) : 1;
    // ALWAYS an UPWARD TRIANGLE (owner, 2026-10-21: "arc capacitance outline should always be an upward triangle"; was the enemy's own
    // shape, turning with it), its INNER radius where the old border sat - so the body stays inside: the corners at twice that
    for (let k = 0; k < n; k++) { poly(e.x, e.y, 2 * (size + 4 + 3 * k), 3, -Math.PI / 2, false); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (e.stunT > 0) {
    ctx.beginPath(); ctx.arc(e.x, e.y, size + 6, 0, 6.283);
    ctx.strokeStyle = COL.pink; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (e.markT > 0) {
    ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.arc(e.x + size, e.y - size, 4, 0, 6.283); ctx.fill();
  }
  drawStatus(e, d, size, solid);
}


// what the upgrades are doing to an enemy, drawn on it (owner, 2026-10-02):
//   Frostbite  a frost TINT over the body (biteT)
//   Brittle    a white CRACK across it while it is slowed
//   Deep Freeze a frost HEXAGON around it while the 95% chill holds
//   Corrosion  a DOTTED ring tight around it while its armor is being eaten
// (Permafrost's thicker freeze outline is drawn with the outline itself)
function drawStatus(e, d, size, solid) {
  if (e.biteT > 0) {
    poly(e.x, e.y, size, d.sides, e.rot, d.pointy);
    ctx.fillStyle = COL.tfrz; ctx.globalAlpha = 0.45 * Math.min(1, e.biteT * 2); ctx.fill();
  }
  if (e.brittle > 1 && e.slowT > 0) {
    const s = size * 0.7, c = Math.cos(e.rot), n = Math.sin(e.rot);
    const pt = (u, v) => [e.x + c * u - n * v, e.y + n * u + c * v];
    ctx.beginPath(); ctx.moveTo(...pt(-s, -s * 0.2)); ctx.lineTo(...pt(-s * 0.3, s * 0.25));
    ctx.lineTo(...pt(s * 0.2, -s * 0.25)); ctx.lineTo(...pt(s, s * 0.15));
    ctx.strokeStyle = COL.white; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (e.slows && Object.keys(e.slows).some(k => k.endsWith(":chill"))) {
    poly(e.x, e.y, size + 9, 6, Math.PI / 6, false);
    ctx.strokeStyle = COL.cyan; ctx.globalAlpha = 0.9; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // BLEED (SOL's Impale): a pink outline, for good (owner)
  // (BREACH: one upright spike through the die - warpSolid); SCORCH: acid's dotted circle in SOL's pink (owner, 2026-10-26: "use the
  // same dotted circle as acid, except pink"; the x / y spikes of an hour before are gone), a step further out than acid's
  if (e.dots && e.dots.length) {
    ctx.beginPath(); ctx.arc(e.x, e.y, size + (e.corrodeT > 0 ? 7 : 3), 0, 6.283);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = COL[TOWERS.sol.color]; ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  if (e.corrodeT > 0) {
    ctx.beginPath(); ctx.arc(e.x, e.y, size + 3, 0, 6.283);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = COL.tacd; ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}



// ---------- SEGMENTED shields (owner, 2026-10-04) ----------
// A shield - an enemy's charges, the core's lives - is SEGMENTS: one per
// charge, on rings of the shape's own outline stacked outward; ring r cuts
// each side into r pieces (ringOf). A lost charge removes a RANDOM remaining segment (a gap stays); a
// gained one goes in at the innermost slot and PUSHES every other segment one
// slot outward. A ring left wholly empty at the outside is dropped. The rings
// breathe with the core's pulse (shieldPulse).
// segs: [true|false, ...], slot 0 = the innermost ring's first side
// flashes (optional): [{ i, t }] - each lost segment is recorded so it can
// flash (drawSegs); a gain shifts them outward with everything else
// SHIELDS DRAWN ON AT MOST SHIELD_RINGS RINGS (owner, 2026-10-12: late shields grew a halo of 6+ rings and enemies looked
// bigger every wave): past what those rings hold, each segment stands for a share of the charges and breaks as its share goes
const SHIELD_RINGS = 2;
const SHIELD_OUT = 20; // the shield rings sit this many u further out from the body (owner, 2026-10-17: "draw the shields about 20u further away from the shielded unit") - 2D and the 3D walls
const shieldShown = (e, sides) => { const cap = sides * SHIELD_RINGS * (SHIELD_RINGS + 1) / 2 - SHIELD_IN_OFF, s = Math.max(0, e.shield); return (e.shieldMax || 0) > cap ? Math.ceil(s * cap / e.shieldMax) : s; };
function syncSegs(segs, n, sides, flashes, keepInner) {
  let have = segs.reduce((a, v) => a + (v ? 1 : 0), 0);
  while (have > n) {
    let live = []; segs.forEach((v, i) => { if (v) live.push(i); });
    if (keepInner) { const outer = live.filter(i => i >= sides - SHIELD_IN_OFF); if (outer.length) live = outer; } // an ENEMY's LAST layer (ring 1) breaks only once nothing else is left (owner, 2026-10-17)
    const i = live[Math.floor(Math.random() * live.length)];
    segs[i] = false; have--;
    if (flashes) flashes.push({ i, t: performance.now() / 1000 });
  }
  while (have < n) { segs.unshift(true); have++; if (flashes) for (const f of flashes) f.i++; }
  // drop the outermost ring while it is wholly empty
  while (segs.length) {
    const off = keepInner ? SHIELD_IN_OFF : 0, start = ringStart(ringOf(segs.length - 1, sides, off).r, sides, off);
    if (!segs.slice(start).every(v => !v)) break;
    segs.length = start;
  }
  return segs;
}
// rings SUBDIVIDE outward (owner): ring r (1 = inner) has `sides` x r segments,
// each side cut in r; slot i -> its ring r and its place in that ring
// an ENEMY's last layer holds SHIELD_IN_OFF fewer (off): its n-gon loses a side a hit down to a triangle, the last shield (owner,
// 2026-10-18: "the triangle counts for 1 shield, after triangle, 1hit no shields") - n - 2 chips; the core's lives keep off 0
const SHIELD_IN_OFF = 2;
const ringStart = (r, sides, off = 0) => r <= 1 ? 0 : sides * (r - 1) * r / 2 - off;
function ringOf(i, sides, off = 0) {
  if (off) { if (i < sides - off) return { r: 1, pos: i }; const o = ringOf(i + off, sides); return { r: o.r, pos: o.pos }; }
  let r = Math.floor((-1 + Math.sqrt(1 + 8 * (i / sides))) / 2) + 1; /* closed form (perf, 2026-10-17); the two nudges guard float rounding */
  while (r > 1 && ringStart(r, sides) > i) r--;
  while (ringStart(r + 1, sides) <= i) r++;
  return { r, pos: i - ringStart(r, sides) };
}
// an enemy shield's LAST layer (owner, 2026-10-17: "for the last outline of shield rendering ... it should become an (n-1)gon instead of
// an ngon with 1 missing side"; "make the last layer thicker than the rest"): k chips left of its n draw a regular k-gon at its radius,
// SHIELD_LAST_W x the line - shieldPoly gives the corners. A TRIANGLE at the least (owner, 2026-10-18: "last shield should be the
// triangle"; 2 and 1 chips were a bar)
const SHIELD_LAST_W = 2;
// an ENEMY's OUTER shield chips are SPOKES (owner, 2026-10-18: "shields (other than the last ngon) should be spokes coming out of the dice
// and stopping at the ngon"): chip i of ring r (2+, sides x r of them) is a spoke at its share of the turn, from the die's edge
// (base - SHIELD_OUT) out to the last layer's polygon (base + gap) - [x0, y0, x1, y1], or null for the last layer itself.
// They START AT THE SHIELD LINE and run INWARD to the die's edge (owner, 2026-10-19: "shield spokes should start at the shield line and
// go inwards"; 2026-10-18 .. 19 they ran from inside the die to SPOKE_GAP u short of the polygon) - [outer x, y, inner x, y]
// The end is measured to the polygon's EDGE at the spoke's angle, not its corner radius (owner, 2026-10-18: "inner spokes still
// protruding" - a spoke between corners ran out past the edge): the last layer is a regular m-gon (shieldPoly), m = its live chips + 2
function shieldSpoke(x, y, i, sides, rot, base, gap, k, segs) {
  const { r: ring, pos } = ringOf(i, sides, SHIELD_IN_OFF);
  if (ring < 2) return null;
  const a = rot + (pos + 0.5 + (ring - 2) * 0.5) / (sides * ring) * Math.PI * 2, r0 = Math.max(0, base - SHIELD_OUT);
  let live = 0; for (let j = 0; j < sides - SHIELD_IN_OFF; j++) if (segs[j]) live++;
  const m = Math.max(3, live + SHIELD_IN_OFF), w = Math.PI * 2 / m, t = (((a - rot) % w) + w) % w - w / 2;
  const R = (base + gap) * k * (live ? Math.cos(Math.PI / m) / Math.cos(t) : 1), r1 = Math.max(r0, R);
  return [x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r0, y + Math.sin(a) * r0];
}
function shieldPoly(x, y, r, k, n, rot) {
  const m = Math.max(3, k);
  return Array.from({ length: m }, (_, i) => { const a = rot + i * Math.PI * 2 / m; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });
}
const shieldPulse = () => 1 + 0.04 * Math.sin(performance.now() / 300); // the core's own breath
// ring r (0 = inner) has radius base + gap * (r + 1); slot i is side i % sides of ring floor(i / sides)
const SHIELD_RING_FADE = 0.7, SHIELD_RING_MIN = 0.2;
// a resolved colour, INVERTED (alpha kept): the boss red is Hack cyan inverted,
// and the boss sky's overlay draws towers in inverted colours (aspira-bosses.js)
const invMemo = new Map(); // (called per solid per frame on a boss sky - 3D skyOwn)
function invertColor(c) {
  if (invMemo.has(c)) return invMemo.get(c);
  const v = invertRaw(c);
  invMemo.set(c, v); return v;
}
function invertRaw(c) {
  const m = (c || "").match(/[\d.]+/g);
  if (!m || m.length < 3) return c;
  const rgb = m.slice(0, 3).map(v => 255 - v).join(",");
  return m.length > 3 ? "rgba(" + rgb + "," + m[3] + ")" : "rgb(" + rgb + ")";
}
