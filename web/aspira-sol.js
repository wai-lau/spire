// /spire - SOL's TRACKING BEAM (owner, 2026-11-04; live since 7.6.0): the beam held on its first target, its Reflection splits, the
// scorch stacks it leaves, and how far a line is drawn. (The OLD SHOT - a beam a volley, the band, its splits and mirrors, the scorch rod,
// Breach's parallel beams - was deleted 2026-11-05, after the flip; its design: ARCHAEOLOGY.md §4.4-quater.) Loaded before aspira-acid.js.
// A BEAM THAT FLIES ON IS DRAWN TO THE SCREEN'S EDGE (owner, 2026-10-28: "SOL pierce should go all the way to the end of the screen, it is
// stopping early"): what it STRIKES still ends at the play box (solOutLen - the same on every device, and the simulator's); only the
// drawn line runs on, SOL_SHOW_DU u at a time, until it leaves the canvas (never behind the 3D camera: 6.15.9's flip). Page only
const SOL_SHOW_DU = 24, SOL_SHOW_MAX = 4000;
function solShowLen(x, y, ux, uy, k) {
  if (typeof warp === "undefined" || !warp || !warp.gl || !warp.p || !warp.cv || typeof warpProjectScratch !== "function") return k;
  // UNDER THE TEXTURE CAMERA (viewCam): a shot fires in the game tick, outside warp3d, where cam is the page's - its points landed
  // 1/WARP_RES too far out against warp.cv's pixels, so the line stopped short of the edge (at the play box on a slow device, WARP_RES 0.5;
  // owner, 2026-11-01: "SOL beams not always reaching edge of screen")
  return typeof viewCam === "function" ? viewCam(() => solShowWalk(x, y, ux, uy, k)) : solShowWalk(x, y, ux, uy, k);
}
function solShowWalk(x, y, ux, uy, k) {
  const W = warp.cv.width, H = warp.cv.height, on = d => { const P = warpProjectScratch(x + ux * d, y + uy * d); return P.s > 0 && P.x >= 0 && P.x <= W && P.y >= 0 && P.y <= H; }; // (warp.cv's pixels: the space warpProject maps into)
  let d = k; while (d < SOL_SHOW_MAX && on(d)) d += SOL_SHOW_DU;
  const P = warpProjectScratch(x + ux * d, y + uy * d); return P.s > 0 ? d : Math.max(k, d - SOL_SHOW_DU); // (one step past the edge, so the line meets it; never a point behind the camera)
}

