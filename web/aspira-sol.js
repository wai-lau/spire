// /spire - SOL's SHOT (6.3.0, split out of aspira-towers.js at its 500-line cap): rayHit calls solSpread after the first hit
// (THE PIERCE - a beam on through every enemy on its line, 2026-10-18 .. 2026-10-26 - is GONE: owner, 2026-10-26 "Get rid of piercing";
// history ARCHAEOLOGY.md)
const SOL_BEAM_THIN = 1.5;
// every SOL beam's width x SOL_THIN (owner, 2026-10-23: "Make beams way thinner each"); its opacity x share^2 (f.share, rayHit)
const SOL_THIN = 0.4;
// THE SHOT'S BAND (owner, 2026-10-26: "instead of a cone, change the shape (not just visually) to an expanding rectangle"): every enemy a
// SOL shot hits after the first lies within st.band u either side of the line tower -> first enemy (solAim, set by fireRay), ahead of
// the tower, out to the screen's edge - and farther from the tower than the enemy before it. Its walls are PARALLEL: a mirrored line
// zig-zags down the band (the cone's diverging walls let it bounce only a few times)
let solAim = null;
function solInBand(t, st, x, a, at) {
  const dx = x.x - t.x, dy = x.y - t.y, c = Math.cos(a), s = Math.sin(a);
  return dx * c + dy * s > 0 && Math.abs(dy * c - dx * s) <= (st.band || SOL_BAND0) && dx * dx + dy * dy > (at.x - t.x) ** 2 + (at.y - t.y) ** 2;
}
// where the line from -> e, carried on past e, leaves the shot's band (the wall it meets first), or null if it never does
function solBandEdge(t, st, from, e) {
  const L = Math.hypot(e.x - from.x, e.y - from.y) || 1, ux = (e.x - from.x) / L, uy = (e.y - from.y) / L, W = st.band || SOL_BAND0;
  const nx = -Math.sin(solAim), ny = Math.cos(solAim), un = ux * nx + uy * ny, pn = (e.x - t.x) * nx + (e.y - t.y) * ny; // across the band
  if (Math.abs(un) < 1e-9) return null; // running along it: it never meets a wall
  const lam = ((un > 0 ? W : -W) - pn) / un;
  return lam > 1e-6 ? { x: e.x + ux * lam, y: e.y + uy * lam, wa: solAim } : null; // wa: the wall's angle (a mirror off it - solSpread)
}
// THE SPREAD (owner, 2026-10-26: "SOL should start with bouncing ... bounces have no limit" / "only reason a beam stops at an enemy is if
// there is less than 5% damage left" / "Get rid of piercing" / "Split, else fly on"): every hit SPLITS the beam to st.split more enemies
// (Diffraction) inside the shot's cone and farther from SOL (solInCone), each at st.hop x the hit before; a hit with no one to split to
// lets the beam FLY ON straight past it, striking no one on its line, to the cone's wall - a bounce (a carry step): it splits from the
// wall, or with no one there MIRRORS off it (angle in = angle out) and flies on - or out of the cone's open end to the screen's edge.
// An enemy is struck once a shot; a beam ends only under SOL_END_K of the shot; SOL_SHOT_CAP hits a shot guard the frame
const SOL_SHOT_CAP = 512, SOL_WALLS = 16; // SOL_WALLS: mirrors off the band's walls a line, at most (parallel walls: a line can zig-zag far)
// A BEAM ENDS below SOL_END_K of the shot (owner, 2026-10-26: "when carryover damage goes below 5%, end the beam")
const SOL_END_K = 0.05;
// THE NEXT NEAREST TO SOL (owner, 2026-10-26: "for diffraction targets, always choose the next nearest target to SOL"): of the enemies a
// split may take (skip: struck, outside the cone or no farther than the last), the one nearest the tower
function solNext(t, skip) {
  let best = null, bd = Infinity;
  for (const o of G.enemies) {
    if (o.dead || !o.seen || skip(o)) continue;
    const d = (o.x - t.x) ** 2 + (o.y - t.y) ** 2; if (d < bd) { bd = d; best = o; }
  }
  return best;
}
// THE SCORCH ROD (owner, 2026-10-26: "instead of having the prism do the scorch, add a horizontal beam when SOL fires (across the width
// of the prism) same thickness as initial beam that quickly slides from the tower until off the screen (opacity should fade in at 50u
// away from tower) / anything that this rod touches deals 1 stack of scorch"): a line across the band, SOL_ROD_V u/s out from where the
// tower fired along the shot's aim, to SOL_CONE_EDGE; an enemy it sweeps over takes ONE scorch stack, once a rod. Scorch I+ only
const SOL_ROD_V = 1400, SOL_ROD_FADE_U = 50;
function solRodFire(t, st, a) { if (!st.dot) return; (t.rods ||= []).push({ x: t.x, y: t.y, a, half: st.band || SOL_BAND0, s: 0, hit: new Set() }); }
function solRodStep(t, st, dt) {
  if (!t.rods || !t.rods.length) return;
  for (const r of t.rods) {
    const s0 = r.s; r.s += SOL_ROD_V * dt; const c = Math.cos(r.a), sn = Math.sin(r.a);
    for (const o of G.enemies) {
      if (o.dead || !o.seen || r.hit.has(o.id)) continue;
      const dx = o.x - r.x, dy = o.y - r.y, along = dx * c + dy * sn, across = Math.abs(dy * c - dx * sn), R = ENEMIES[o.type].size * (o.sizeMul || 1);
      if (along + R >= s0 && along - R <= r.s && across <= r.half + R) { r.hit.add(o.id); solScorch(o, t, st); }
    }
  }
  t.rods = t.rods.filter(r => r.s < SOL_CONE_EDGE);
}
function solSpread(t, st, from, e, full, share = 1) {
  if (!(st.pierce > 0) || full <= 0) return;
  const col = TOWERS[t.kind].color, hit = new Set([e]), L0 = Math.hypot(e.x - from.x, e.y - from.y) || 1;
  const seg = (a, b, d, al) => { beam(a, b, col, RAY_BEAM_LIFE, SOL_BEAM_THIN, d, true, false); Object.assign(fx[fx.length - 1], { share: al, thin: SOL_THIN }); };
  const strike = (o, at, d) => { hit.add(o); fromHit(at, () => damage(o, d, t, false, false, st)); onHit(o, t, st, d); bleed(o, st, t); };
  const out = last => x => hit.has(x) || (solAim != null && !solInBand(t, st, x, solAim, last)); // inside the shot's cone, farther from SOL
  let n = 0;
  const split = (b, at, carry, al) => { // st.split more off `at`, each farther than b.last: how many it found
    let k = 0;
    for (; k < (st.split || 0) && n < SOL_SHOT_CAP; k++) {
      const w = solNext(t, out(b.last)); if (!w) break;
      seg(at, w, carry, al); strike(w, at, carry); n++;
      const L = Math.hypot(w.x - at.x, w.y - at.y) || 1; q.push({ p: { x: w.x, y: w.y }, ux: (w.x - at.x) / L, uy: (w.y - at.y) / L, last: w, carry, al });
    }
    return k;
  };
  const q = [{ p: { x: e.x, y: e.y }, ux: (e.x - from.x) / L0, uy: (e.y - from.y) / L0, last: e, carry: full, al: share }];
  for (let qi = 0; qi < q.length; qi++) {
    const b = q[qi], carry = b.carry * (st.hop || 1), al = b.al * (st.hop || 1);
    if (carry < SOL_END_K * st.dmg) continue; // too faint: this beam ENDS here
    if (!b.wall && split(b, b.p, carry, al)) continue; // a hit: it splits (a mirrored line struck no one: it only flies)
    // FLY ON straight past it, through everyone, to the cone's wall
    const via = solAim != null ? solBandEdge(t, st, { x: b.p.x - b.ux, y: b.p.y - b.uy }, b.p) : null;
    if (!via) { seg(b.p, { x: b.p.x + b.ux * SOL_OUT_LEN, y: b.p.y + b.uy * SOL_OUT_LEN }, carry, al); continue; } // out the open end
    // THE WALL IS A BOUNCE (owner, 2026-10-26: "count that as a bounce, except there's no pierce"): a carry step, then split from it - or
    // with no one there A MIRROR ("just reflect off the cone (mirror angle across perpendicular line to cone edge)"), flying on from it
    seg(b.p, via, carry, al); const c2 = carry * (st.hop || 1), a2 = al * (st.hop || 1);
    if (c2 < SOL_END_K * st.dmg || split(b, via, c2, a2) || (b.walls || 0) >= SOL_WALLS) continue;
    const vx = Math.cos(via.wa), vy = Math.sin(via.wa), d = b.ux * vx + b.uy * vy;
    q.push({ p: { x: via.x, y: via.y }, ux: 2 * d * vx - b.ux, uy: 2 * d * vy - b.uy, last: b.last, carry: c2 / (st.hop || 1), al: a2 / (st.hop || 1), walls: (b.walls || 0) + 1, wall: true });
  }
}
// (solLineSort - the first target by the most enemies on its line - GONE with the pierce, owner 2026-10-26: "Get rid of piercing")
// SCORCH STACKS (owner, 2026-10-25: "Burn DoT ... stacking no cap"; 2026-10-26: the same for any hit): every hit, and the cone, adds its
// own burn - and the rod (solRodStep) one more: st.dot.n ticks of st.dot.k x the SHOT's hit (SOL_SCORCH_N, by Scorch tier) - 1x it in all; no cap on the stacks
// EACH STACK ITS OWN BURN (owner, 2026-10-26: "when then scorch stacks, each stack should apply their burns independently"): a stack ticks
// on its own clock from its hit, ONE damage call a tick - so each pops its own shield charge (was every stack summed into one tick)
function solScorch(e, t, st) {
  // THE SAME for any hit - the shot's, not this hit's falloff (owner, 2026-10-26: "let's not make the damage depend on the source hit");
  // dotT: the game loop ticks while > 0
  (e.dots ||= []).push({ d: st.dmg * st.dot.k, left: st.dot.n, acc: 0, src: t }); e.dotT = Math.max(e.dotT || 0, st.dot.t);
}
function solScorchTick(e, dt) {
  const q = SOL_SCORCH_Q; e.dotT -= dt;
  for (const s of e.dots || []) {
    s.acc += dt;
    while (s.acc >= q - 1e-9 && s.left > 0 && !e.dead) { s.acc -= q; s.left--; damage(e, s.d, s.src, false, false, SOL_DOT_ST); }
  }
  if (e.dots) e.dots = e.dots.filter(s => s.left > 0);
  if (e.dotT <= 0 || !e.dots || !e.dots.length) { e.dotT = 0; e.dots = null; }
}
