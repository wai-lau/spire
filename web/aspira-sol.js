// /spire - SOL's PASSTHROUGH (6.3.0, split out of aspira-towers.js at its 500-line cap): rayHit calls solPierce after every hit
// SOL OVERKILL PIERCES (owner, 2026-10-18: "at level 0, for all sol beams, incl refractions, an overkilling shot keeps going forward,
// carrying 20% of the remaining damage / upgrading breach upgrades this, up to 100% / this means applies full breach stacks,
// regardless of amount of damage"): a kill sends the beam on along its line to the next enemy within SOL_PIERCE_W of it (up to
// SOL_PIERCE_LEN on), with SOL_PIERCE[breach] of what the kill did not need; that hit breaches in full (bleed), and a kill goes on
// THE REWORK (owner, 2026-10-22: "always goes through at 100% after enemy in a straight line" / "whole screen, make beams thin"): every hit
// carries on at st.pierce (1) x st.pass of the full hit to the screen's edge (SOL_PIERCE_LEN, SOL_PIERCE_HOPS a perf cap) on a THIN line (was 24 wide, 420 on, 12)
const SOL_PIERCE_W = 6, SOL_PIERCE_LEN = 3000, SOL_PIERCE_HOPS = 64, SOL_BEAM_THIN = 1.5;
// every SOL beam's width x SOL_THIN (owner, 2026-10-23: "Make beams way thinner each"); its opacity x share^2 (f.share, rayHit)
const SOL_THIN = 0.4;
// ALWAYS (owner, 2026-10-19: "make beams always pass through the max amount for breach level" - no kill needed): every hit sends the
// beam on with SOL_PIERCE[breach] of the FULL hit, the same at every hop, up to SOL_PIERCE_HOPS enemies along its line
// AS A REFLECTION (owner, 2026-10-22: "make the piercing beam the same visual intensity and damage as the reflected beam"): the beam
// on carries st.pass (SOL_PASS by FOCUS tier since 2026-10-23; was st.hop) of the hit, drawn like a reflection's beam (one beam's damage, full alpha, thin)
function solPierce(t, st, from, e, full, share = 1) {
  const carry = full * (st.pierce || 0) * (st.pass || 1), seen = carry / (st.beams || 1), al = share * (st.pierce || 0) * (st.pass || 1); if (carry <= 0) return; // al: its opacity, the share of the first beam it carries (rayHit)
  const hops = Math.min(SOL_PIERCE_HOPS, st.passN ?? SOL_PIERCE_HOPS); if (!hops) return; // Focus's count (SOL_PASS_N): tier 0 stops at its first enemy (tier redesign 2026-10-24)
  for (let k = 0; k < hops; k++) {
    const dx = e.x - from.x, dy = e.y - from.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let o = null, best = SOL_PIERCE_LEN;
    for (const x of G.enemies) {
      if (x.dead || !x.seen || x === e) continue;
      const rx = x.x - e.x, ry = x.y - e.y, along = rx * ux + ry * uy;
      if (along <= 0 || along >= best || Math.abs(rx * uy - ry * ux) > SOL_PIERCE_W + (ENEMIES[x.type].size || 0)) continue;
      best = along; o = x;
    }
    if (!o) break;
    beam(e, o, TOWERS[t.kind].color, RAY_BEAM_LIFE, SOL_BEAM_THIN, seen, true); Object.assign(fx[fx.length - 1], { share: al, thin: SOL_THIN }); // one beam's damage, at its share's opacity
    fromHit(e, () => damage(o, carry, t, false, false, st)); onHit(o, t, st, carry); bleed(o, st, t);
    from = e; e = o;
  }
  if (e !== from) { solOutOfSight(t, st, from, e); Object.assign(fx[fx.length - 1], { share: al, thin: SOL_THIN }); } // on to the screen's edge past the last one (thin, its share's opacity)
}
// TARGETING BY THE LINE (owner, 2026-10-23: "for SOL targetting, account for passthrough enemies to select first targets"): of the
// SOL_LINE_TOP first by the tower's mode, the one whose beam - tower through it, on to SOL_PIERCE_LEN - hits the most enemies (the
// pass-through's reach, SOL_PIERCE_W wide), ties kept in the mode's order (stable sort); c is pickTargets' sorted candidates
const SOL_LINE_TOP = 24;
function solLineSort(t, c) {
  const top = c.slice(0, SOL_LINE_TOP), n = new Map();
  for (const a of top) {
    const dx = a.e.x - t.x, dy = a.e.y - t.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let k = 1;
    for (const x of G.enemies) {
      if (x.dead || !x.seen || x === a.e) continue;
      const rx = x.x - a.e.x, ry = x.y - a.e.y, along = rx * ux + ry * uy;
      if (along > 0 && along < SOL_PIERCE_LEN && Math.abs(rx * uy - ry * ux) <= SOL_PIERCE_W + (ENEMIES[x.type].size || 0)) k++;
    }
    n.set(a, k);
  }
  return top.sort((a, b) => n.get(b) - n.get(a)).concat(c.slice(SOL_LINE_TOP));
}
