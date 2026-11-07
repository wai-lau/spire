// /spire - ACD's LOOK (split out of aspira-acid.js 2026-11-05, the 500-line cap): the corrosion drops (drawDrips, called by
// aspira-draw.js) and the pools' bubbles (drawPuddles, called by aspira-effects.js). Draw only - the simulator never loads it;
// POOL_LOD, the pools' budget, stays in aspira-acid.js (stepPuddles reads it too). Loaded right after aspira-acid.js.

// a drop: a chatsubo dot like a coin, no twinkle - BIG and bright with a dark rim so it reads on the lanes (owner, 2026-10-13:
// "make the corrosion drops much more visible"; was a faint 1.8 dot), each its own size, x0.5-1.5 ("the goo should visually have
// mixed sizes"), fading over its last second
const DRIP_DOT_R = 3.6; // (DRIP_HOLLOW, the share drawn as a ring, stays in aspira-acid.js: dripDrop rolls it)
function drawDrips() {
  if (!G.drips || !G.drips.length) return;
  ctx.fillStyle = COL.tacd; ctx.strokeStyle = COL.bg; ctx.lineWidth = 1.2;
  for (const d of G.drips) {
    ctx.globalAlpha = Math.min(1, DRIP_LIFE - d.t);
    ctx.beginPath(); ctx.arc(d.x, d.y, DRIP_DOT_R * (d.sz || 1), 0, 6.283);
    if (d.ring) { ctx.strokeStyle = COL.tacd; ctx.lineWidth = 1.6; ctx.stroke(); ctx.strokeStyle = COL.bg; ctx.lineWidth = 1.2; } else { ctx.fill(); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

// UI (drawAcd): a puddle is a cluster of BUBBLES (owner): PUDDLE_BUBBLES at
// once, each at a jittered spot within it, growing to its own jittered max
// size over BUBBLE_T real seconds, then POPPING (a brief widening ring) and
// starting again elsewhere; the whole cluster fades as the puddle dries
const PUDDLE_BUBBLES = 5, BUBBLE_T = 0.6, BUBBLE_POP = 0.15;
// a puddle's bubbles are as INTENSE as its damage (owner, 2026-10-07): brighter and
// bolder the more it burns, 0.6x for a faint puddle up to 1.8x for a deadly one
const puddleGlow = p => Math.max(0.6, Math.min(1.8, 0.6 + 0.3 * Math.log2(1 + (p.dps || 0) / 60)));
function drawPools(t, now) {
  // (always the plain circle: the board is drawn into a texture and warped - the old wobbling 2D rim is gone, 2026-10-18) // 3D: always the plain circle - the board is drawn into a texture and warped, the rim's wobble barely shows and its fills cost (owner, 2026-10-12: pool perf in 3D)
  // a PILE of pools reads as one (owner, 2026-10-14: "late game ACD has too much effects visually" - a Spill's 100+
  // see-through pools stacked 20 deep into one bright green wash): each is drawn at 1 / the pools over its centre
  const pools = t.puddles || [], deep = poolDepth(pools), lake = pools.filter(p => p.lake);
  if (lake.length > 1 && lake.length <= POOL_LOD) drawLake(lake); else lake.length = 0;
  pools.forEach((p, i) => {
    if (lake.length && p.lake) return; // (drawn as one lake: drawLake)
    const crowd = 1 / deep[i], fade = Math.min(1, (1 - p.age / p.life) * puddleGlow(p)) * crowd, seed = p.seed ||= 1 + Math.floor(Math.random() * 1e6);
    // a pool a KILL left (Spill's spread) is a DASHED ring, no body; the jets' own drips filled: the two read apart (owner, 2026-10-14)
    { ctx.beginPath(); ctx.arc(p.x, p.y, poolDrawR(p), 0, 6.283); if (!p.spread) { ctx.globalAlpha = 0.14 * fade; ctx.fill(); } ctx.setLineDash(p.spread ? POOL_DASH : []); ctx.globalAlpha = (p.spread ? 0.7 : 0.4) * fade / Math.sqrt(crowd); ctx.stroke(); return; } // (a crowd's rims fade only by the root of it: the rims tell one pool from the next)
  });
  ctx.setLineDash([]);
}
// THE ACID LAKE (Spill V, owner 2026-11-06: "overlapping pools merge ... merged pools bubble"): its pools read as ONE body - one fill over their union
// (a single path, so overlaps do not stack) and ONE outline: each pool's rim only where no other lake pool covers it. Over POOL_LOD lake pools
// they draw one by one as before (the budget). A pool's drawn radius shrinks as it dries (poolDrawR), the same in the fill and the outline
const poolDrawR = p => p.r * 0.9 * (0.8 + 0.2 * (1 - p.age / p.life));
function lakeArcs(L, i) { // [from, to] angles of pool i's rim that no other lake pool covers
  const p = L[i], r = L[i].dr, cut = [];
  for (let j = 0; j < L.length; j++) {
    if (j === i) continue;
    const q = L[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d >= r + q.dr || d + q.dr <= r) continue; // apart, or q wholly inside p: p's rim is clear of it
    if (d + r <= q.dr) return []; // p wholly inside q
    const a = Math.atan2(dy, dx), w = Math.acos(Math.max(-1, Math.min(1, (r * r + d * d - q.dr * q.dr) / (2 * r * d))));
    cut.push([a - w, a + w]);
  }
  if (!cut.length) return [[0, 6.2832]];
  const base = cut[0][1], iv = cut.map(([a, b]) => { let s0 = (a - base) % 6.2832; if (s0 < 0) s0 += 6.2832; return [s0, s0 + (b - a)]; }).sort((x, y) => x[0] - y[0]);
  const out = []; let at = 0; // from the end of the first cut, round to it again
  for (const [a, b] of iv) { if (a > at) out.push([base + at, base + a]); at = Math.max(at, b); }
  if (at < 6.2832) out.push([base + at, base + 6.2832]);
  return out;
}
function drawLake(pools) {
  let fill = 0; const L = pools.map(p => ({ x: p.x, y: p.y, spread: p.spread, dr: poolDrawR(p), fade: Math.min(1, (1 - p.age / p.life) * puddleGlow(p)) })); // (local: the draw writes nothing on the pools)
  for (const p of L) if (!p.spread) fill = Math.max(fill, p.fade);
  if (fill > 0) { ctx.beginPath(); for (const p of L) if (!p.spread) { ctx.moveTo(p.x + p.dr, p.y); ctx.arc(p.x, p.y, p.dr, 0, 6.283); } ctx.globalAlpha = 0.14 * fill; ctx.fill(); }
  L.forEach((p, i) => {
    const arcs = lakeArcs(L, i); if (!arcs.length) return;
    ctx.beginPath(); for (const [a, b] of arcs) { ctx.moveTo(p.x + Math.cos(a) * p.dr, p.y + Math.sin(a) * p.dr); ctx.arc(p.x, p.y, p.dr, a, b); }
    ctx.setLineDash(p.spread ? POOL_DASH : []); ctx.globalAlpha = (p.spread ? 0.7 : 0.4) * p.fade; ctx.stroke();
  });
}
const POOL_DASH = [18, 12]; // board units: big enough to read as dashes once the 3D view shrinks a pool
// how many pools cover each pool's centre (itself included), the crowd bucketed by POOL_CELL like the enemies
function poolDepth(pools) {
  if (pools.length <= 1) return pools.map(() => 1);
  const g = new Map(), key = (x, y) => x + "," + y;
  for (const q of pools) { const k = key(Math.floor(q.x / POOL_CELL), Math.floor(q.y / POOL_CELL)); const b = g.get(k); if (b) b.push(q); else g.set(k, [q]); }
  const reach = Math.ceil(Math.max(...pools.map(q => q.r)) / POOL_CELL);
  return pools.map(p => {
    const cx = Math.floor(p.x / POOL_CELL), cy = Math.floor(p.y / POOL_CELL); let n = 0;
    for (let x = cx - reach; x <= cx + reach; x++) for (let y = cy - reach; y <= cy + reach; y++) for (const q of g.get(key(x, y)) || []) if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < (q.r * 0.9) ** 2) n++;
    return Math.max(1, n);
  });
}
function drawPuddles(t) {
  const now = performance.now() / 1000;
  ctx.strokeStyle = ctx.fillStyle = COL.tacd; ctx.lineWidth = 1.2;
  drawPools(t, now);
  const n = (t.puddles || []).length, per = Math.min(2, n > POOL_LOD ? POOL_LOD * PUDDLE_BUBBLES / n : PUDDLE_BUBBLES); // bubbles a pool, on average (3D: 2 at most)
  (t.puddles || []).forEach((p, j) => {
    const I = puddleGlow(p), fade = Math.min(1, (1 - p.age / p.life) * I), seed = p.seed ||= 1 + Math.floor(Math.random() * 1e6);
    ctx.lineWidth = 1.2 * I;
    const nb = Math.floor(per * (j + 1)) - Math.floor(per * j) + (p.lake && n <= POOL_LOD ? 1 + (seed % 2) : 0); // spread evenly: some pools get one, some none; a LAKE pool (Spill V) bubbles 1-2 more
    for (let i = 0; i < nb; i++) {
      const ph = now / BUBBLE_T + i / PUDDLE_BUBBLES + (seed % 97) / 97, cyc = Math.floor(ph), f = ph - cyc;
      const h = k => fixedRand(cyc * 13 + i * 3 + k, seed); // this bubble's own jitter, fixed for its life
      const a = h(0) * 6.283, d = Math.sqrt(h(1)) * p.r * 0.8, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      const max = p.r * (0.2 + 0.25 * h(2));
      ctx.beginPath();
      if (f < 1 - BUBBLE_POP) {
        ctx.arc(x, y, max * f / (1 - BUBBLE_POP), 0, 6.283);
        ctx.globalAlpha = Math.min(1, 0.3 * fade); ctx.fill();
        ctx.globalAlpha = Math.min(1, 0.9 * fade); ctx.stroke();
      } else {
        const q = (f - 1 + BUBBLE_POP) / BUBBLE_POP; // the pop: a ring widening and gone
        ctx.arc(x, y, max * (1 + 0.5 * q), 0, 6.283);
        ctx.globalAlpha = 0.6 * (1 - q) * fade; ctx.stroke();
      }
    }
  });
  ctx.globalAlpha = 1;
}
