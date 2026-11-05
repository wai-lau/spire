// /aspira - the TOWERS' EFFECTS drawn on the board: acid pools, ARC
// tethers, FRZ moons (split from aspira-draw.js at its 500-line cap). Same
// global scope; render() in aspira-draw.js calls these each frame.
// ACD: each line thin and faint at first, thicker and brighter as its burn
// ramps (a Residue line, out of range, at half strength); Plague's circle
// round each target; Spill has no lines - its range glows instead.
function drawAcd() {
  ctx.lineCap = "round"; ctx.strokeStyle = COL.tacd;
  for (const t of G.towers) {
    if (t.kind !== "acd") continue;
    drawPuddles(t); // the chart ACD's puddles, under its lines (aspira-acid-draw.js)
    if (!t.lines || !t.lines.length) continue;
    const st = towerStats(t, true);
    // Spray V (a jet on every enemy in reach): its reach a thin pulsing ring and the JETS themselves below - it was one green
    // disc over the whole reach, the pools and jets lost under it (owner, 2026-10-14: "want them to be distinguishable")
    if (st.allInRange) {
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(performance.now() / 200); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, 6.283); ctx.stroke();
    }
    for (const l of t.lines) {
      if (l.e.dead) continue;
      // Catalyst: the line THROBS, faster the further its burn has ramped (owner)
      const f = acdFrac(l, st), cat = skillOf(t, "corrosion") > 0 || (t.path != null && UPGRADES.acd[t.path].name === "Catalyst");
      const k = (Math.hypot(l.e.x - t.x, l.e.y - t.y) > st.range ? 0.5 : 1) *
        (cat ? 0.7 + 0.3 * Math.sin(performance.now() / 1000 * (4 + 20 * f)) : 1);
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(l.e.x, l.e.y);
      for (const o of l.chain || []) if (!o.dead) ctx.lineTo(o.x, o.y); // Rain: on through its chain
      // as THICK as one burn tick's damage (beamWidth, owner)
      const bw = beamWidth(st.dmg * acdMulOf(l.held, st) / st.rate);
      ctx.globalAlpha = (0.1 + 0.2 * f) * k; ctx.lineWidth = bw * 3; ctx.stroke();
      ctx.globalAlpha = (0.6 + 0.4 * f) * k; ctx.lineWidth = bw; ctx.stroke();
      if (st.plagueR) {
        const pr = plagueRadius(l, st);
        gradDisc(l.e.x, l.e.y, pr, COL.tacd, k);
        ctx.globalAlpha = (0.15 + 0.25 * f) * k; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(l.e.x, l.e.y, pr, 0, 6.283); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// SLW's continuous tethers: a live beam from each Slower to every enemy it
// is holding, redrawn each frame so it tracks them; it drops when the enemy
// dies or leaves range. A slow shimmer keeps it reading as a held effect.
function drawTethers() {
  const shimmer = 0.75 + 0.25 * Math.sin(performance.now() / 160);
  ctx.lineCap = "round";
  for (const t of G.towers) {
    if (t.kind !== "frz") continue;
    const st = towerStats(t, true), r = st.range, col = COL[TOWERS[t.kind].color];
    if (st.skill) { ownColours(() => drawFrzSkill(t, st)); continue; } // the chart FRZ: aura, moons, Rime (aspira-frz.js)
    // Moons / Desolation: orbiting moons, always shown - in FRZ's OWN colour on a
    // boss sky, like the towers (owner)
    if (st.moons) { ownColours(() => drawMoons(t, st, COL[TOWERS[t.kind].color], shimmer)); continue; }
    if (!t.links || !t.links.length) continue;
    // Stasis (the slow path): a much THICKER tether (owner)
    const w = t.path != null && UPGRADES.frz[t.path].name === "Stasis" ? 2 : 1;
    for (const e of t.links) {
      if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > r) continue;
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(e.x, e.y);
      // three rays now, so each FAINTER (owner); as THICK as its hit (beamWidth, owner)
      const bw = beamWidth(st.dmg) * w;
      ctx.globalAlpha = 0.1 * shimmer; ctx.lineWidth = bw * 3; ctx.stroke();
      ctx.globalAlpha = 0.45 * shimmer; ctx.lineWidth = bw; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// FRZ's Moons / Desolation: each moon a bright body with a small glow, and a
// Stasis-thick tether from the moon (where it is NOW) to the enemy it holds
const MOON_GLOW = 0.35, MOON_GLOW_R = 26;
function drawMoons(t, st, col, shimmer) {
  const spots = moonSpots(t, st);
  for (const { i, e } of t.moonLinks || []) {
    const m = spots[i];
    if (!m || e.dead || Math.hypot(e.x - m.x, e.y - m.y) > st.range) continue;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(e.x, e.y);
    ctx.globalAlpha = 0.15 * shimmer; ctx.lineWidth = 12; ctx.stroke();
    ctx.globalAlpha = 0.7 * shimmer; ctx.lineWidth = 3.2; ctx.stroke();
  }
  for (const m of spots) {
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, MOON_GLOW_R);
    g.addColorStop(0, col); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.globalAlpha = MOON_GLOW;
    ctx.beginPath(); ctx.arc(m.x, m.y, MOON_GLOW_R, 0, 6.283); ctx.fill();
    ctx.fillStyle = col; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}


// SOL'S HELD BEAMS (owner, 2026-11-04: "SOL 0: fire a single tracking beam at a target" / Reflection "splits towards N targets ... other beams
// pierce" / "pierce damage reduction is applied each time it passes through an enemy"): t.solB (aspira-sol.js) drawn every frame
// at its live ends as SOL beams - the same look as a shot's (drawFx / fxGlBeam: glow + white core), never an fx entry. The first beam,
// tower -> its target; each split, from that target through every enemy its line crosses, one segment each, DIMMER past each (its share
// k there: alpha ~ k, the core thinner). Each tick (SOL_TICK) the beams FLASH and ease back. One object a segment, kept per tower
// (a WeakMap: nothing on the tower that the autosave could keep)
const SOL_TRACK_FLASH = 0.35, solTrackPool = new WeakMap();
function solTrackBeams() {
  let out = null;
  for (const t of G.towers) {
    const B = t.solB; if (t.kind !== "sol" || !B || B.e.dead) continue;
    const st = solTrackSt(t, towerStats(t)), d = st.dmg * st.rate * SOL_TICK, fl = 1 - SOL_TRACK_FLASH + SOL_TRACK_FLASH * (1 - Math.min(1, B.acc / SOL_TICK)) ** 2;
    let pool = solTrackPool.get(t); if (!pool) solTrackPool.set(t, pool = []);
    let n = 0;
    const seg = (a, b, k) => { const f = pool[n] || (pool[n] = { k: "beam", t: 0, life: 1, m: true, slim: true, color: TOWERS.sol.color }); n++;
      f.a = a; f.b = b; f.d = d * k; f.bw = undefined; f.share = Math.sqrt(k); f.alpha = fl; (out ||= []).push(f); };
    seg(t, B.e, 1);
    // a split from the first target THROUGH each enemy it crosses, dimming by its carry at each, and on past the last to the play box's edge
    // as drawn (solShowLen of l.L, the line's length the game uses - owner, 2026-11-04: "all secondary beams fly off to edge of screen")
    for (const l of B.links) {
      let from = B.e, k = 1, cut = false; for (const h of l.hits) { if (h.e.dead) { cut = true; break; } seg(from, h.e, h.k); from = h.e; k = h.k; }
      if (cut || !(l.L > 0)) continue;
      const ax = B.e.x, ay = B.e.y, d0 = Math.hypot(l.e.x - ax, l.e.y - ay) || 1, ux = (l.e.x - ax) / d0, uy = (l.e.y - ay) / d0, L = solShowLen(ax, ay, ux, uy, l.L);
      const end = l.end ||= { x: 0, y: 0 }; end.x = ax + ux * L; end.y = ay + uy * L;
      if ((end.x - from.x) * ux + (end.y - from.y) * uy > 0) seg(from, end, k * (st.hop || 1));
    }
  }
  return out;
}
