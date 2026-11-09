// /spire - TOWER RANGES (split from aspira-draw.js at its 500-line cap, 2026-11-03): the range rings over the boss's HP bar, a
// blocked slot's mark, the range path (flat or projected), a tower's range drawn, the soft disc. Loads right after aspira-draw.js.
// THE RANGES OVER THE BOSS'S HP BAR (owner, 2026-10-27: "tower ranges and effects should appear above hp"): every tower's reach ring -
// a moon tower's moons' circles, ARC's dashed reach - as a projected polygon on the entity layer at the floor's
// level (warpEntities' part A, after drawBossBarFloor), so it lies over the bar and under the dice, the beams and the towers. The
// selected tower's at full strength with its disc, the rest faint; under a boss sky every one white at full strength ("range should be
// visible during boss waves"), in the frame's palette so it turns over with the rest - drawTowerRange itself, with a projection
function drawRangesOver() {
  const sel = ui.sel && G.towers.find(t => t.id === ui.sel), k = skyOn() ? "white" : undefined; // (sky: every one at full strength, white)
  for (const t of G.towers) if (t !== sel) drawTowerRange(t, !k, k, warpProjectScratch); if (sel) drawTowerRange(sel, false, k, warpProjectScratch);
}
// pink cross: "can't place here"
function drawBlocked(x, y, r) {
  ctx.strokeStyle = COL.pink; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
  ctx.stroke(); ctx.globalAlpha = 1;
}

// Every tower's reach is always drawn faintly; the selected tower (and the
// build ghost) draws at full strength. dim = the faint pass.
// proj (3D, drawRangesOver): the ring as a projected polygon on the entity layer, its widths by the perspective there; without it, on
// the board in board units (2D, the build ghost)
const RANGE_PTS = 64;
function rangePath(at, proj) { // the closed path through at(0 .. 2 pi), projected or not; returns the px a unit at its first point
  if (proj) ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); let k = 1;
  for (let i = 0; i <= RANGE_PTS; i++) { let [x, y] = at(i / RANGE_PTS * 6.283); if (proj) { const P = proj(x, y); if (!i) k = cam.k * (P.s || 1); x = P.x; y = P.y; } if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  return k;
}
function drawRange(x, y, r, color, dim = false, proj) {
  const k = rangePath(th => [x + Math.cos(th) * r, y + Math.sin(th) * r], proj);
  // only the SELECTED tower's disc is filled: a dim one's 2.5% fill was all
  // but invisible, and nine big discs (three a moon tower) were the costliest
  // single draw of a late frame (2026-10-05)
  if (!dim) { ctx.fillStyle = COL[color]; ctx.globalAlpha = 0.08; ctx.fill(); }
  ctx.strokeStyle = COL[color]; ctx.globalAlpha = dim ? 0.35 : 0.75; ctx.lineWidth = (dim ? 2 : 3.5) * k; ctx.stroke();
  ctx.globalAlpha = 1;
}

// a tower's range; the Reaper's outer HOLD ring (2x) is not drawn (owner),
// ARC's REACH ring (how far its arcs may land, chainReach) is, dashed (owner)
function drawTowerRange(t, dim, colKey, proj) {
  const st = towerStats(t), r = st.range, col = colKey || TOWERS[t.kind].color;
  // Moons / Desolation: each moon's slowing circle INSTEAD of the tower's range (owner)
  if (st.moons) { for (const m of moonSpots(t, st)) drawRange(m.x, m.y, r, col, dim, proj); return; }
  drawRange(t.x, t.y, r, col, dim, proj);
  // a chart FRZ's moon ORBIT - NOT DRAWN (owner, 2026-11-08: "the moon orbits do not need a circle (their range keeps indicator)"; drawn like its range since 2026-10-08)
  if (t.kind !== "arc") return;
  if (st.skill) return; // a chart ARC has no reach from the tower: each jump reaches from its own enemy (owner)
  const rr = chainReach(st), k = rangePath(th => [t.x + Math.cos(th) * rr, t.y + Math.sin(th) * rr], proj);
  ctx.strokeStyle = COL[col]; ctx.setLineDash([8 * k, 10 * k]); ctx.lineWidth = (dim ? 1.5 : 2.5) * k;
  ctx.globalAlpha = dim ? 0.2 : 0.5; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// an area effect's disc (owner): a radial gradient from nothing at the centre
// to GRAD_EDGE (10%) at the outline - Plague/Bloom, Spill, Whiteout, Shatter, Supernova
const GRAD_EDGE = 0.1; // owner: 50% -> 10%
function gradDisc(x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "transparent"); g.addColorStop(1, col);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
  ctx.fillStyle = g; ctx.globalAlpha = GRAD_EDGE * a; ctx.fill();
}
const DMG_HOLD = 0.1; // s a damage number stays whole before it shrinks + fades (owner: 0.5 was too long)
const TWIN_GAP = 3.5; // Charge's parallel beams sit 2 x this apart
// Two passes so towers sit on top of their own shots but under the numbers:
// pass "shots" draws beams/rings/sparks, pass "text" draws floating numbers.
// Passes: "dmg" = damage numbers (`under` text), drawn right over the
// background beneath everything else (owner); "shots" = beams/rings/sparks;
// "text" = every other floating text, on top.
// at / map (3D, warpEntities): each effect drawn flat at its spot; a beam STRAIGHT between its projected ends (owner: "make beams 3d and ignore the curvature")