// SCORCH SLOWS what it burns (2026-10-31, owner: "Make SOL scorch slow" + "Reduce fire rate and diffraction / Increase other things"): SOL_SCORCH_SLOW a live stack, for as long as the burn runs (shields still refuse it - applySlow)
const SOL_SCORCH_SLOW = 0.06;
function solScorchTick(e, dt) {
  const q = SOL_SCORCH_Q; e.dotT -= dt;
  for (const s of e.dots || []) {
    s.acc += dt;
    while (s.acc >= q - 1e-9 && s.left > 0 && !e.dead) { s.acc -= q; s.left--; damage(e, s.d, s.src, false, false, SOL_DOT_ST); }
  }
  if (e.dots) e.dots = e.dots.filter(s => s.left > 0);
  if (e.dotT <= 0 || !e.dots || !e.dots.length) { e.dotT = 0; e.dots = null; }
  if (e.slows) delete e.slows.scorch; // re-set each tick, so it shrinks as stacks run out
  if (!e.dead && e.dots) applySlow(e, Math.min(TOWER_SLOW_MAX, SOL_SCORCH_SLOW * e.dots.length), 0.2, "scorch");
}
// THE TRACKING BEAM (owner, 2026-11-04, the SOL rework: "SOL 0: fire a single tracking beam at a target. / Scorch: back to coming from beam
// hits, remove prism and crossguard glow / Scorch V: scorch visual rings are doubled concentrically (more ticks vs shield) / Reflection:
// First beam no longer pierces, instead it splits towards N targets (max range SOL range but from enemy), other beams pierce instead of
// first. (fast answer since it can chain to what ARC cannot) / Breach: Determines carryover damage of all reflecting and piercing, also
// determines armor reduction. no parallel beams (armor answer) / To make worse vs swarm, pierce damage reduction is applied each time it
// passes through an enemy / It lasts as long as the first target is alive, the first target must be in range"; "SOL 0 no pierce"):
// one beam LOCKED on its first target, hitting only it, while it lives and stays in st.range; then the volley ends and SOL locks again.
// Reflection (id refraction) splits it at that target to st.split more enemies within st.range OF THE TARGET (the nearest, picked as the
// volley starts); each split beam PIERCES - it hits every enemy its line crosses on the way to its own enemy, Breach's carry (st.hop) off
// the damage at each one (the swarm weakness) - and ends when its enemy dies or the volley ends. Damage per second = the old shot's
// (st.dmg x st.rate), in SOL_TICK ticks: each tick pops one shield charge. Scorch comes from the hits (a stack a tick at the tick's share);
// Scorch V burns in twice the ticks at half each (v: the draw's doubled ring). No band, no bounce, no mirror, no parallel beams, no rod.
// State for the draw: t.solB = { e, links: [{ e, from, hits: [{ e, k }], L }], acc } (null between volleys)
const SOL_TICK = 0.25;
// the fit (countermx 9 pts, 101-119, 2026-11-04): Breach's carry a pass by Breach tier, and the curve's damage x SOL_TRACK_DMG (a tracking
// beam throws away the overkill a tick on every kill); SOL's marks hold at -2 -1 +2 +1, distance 24
const SOL_TRACK_HOP = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75], SOL_TRACK_DMG = 3.5;
// SCORCH_M stacks a shot's worth (1 / rate s) of beam time on an enemy: 1 broke ARC's two checks, 2 CRR's (the shield column), 3 holds them
const SOL_SCORCH_M = 3;
function solTrackSt(t, st) {
  if (st.trk) return st.trk;
  const bk = skillOf(t, "breach"), sc = skillOf(t, "focus"), V = sc >= 5;
  const dot = st.dot ? { k: st.dot.k / (V ? 2 : 1), n: st.dot.n * (V ? 2 : 1), t: st.dot.t * (V ? 2 : 1), v: V } : null;
  const dmg = st.dmg * SOL_TRACK_DMG;
  return (st.trk = Object.assign({}, st, { dmg, scorchEvery: 1 / (SOL_SCORCH_M * st.rate), hop: SOL_TRACK_HOP[bk], par: 0, dot, tickSt: Object.assign({}, st, { dmg, dot: null }) }));
}
function solTickHit(t, st, e, d, from) {
  if (e.dead || !e.seen) return;
  const crit = Math.random() < ((st.crit || 0) + (e.bleedCrit || 0)) * (st.critScale || 1), dd = shotDamage(t, st, e, d) * (crit ? st.critMul : 1);
  fromHit(from, () => damage(e, dd, t, false, crit, st)); onHit(e, t, st.tickSt, dd); bleed(e, st, t);
  // A STACK EVERY st.scorchEvery s OF BEAM TIME on this enemy (its ticks summed: SOL_SCORCH_M stacks a shot's worth), the same damage -
  // a stack a tick (4 a second) left ~125 stacks ticking on a held boss at Scorch V
  if (st.dot && !e.dead) {
    const a = (e.solSc ||= { d: 0, t: 0 }); a.d += d; a.t += SOL_TICK;
    if (a.t >= st.scorchEvery - 1e-9) { (e.dots ||= []).push({ d: a.d * st.dot.k, left: st.dot.n, acc: 0, src: t, v: st.dot.v }); e.dotT = Math.max(e.dotT || 0, st.dot.t); a.d = 0; a.t = 0; }
  }
}
function solTrackStart(t, st, e) {
  const B = { e, links: [], acc: 0 } /* the first tick ONE tick after the lock, like every later one: a lock that struck at once killed a swarmer a frame (frame-rate-bound) */, r2 = st.range * st.range;
  const near = G.enemies.filter(o => o !== e && !o.dead && o.seen && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r2)
    .sort((p, q) => ((p.x - e.x) ** 2 + (p.y - e.y) ** 2) - ((q.x - e.x) ** 2 + (q.y - e.y) ** 2));
  for (let i = 0; i < (st.split || 0) && i < near.length; i++) B.links.push({ e: near[i], from: e, hits: [] });
  return B;
}
// the enemies a split's line crosses, in order from the first target, THROUGH its own enemy and on to the play box's edge (owner,
// 2026-11-04: "SOL should not bounce off the prism shape / all secondary beams fly off to edge of screen"; solOutLen, the same in the sim),
// each with the share left (x st.hop a pass); it still ends when its own enemy dies (stepSolTrack). l.L: the drawn line's length from e
function solLinkHits(B, l, st) {
  const ax = B.e.x, ay = B.e.y, d0 = Math.hypot(l.e.x - ax, l.e.y - ay) || 1, ux = (l.e.x - ax) / d0, uy = (l.e.y - ay) / d0, L = solOutLen(ax, ay, ux, uy), on = [];
  l.L = L;
  for (const o of G.enemies) {
    if (o === B.e || o.dead || !o.seen) continue;
    const dx = o.x - ax, dy = o.y - ay, along = dx * ux + dy * uy;
    if (o === l.e || (along >= 0 && along <= L && Math.abs(dx * uy - dy * ux) <= ENEMIES[o.type].size * (o.sizeMul || 1))) on.push([o === l.e ? d0 : along, o]);
  }
  on.sort((p, q) => p[0] - q[0]);
  let k = st.hop || 1; return on.map(([, o]) => { const h = { e: o, k }; k *= st.hop || 1; return h; });
}
function stepSolTrack(t, st0, dt) {
  const st = solTrackSt(t, st0);
  let B = t.solB;
  if (B && (B.e.dead || (B.e.x - t.x) ** 2 + (B.e.y - t.y) ** 2 > st.range * st.range)) B = t.solB = null;
  if (!B) { const e = pickTargets(t, st, 1)[0]; if (!e) return false; B = t.solB = solTrackStart(t, st, e); }
  B.links = B.links.filter(l => !l.e.dead);
  for (const l of B.links) l.hits = solLinkHits(B, l, st);
  B.acc += dt;
  while (B.acc >= SOL_TICK && !B.e.dead) {
    B.acc -= SOL_TICK; const d = st.dmg * st.rate * SOL_TICK;
    solTickHit(t, st, B.e, d, t);
    for (const l of B.links) for (const h of l.hits) solTickHit(t, st, h.e, d * h.k, B.e);
  }
  return true;
}
