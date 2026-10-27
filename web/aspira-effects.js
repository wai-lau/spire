// /aspira - the TOWERS' EFFECTS drawn on the board: aims, acid pools, ARC
// tethers, FRZ moons (split from aspira-draw.js at its 500-line cap). Same
// global scope; render() in aspira-draw.js calls these each frame.
// RPR's charge-up: a thin line to the target it is reloading for, fading in
// as the reload fills (alpha ~ progress^2), so the shot is telegraphed.
// It deals nothing; the damage comes with the bright flash on firing.
function drawAims() {
  ctx.lineCap = "round"; ctx.lineWidth = 0.8;
  const now = performance.now() / 1000;
  for (const t of G.towers) {
    if (t.kind !== "sol") continue;
    const st = towerStats(t), n = st.beams || 1, col = TOWERS[t.kind].color, real = st.band || SOL_BAND0;
    // THE PRISM PERSISTS (owner, 2026-10-26: "keep the prism rendered, instead slowly reduce the prism opacity. If another unit is being
    // targetted, swing the existing prism over there instead of starting over" / "prism width animation should only happen when charging if
    // the prism is not being re-used ... let the beam indicate charging / when the prism needs to go, fade it out slowly"): t.prism - a NEW
    // one widens from 0 as its first charge fills; a re-used one keeps its width and SWINGS to the new aim (SOL_PRISM_SWING rad/s), coming
    // back to full over SOL_PRISM_IN_S; with no lock it fades over SOL_PRISM_OUT_S and goes
    const lock = (t.locks || []).find(l => !l.e.dead), pr = t.prism, dt = pr ? Math.min(0.1, Math.max(0, now - pr.t)) : 0;
    if (lock && t.period) {
      const aim = Math.atan2(lock.e.y - t.y, lock.e.x - t.x), p = Math.min(1, Math.max(0, 1 - lock.cd / t.period));
      if (!pr || pr.alpha <= 0) t.prism = { a: aim, half: real * p, alpha: p, t: now, fresh: true };
      else if (pr.fresh) { pr.a = aim; pr.half = real * p; pr.alpha = p; pr.t = now; if (p >= 1) pr.fresh = false; }
      else { const d = ((aim - pr.a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, w = SOL_PRISM_SWING * dt; pr.a += Math.max(-w, Math.min(w, d)); pr.half = real; pr.alpha = Math.min(1, pr.alpha + dt / SOL_PRISM_IN_S); pr.t = now; }
    } else if (pr) { pr.alpha -= dt / SOL_PRISM_OUT_S; pr.t = now; if (pr.alpha <= 0) t.prism = null; }
    if (t.prism && t.prism.alpha > 0) drawBand({ x: t.x, y: t.y, a: t.prism.a, half: t.prism.half, len: SOL_CONE_EDGE, color: col }, Math.cbrt(t.prism.alpha)); // (cbrt: drawBand cubes it - linear in alpha)
    // THE SCORCH RODS (solRodStep): a line across the band at each rod's distance, as thick as the shot's first beam, clear at the tower
    // and full by SOL_ROD_FADE_U out (owner, 2026-10-26)
    if (t.rods && t.rods.length) {
      const w = beamWidth(st.dmg) * SOL_THIN * SOL_BEAM_W; ctx.lineCap = "butt";
      for (const r of t.rods) {
        const c = Math.cos(r.a), sn = Math.sin(r.a), x = r.x + c * r.s, y = r.y + sn * r.s, al = Math.min(1, r.s / SOL_ROD_FADE_U);
        const tl = Math.min(r.s, SOL_ROD_TRACER_U), tx = x - c * tl, ty = y - sn * tl; // the TRACER, under the rod (SOL_ROD_TRACER_U, aspira-sol.js)
        if (tl > 1 && [x, y, tx, ty].every(Number.isFinite)) { // (a NaN end: the gradient THROWS)
          const g = ctx.createLinearGradient(x, y, tx, ty); g.addColorStop(0, COL[col]); g.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.moveTo(x + sn * r.half, y - c * r.half); ctx.lineTo(x - sn * r.half, y + c * r.half); ctx.lineTo(tx - sn * r.half, ty + c * r.half); ctx.lineTo(tx + sn * r.half, ty - c * r.half); ctx.closePath(); /* NO TAPER (owner, 2026-10-27): the rod's full width all the way back */
          ctx.fillStyle = g; ctx.globalAlpha = al * SOL_ROD_TRACER_A; ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(x + sn * r.half, y - c * r.half); ctx.lineTo(x - sn * r.half, y + c * r.half);
        ctx.strokeStyle = COL[col]; ctx.globalAlpha = al * SOL_GLOW_A * BEAM_BRIGHT; ctx.lineWidth = w * 2; ctx.stroke();
        ctx.strokeStyle = COL.white; ctx.globalAlpha = al; ctx.lineWidth = w; ctx.stroke();
      }
      ctx.lineCap = "round";
    }
    if (!lock || !t.period) continue;
    for (const l of t.locks) { // each lock's CHARGE LINE brightens on its own charge - the charging read (owner, 2026-10-26)
      if (l.e.dead) continue;
      const p = Math.min(1, Math.max(0, 1 - l.cd / t.period));
      ctx.strokeStyle = COL[col]; ctx.globalAlpha = 0.32 + 0.32 * p * p; ctx.lineWidth = 0.8; // never below half its full strength (owner)
      const len = Math.hypot(l.e.x - t.x, l.e.y - t.y) || 1, px = -(l.e.y - t.y) / len, py = (l.e.x - t.x) / len;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 2 * TWIN_GAP;
        ctx.moveTo(t.x + px * o, t.y + py * o); ctx.lineTo(l.e.x, l.e.y); // converging on the target (owner)
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
const SOL_PRISM_SWING = 4, SOL_PRISM_IN_S = 0.3, SOL_PRISM_OUT_S = 1.5; // rad/s a re-used prism swings; s back to full; s to fade out

// ACD: each line thin and faint at first, thicker and brighter as its burn
// ramps (a Residue line, out of range, at half strength); Plague's circle
// round each target; Contagion has no lines - its range glows instead.
function drawAcd() {
  ctx.lineCap = "round"; ctx.strokeStyle = COL.tacd;
  for (const t of G.towers) {
    if (t.kind !== "acd") continue;
    drawPuddles(t); // the chart ACD's puddles, under its lines (aspira-skills.js)
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
    if (st.skill) { ownColours(() => drawFrzSkill(t, st)); continue; } // the chart FRZ: aura, moons, Rime (aspira-skills.js)
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

