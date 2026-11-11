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
const SOL_SCORCH_SLOW = 0.12; /* x2 (2026-11-06: SOL trios died mostly to fast; screen 50 games vs 7.7.42 +6.0, SOL trios 6/20 -> 9/20; was 0.06) */
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
const SOL_TRACK_HOP = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75], SOL_TRACK_DMG = 4.55; /* x1.3 (2026-11-06, after GRV one-nova: SOL trios 6/18 -> 7/18 over a 50-game screen, marks distance 14 held; was 3.5) */
// SCORCH_M stacks a shot's worth (1 / rate s) of beam time on an enemy: 1 broke ARC's two checks, 2 CRR's (the shield column), 3 holds them
const SOL_SCORCH_M = 3;
// THE PULSE'S CADENCE (owner, 2026-11-05: "pulse at the old rate! for SOL" / "reduce fire rate of SOL then" / "short aim time is mostly for
// visual"): a shot every 1 / (rate x SOL_PULSE_K) s for st.dmg / SOL_PULSE_K (the damage a second held), its scorch in SOL_SCORCH_M /
// SOL_PULSE_K stacks a shot (the stacks a second held: "scorch is what pops shields"); a NEW lock aims SOL_AIM s before it may fire
const SOL_FL_KEEP = 0.3; /* x2 with SOL_PULSE_FLASH (owner, 2026-11-09: "visual-only: double duration of SOL beams"); a look only - nothing in the game reads the kept flash */ // s a pulse's flash shows (aspira-effects.js SOL_PULSE_FLASH: the same) - kept past the lock a killing pulse ends
let SOL_PULSE_K = 0.75, SOL_AIM = 0.3; // (marks 9 pts 101-119: x1 76/24/0/21, x0.75 80/30/0/23, x0.5 83/34/0/26 - all swarm -3, distance 20; x0.75 shipped: "reduce fire rate of SOL then")
// SCORCH V's FLARE (owner, 2026-11-06: "SOL, don't require death, just first enemy hit, leave SOL colored IFR flare"): each shot's FIRST
// enemy hit (the lock, whether it dies or not) leaves an IFR flare there in SOL's colour, burning as IFR's untaken Flare does (its length,
// width, burn and tick: ifrFlareTiming(0), IFR_BEAM_L/W[0], the mean flare size) and ticking through ifrTickFlare. Its tick = IFR's flare tick
// (IFR_TICK_K0 x ifrFlareTiming(0).k = ~0.915 x the tower's damage, the SOL tower's own dmg - not the tracking beam's x4.55) x SOL_FLARE_SHARE (1: burns exactly as IFR's flare).
// At most SOL_FLARE_MAX live a tower (the oldest drops): a pulse is ~1.2 s apart and a flare burns 0.6 s, so it is a safety, not a throttle
const SOL_FLARE_SHARE = 1, SOL_FLARE_MAX = 4, SOL_FLARE_I = 3; // SOL_FLARE_I: the glow's intensity (= IFR_FLARE_I0, the untaken flare's)
function solLandFlare(t, st, e) {
  const fl = (t.solFlares ||= []), ft = ifrFlareTiming(0), s = IFR_FLARE_K * IFR_FLARE_MEAN; // (the mean flare, no draw: deterministic)
  while (fl.length >= SOL_FLARE_MAX) fl.shift();
  fl.push({ x: e.x, y: e.y, L: IFR_BEAM_L[0] * s, W: IFR_BEAM_W[0] * IFR_FLARE_K * (s / IFR_FLARE_K) ** IFR_FLARE_WS, life: ft.burn, left: ft.burn, tick: 0, tickS: ft.tick,
    hit: st.d0 * IFR_TICK_K0 * ft.k * SOL_FLARE_SHARE, xk: IFR_X_K, edges: false, sol: true, hitI: SOL_FLARE_I });
}
function stepSolFlares(t, st, dt) {
  const fl = t.solFlares; if (!fl || !fl.length) return;
  for (const f of fl) { f.left -= dt; f.tick += dt; if (f.tick >= f.tickS) { f.tick -= f.tickS; ifrTickFlare(t, st.tickSt, f); } }
  keepLive(fl);
}
// REFLECTION V (owner, 2026-11-06: "Reflection V, yes, so each beam splits into 2, off to the edge of the screen, no need for white flashes"):
// each split beam splits again at ITS enemy into SOL_SUB_SPLIT more, to that enemy's nearest others (not the first target, not itself), each
// running on to the edge as a split does (Breach's carry: the parent's share at its enemy, x st.hop a pass). Was: the split count's last step only
const SOL_SUB_SPLIT = 2;
function solNearest(from, n, skip) {
  const out = [];
  for (const o of G.enemies) {
    if (o.dead || !o.seen || skip.includes(o)) continue;
    const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2; let i = out.length;
    while (i > 0 && out[i - 1][0] > d) i--;
    if (i < n) { out.splice(i, 0, [d, o]); if (out.length > n) out.pop(); }
  }
  return out.map(q => q[1]);
}
// THE BEST LINE (owner, 2026-11-07: "when breach and reflection, all reflections should pick lines that hit the most number of enemies
// ignoring targeting mechanism. Initial beam still abides by targetting choices"): with Breach (a split pierces), each split - Reflection V's
// sub-splits too - aims at the enemy whose line from its origin, on to the edge, crosses the most enemies (solLinkHits's width test), of
// the origin's SOL_LINE_K nearest (the cost bound); distinct, ties to the nearest. Without Breach a split hits its own enemy alone: nearest
const SOL_LINE_K = 24;
function solLineCount(org, c) {
  const ax = org.x, ay = org.y, d0 = Math.hypot(c.x - ax, c.y - ay) || 1, ux = (c.x - ax) / d0, uy = (c.y - ay) / d0, L = solOutLen(ax, ay, ux, uy);
  let n = 0;
  for (const o of G.enemies) {
    if (o === org || o.dead || !o.seen) continue;
    const dx = o.x - ax, dy = o.y - ay, along = dx * ux + dy * uy;
    if (o === c || (along >= 0 && along <= L && Math.abs(dx * uy - dy * ux) <= ENEMIES[o.type].size * (o.sizeMul || 1))) n++;
  }
  return n;
}
function solBestLines(org, n, skip) {
  if (!n) return [];
  return solNearest(org, SOL_LINE_K, skip).map((o, i) => [solLineCount(org, o), i, o]).sort((p, q) => q[0] - p[0] || p[1] - q[1]).slice(0, n).map(r => r[2]);
}
function solTrackSt(t, st) {
  if (st.trk) return st.trk;
  const bk = skillOf(t, "breach"), sc = skillOf(t, "focus"), V = sc >= 5, RV = skillOf(t, "refraction") >= 5;
  const dot = st.dot ? { k: st.dot.k / (V ? 2 : 1), n: st.dot.n * (V ? 2 : 1), t: st.dot.t * (V ? 2 : 1), v: V } : null;
  const dmg = st.dmg * SOL_TRACK_DMG;
  return (st.trk = Object.assign({}, st, { bk, dmg, d0: st.dmg, flare: V, sub: RV ? SOL_SUB_SPLIT : 0, hop: SOL_TRACK_HOP[bk], par: 0, dot, tickSt: Object.assign({}, st, { dmg, dot: null }) }));
}
function solTickHit(t, st, e, d, from, pulse = false) {
  if (e.dead || !e.seen) return;
  const crit = Math.random() < ((st.crit || 0) + (e.bleedCrit || 0)) * (st.critScale || 1), dd = shotDamage(t, st, e, d) * (crit ? st.critMul : 1);
  bleed(e, st, t); fromHit(from, () => damage(e, dd, t, false, crit, st)); onHit(e, t, st.tickSt, dd); // (Breach strips as the pulse lands - a killing pulse strips too)
  // (a stack every 1 / (SOL_SCORCH_M x rate) s of BEAM TIME, its ticks summed - the held beam's scorch, st.scorchEvery and e.solSc - GONE
  // with the pulse, 2026-11-06: every hit is a pulse's; a stack a tick, before that, left ~125 stacks ticking on a held boss at Scorch V)
  // A PULSE lays SOL_SCORCH_M stacks at once, each a share of its hit (owner, 2026-11-05: "scorch is what pops shields") - the same stacks a
  // second, the same burn, the same ticks as the held beam laid over the shot's worth of beam time
  if (pulse && st.dot && !e.dead) { const M = Math.max(1, Math.round(SOL_SCORCH_M / SOL_PULSE_K)); for (let j = 0; j < M; j++) (e.dots ||= []).push({ d: d / M * st.dot.k, left: st.dot.n, acc: 0, src: t, v: st.dot.v }); e.dotT = Math.max(e.dotT || 0, st.dot.t); return; }
}
function solTrackStart(t, st, e) {
  const B = { e, links: [], acc: 0 } /* the first tick ONE tick after the lock, like every later one: a lock that struck at once killed a swarmer a frame (frame-rate-bound) */;
  // NO RANGE ON A SPLIT (owner, 2026-11-05: "grant unlimited range to SOL's reflected beams"): the nearest other enemies ANYWHERE on the
  // board (was within st.range of the first target, owner 2026-11-04); the first target itself is still held in SOL's own range
  const near = G.enemies.filter(o => o !== e && !o.dead && o.seen)
    .sort((p, q) => ((p.x - e.x) ** 2 + (p.y - e.y) ** 2) - ((q.x - e.x) ** 2 + (q.y - e.y) ** 2));
  const first = st.bk ? solBestLines(e, st.split || 0, [e]) : near.slice(0, st.split || 0); // (THE BEST LINE with Breach - solBestLines)
  for (const o of first) B.links.push({ e: o, from: e, hits: [] });
  if (st.sub) for (const p of B.links.slice()) for (const o of (st.bk ? solBestLines : solNearest)(p.e, st.sub, [e, p.e])) B.links.push({ e: o, from: p.e, par: p, hits: [] }); // (REFLECTION V: after its parent, so the parent's hits are read first)
  return B;
}
// the enemies a split's line crosses, in order from the first target, THROUGH its own enemy and on to the play box's edge (owner,
// 2026-11-04: "SOL should not bounce off the prism shape / all secondary beams fly off to edge of screen"; solOutLen, the same in the sim),
// each with the share left (x st.hop a pass); it still ends when its own enemy dies (stepSolTrack). l.L: the drawn line's length from e
function solLinkHits(B, l, st) {
  const org = l.from || B.e, k0 = l.par ? (l.par.hits.find(h => h.e === l.par.e) || { k: 1 }).k : 1; // (a sub-split starts at its parent's share at the parent's enemy)
  const ax = org.x, ay = org.y, d0 = Math.hypot(l.e.x - ax, l.e.y - ay) || 1, ux = (l.e.x - ax) / d0, uy = (l.e.y - ay) / d0, L = solOutLen(ax, ay, ux, uy), on = [];
  l.L = L;
  // NO PIERCE WITHOUT BREACH (owner, 2026-11-05: "SOL reflections shouldn't pierce without breach"): at Breach 0 a split hits its own enemy
  // and ends there - no line on to the edge (l.L 0: the draw stops at it), no enemy on the way
  if (!st.bk) { l.L = 0; return [{ e: l.e, k: k0 * (st.hop || 1) }]; }
  for (const o of G.enemies) {
    if (o === org || o.dead || !o.seen) continue;
    const dx = o.x - ax, dy = o.y - ay, along = dx * ux + dy * uy;
    if (o === l.e || (along >= 0 && along <= L && Math.abs(dx * uy - dy * ux) <= ENEMIES[o.type].size * (o.sizeMul || 1))) on.push([o === l.e ? d0 : along, o]);
  }
  on.sort((p, q) => p[0] - q[0]);
  let k = k0 * (st.hop || 1); return on.map(([, o]) => { const h = { e: o, k }; k *= st.hop || 1; return h; });
}
function stepSolTrack(t, st0, dt) {
  const st = solTrackSt(t, st0);
  let B = t.solB; if (t.solFlares) stepSolFlares(t, st, dt);
  if (t.solFl) { t.solFl.fl += dt; if (!(t.solFl.fl < SOL_FL_KEEP)) t.solFl = null; } // (a dropped lock's last flash, drawn out - solTrackBeams)
  if (B && (B.e.dead || (B.e.x - t.x) ** 2 + (B.e.y - t.y) ** 2 > st.range * st.range)) { if ((B.fl ?? 1e9) < SOL_FL_KEEP) t.solFl = B; B = t.solB = null; } // (a pulse that killed: its flash still shows)
  if (!B) { const e = pickTargets(t, st, 1)[0]; if (!e) { if (typeof solSfx === "function") solSfx(t, null, 0); return false; } B = t.solB = solTrackStart(t, st, e); t.solCd = Math.max(t.solCd || 0, SOL_AIM); B.aim = SOL_AIM; } // (B.aim: the aim line's draw)
  B.links = B.links.filter(l => !l.e.dead && !(l.par && l.par.e.dead));
  for (const l of B.links) l.hits = solLinkHits(B, l, st);
  // THE PULSE (owner, 2026-11-05: "Wait, SOL should still have it's old big hit fire rate / like, fire, pause, fire, pause"): the lock and
  // the splits as before, but the beam FIRES once a shot at SOL's fire rate - one hit of the shot's damage (st.dmg: the same damage a
  // second as the held beam's ticks), on the target and on every enemy each split crosses (Breach's carry) - and is dark between.
  // t.solCd: the time to the next shot, kept across locks (a new lock never fires early); B.fl: the time since this lock's last shot (the draw)
  B.fl = (B.fl ?? 1e9) + dt;
  const gap = 1 / (st.rate * SOL_PULSE_K); if (B.aim > 0) B.aim -= dt;
  t.solCd = Math.max(-gap, (t.solCd || 0) - dt);
  // THE MAIN BEAM PIERCES at Reflection 0 with Breach (owner, 2026-11-05: "for SOL, with no levels in reflection, breach should make the main
  // beam pierce"): on through its target to the play box's edge, Breach's carry at each enemy (B.pl: that line, as a split's)
  B.pl = !st.split && st.bk ? (B.pl || { e: B.e }) : null; if (B.pl) B.pl.hits = solLinkHits({ e: { x: t.x, y: t.y } }, B.pl, st).filter(h => h.e !== B.e);
  while (t.solCd <= 0 && !B.e.dead) {
    t.solCd += gap; B.fl = 0; const d = st.dmg / SOL_PULSE_K, hit = new Set([B.e]);
    B.links = solTrackStart(t, st, B.e).links; for (const l of B.links) l.hits = solLinkHits(B, l, st); // (each shot splits to the nearest others NOW - those of the lock walk off or die)
    solTickHit(t, st, B.e, d, t, true);
    if (st.flare) solLandFlare(t, st, B.e); // (SCORCH V: the shot's first hit, dead or not)
    // NO ENEMY TWICE A SHOT (owner, 2026-11-05: "Make it so that SOL reflect cannot reflect to the same enemy"): an enemy on two splits'
    // lines, or a split's line back across the first target, takes the shot once (the first split to reach it)
    for (const l of B.links) for (const h of l.hits) if (!hit.has(h.e)) { hit.add(h.e); solTickHit(t, st, h.e, d * h.k, B.e, true); }
    if (B.pl) for (const h of B.pl.hits) if (!hit.has(h.e)) { hit.add(h.e); solTickHit(t, st, h.e, d * h.k, B.e, true); }
  }
  if (typeof solSfx === "function") solSfx(t, B.e.dead ? null : B.e, t.solCd); // the shot's sound, lined up on the next pulse (aspira-sfx.js; the page only)
  return true;
}
