// ARC's CHAINS and BURN SPARKS - render only, nothing here touches the game (no Math.random: the sims share its stream).
// CHAINS (owner, 2026-10-30: "can you draw chains instead of a beam? so like interlocking rounded rectangles, odd are thinner than
// even chains to suggest interlinking, keep them thin so that the chains are not super intrusive"): every ARC strike and jump (a soft
// beam, fireSkillChain / skillHopTo, aspira-skills.js) is drawn as links laid along it - the even ones open rounded rectangles seen
// face on, the odd ones thin solid bars seen edge on, each odd link bridging the two evens it joins. One GPU instance a link in 3D
// (fxGlChain, called from fxGlBeam); two strokes a beam in 2D (drawChain2D, from drawFx). At most CHAIN_MAX links a beam: a longer
// one stretches its links. let ARC_CHAINS = false brings the old glow line back.
let ARC_CHAINS = true;
const CHAIN_STEP = 6, CHAIN_LEN = 9, CHAIN_R = 2.2, CHAIN_LW = 0.8, CHAIN_ODD_R = 0.55, CHAIN_MAX = 48, CHAIN_A = 1.25; // world units; A: x the beam's alpha
// the links along x0,y0 - x1,y1: calls link(ax, ay, bx, by, odd, k) with each link's axis ends and k its size (1, or more when stretched)
function chainLinks(x0, y0, x1, y1, link) {
  const len = Math.hypot(x1 - x0, y1 - y0); if (len < 1) return;
  const n = Math.min(CHAIN_MAX, Math.max(1, Math.round(len / CHAIN_STEP))), step = len / n, k = Math.max(1, step / CHAIN_STEP);
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, half = Math.min(CHAIN_LEN * k, len) / 2;
  for (let i = 0; i <= n; i++) {
    const s = Math.min(len - half, Math.max(half, i * step)), cx = x0 + ux * s, cy = y0 + uy * s;
    link(cx - ux * half, cy - uy * half, cx + ux * half, cy + uy * half, i & 1, k);
  }
}
// 3D: one capsule a link (shape 0, aspira-fxgl.js): an even link its outline only, an odd one filled - trimmed clear of the towers
function fxGlChain(f, a) {
  const x1 = f.a ? f.a.x : f.x1, y1 = f.a ? f.a.y : f.y1, x2 = f.b ? f.b.x : f.x2, y2 = f.b ? f.b.y : f.y2, c = trimToTowers(x1, y1, x2, y2);
  if (!c) return;
  const col = COL[f.color], al = Math.min(1, a * CHAIN_A), w = f.thin || 1;
  chainLinks(c[0], c[1], c[2], c[3], (ax, ay, bx, by, odd) => {
    const r = (odd ? CHAIN_ODD_R : CHAIN_R) * w, d = Math.hypot(bx - ax, by - ay) || 1, ix = (bx - ax) / d * Math.min(r, d / 2), iy = (by - ay) / d * Math.min(r, d / 2);
    if (odd) fxGlPush(ax + ix, ay + iy, bx - ix, by - iy, r, 0, col, al, col, 0);
    else fxGlPush(ax + ix, ay + iy, bx - ix, by - iy, r, CHAIN_LW * w, col, 0, col, al);
  });
}
// 2D: the even links as one path of stadium outlines, the odd ones as one path of round-capped bars (pt: drawFx's projection,
// ws: its world-to-pixel width scale; the canvas alpha is set by the caller)
function drawChain2D(x1, y1, x2, y2, pt, ws, css, thin) {
  const w = thin || 1, ev = new Path2D(), od = new Path2D();
  chainLinks(x1, y1, x2, y2, (ax, ay, bx, by, odd) => {
    const A = pt(ax, ay), B = pt(bx, by), r = (odd ? CHAIN_ODD_R : CHAIN_R) * w * ws, d = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const ix = (B.x - A.x) / d * r, iy = (B.y - A.y) / d * r, P = { x: A.x + ix, y: A.y + iy }, Q = { x: B.x - ix, y: B.y - iy };
    if (odd) { od.moveTo(P.x, P.y); od.lineTo(Q.x, Q.y); return; }
    const th = Math.atan2(B.y - A.y, B.x - A.x);
    ev.moveTo(Q.x + Math.cos(th - Math.PI / 2) * r, Q.y + Math.sin(th - Math.PI / 2) * r);
    ev.arc(Q.x, Q.y, r, th - Math.PI / 2, th + Math.PI / 2); ev.arc(P.x, P.y, r, th + Math.PI / 2, th + 3 * Math.PI / 2); ev.closePath();
  });
  ctx.strokeStyle = css; ctx.lineCap = "round"; ctx.globalAlpha = Math.min(1, ctx.globalAlpha * CHAIN_A);
  ctx.lineWidth = CHAIN_LW * w * ws; ctx.stroke(ev);
  ctx.lineWidth = 2 * CHAIN_ODD_R * w * ws; ctx.stroke(od);
}
// BURN SPARKS (owner, 2026-10-30: "arc burn should look like sparks"): an enemy ARC is burning (e.arcBurn, set by the burn's logic:
// { t: seconds left, k: damage a tick }) crackles - BURN_SPARKS short bent sparks in ARC's colour, re-thrown BURN_HZ times a second
// at places hashed from the enemy and the moment (scorchHash, aspira-enemies.js), so nothing is stored and nothing random is drawn
const BURN_SPARKS = 4, BURN_HZ = 18, BURN_REACH = 6, BURN_LEN = 8, BURN_W = 1.6;
const arcBurning = e => !!(e.arcBurn && e.arcBurn.t > 0);
function drawBurnSparks(e, size, vis) {
  const tick = Math.floor(performance.now() / 1000 * BURN_HZ), p = new Path2D();
  for (let i = 0; i < BURN_SPARKS; i++) {
    const h = scorchHash(e.id, tick * 7 + i), h2 = scorchHash(e.id + 0.5, tick * 7 + i), a = h * 6.283, r = size + 2 + BURN_REACH * h2;
    const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r, b = a + (h2 - 0.5) * 2.4, kx = x + Math.cos(b) * BURN_LEN * 0.5, ky = y + Math.sin(b) * BURN_LEN * 0.5;
    p.moveTo(x, y); p.lineTo(kx, ky); p.lineTo(kx + Math.cos(a) * BURN_LEN * 0.6, ky + Math.sin(a) * BURN_LEN * 0.6);
  }
  ctx.strokeStyle = COL[TOWERS.arc.color]; ctx.globalAlpha = 0.9 * vis; ctx.lineWidth = BURN_W; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(p);
}
