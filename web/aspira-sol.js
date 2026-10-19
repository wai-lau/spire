// /spire - SOL's PASSTHROUGH (6.3.0, split out of aspira-towers.js at its 500-line cap): rayHit calls solPierce after every hit
// SOL OVERKILL PIERCES (owner, 2026-10-18: "at level 0, for all sol beams, incl refractions, an overkilling shot keeps going forward,
// carrying 20% of the remaining damage / upgrading breach upgrades this, up to 100% / this means applies full breach stacks,
// regardless of amount of damage"): a kill sends the beam on along its line to the next enemy within SOL_PIERCE_W of it (up to
// SOL_PIERCE_LEN on), with SOL_PIERCE[breach] of what the kill did not need; that hit breaches in full (bleed), and a kill goes on
const SOL_PIERCE_W = 24 /* was 16 */, SOL_PIERCE_LEN = 420 /* was 320 (2026-10-19 buff) */, SOL_PIERCE_HOPS = 12;
// ALWAYS (owner, 2026-10-19: "make beams always pass through the max amount for breach level" - no kill needed): every hit sends the
// beam on with SOL_PIERCE[breach] of the FULL hit, the same at every hop, up to SOL_PIERCE_HOPS enemies along its line
function solPierce(t, st, from, e, full) {
  const carry = full * (st.pierce || 0), look = 0.5 + (st.pierce || 0) / 2; if (carry <= 0) return;
  for (let k = 0; k < SOL_PIERCE_HOPS; k++) {
    const dx = e.x - from.x, dy = e.y - from.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let o = null, best = SOL_PIERCE_LEN;
    for (const x of G.enemies) {
      if (x.dead || !x.seen || x === e) continue;
      const rx = x.x - e.x, ry = x.y - e.y, along = rx * ux + ry * uy;
      if (along <= 0 || along >= best || Math.abs(rx * uy - ry * ux) > SOL_PIERCE_W + (ENEMIES[x.type].size || 0)) continue;
      best = along; o = x;
    }
    if (!o) return;
    beam(e, o, TOWERS[t.kind].color, RAY_BEAM_LIFE, 3 * look, carry, true); fx[fx.length - 1].alpha = Math.min(1, look); // the CONTINUED beam LOOKS 50% + half its carry (owner, 2026-10-19: "at 20% carry it should appear like 60%, at 120% like 110%") - its width x look too, so past 100% it widens
    fromHit(e, () => damage(o, carry, t, false, false, st)); onHit(o, t, st, carry); bleed(o, st, t);
    from = e; e = o;
  }
}
