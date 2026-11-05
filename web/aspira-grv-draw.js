// /spire - GRV's LOOK (split out of aspira-grv.js 2026-11-05, the 500-line cap): the pellets' streaks, the aura's bands and gradient
// discs, the nova ring, the black sphere and its core. Draw only - the simulator never loads it. Loaded right after aspira-grv.js;
// drawSceneTop calls drawGrv, the 3D frame drawGrvCores (aspira-warp.js, aspira-demo.js).

// ---------- the PELLETS, drawn: a short coral streak along each one's flight ----------
const GRV_PELLET_TAIL = 0.03, GRV_PELLET_PX = 0.9 /* a quarter (owner, 2026-10-26: "make GRV radiation way thinner"; was 2.2 x 1.6 = 3.52, 2026-10-24 "visually more intense") */, GRV_PEL_BANDS = 4; // s of flight the streak spans; its width
function drawGrvPellets() {
  ctx.strokeStyle = COL.violet; ctx.lineCap = "round"; ctx.lineWidth = GRV_PELLET_PX; /* GRV purple (owner, 2026-10-15) */ ctx.globalAlpha = 1;
  // ONE path a band of opacity (perf: a stroke each was most of drawGrv's 4 ms a frame at wave 89): GRV_PEL_BANDS steps of GRV_PEL_A x j
  for (let b = 0; b < GRV_PEL_BANDS; b++) {
    ctx.globalAlpha = (b + 1) / GRV_PEL_BANDS; ctx.beginPath();
    for (const t of G.towers) for (const p of t.pellets || []) {
      const j = p.j || 1; if (Math.min(GRV_PEL_BANDS - 1, Math.floor(Math.min(1, GRV_PEL_A * j) * GRV_PEL_BANDS - 1e-9)) !== b) continue;
      ctx.moveTo(p.x - p.vx * GRV_PELLET_TAIL * j, p.y - p.vy * GRV_PELLET_TAIL * j); ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- the nova's damage numbers fly INWARD, toward the sphere (owner) ----------
// the aura's BANDS, the sphere outward, in the black-hole image's colours and shares (owner, 2026-10-15): white-hot 2, yellow 6,
// coral 13, pink 13, plum 18, deep purple 17 - each stop where its band starts, clear inside the first and past the last
const GRV_BANDS = [[0.15, "bhwhite"], [0.19, "yellow"], [0.3, "bhcoral"], [0.47, "bhpink"], [0.66, "bhplum"]]; // the outermost band CLEAR, not the near-black deep purple (owner, 2026-10-24: "GRV BH outermost color should be transparent, not black"; was [0.86, "bhdeep"])
// the NOVA: a thick ring (GRV_NOVA_W of its reach), GRV purple turning white as it collapses (owner, 2026-10-15; it was a red /
// orange / yellow ring going OUT for an hour)
const GRV_NOVA_GLOW = [0.25, 0.5]; // the 3D glow's [outer, middle] ring alpha x this (owner, 2026-11-05: "for nova, visually halve the opacity of the middle ring, and quarter opacity of the outermost"; glcStroke's GLC_GLOW_K); the ring itself as it was
const GRV_NOVA_A = 0.9, GRV_NOVA_W = 0.025 /* much THINNER (owner, 2026-10-17; was 0.08) */, GRV_NOVA_WHITE = 0.2; // a THIN line, only 20% of the way to white (owner, 2026-10-15; was 0.45 thick, all the way)
// a colour between two "rgb(r, g, b)" palette strings, f 0..1
function mixRgb(a, b, f) {
  const p = s => (String(s).match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number), A = p(a), B = p(b);
  return "rgb(" + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * f)).join(", ") + ")";
}
const GRV_RING_S = 1.2; // s between the aura's range rings (drawSphere)
// a sphere's numbers are ORDINARY damage numbers, FLYING OFF THE ENEMY hit, away from the hole (owner, 2026-10-16: "damage
// numbers coming from rads should be shown flying off of the enemy (all damage numbers should) instead of coming out of the bh")
// the aura band's peak, mid-radius (owner: "clear, 30%, clear") - EVERY aura at GRV_AURA_A, and where auras OVERLAP at most GRV_AURA_CAP
// together (owner, 2026-10-22: "max opacity should be 50%", "individual auras should always be at 30 / just cap overlap"): the overlapping
// ones are laid on a scratch layer at A / CAP each and that layer on the board at CAP - one alone is A, stacked they near CAP, never past it
// ...and an aura's own opacity grows with its SIZE (owner, 2026-10-22: "correlate opacity with size, so that opacity stays the same after merge"):
// k base auras' area (radius^2 / area a mass, never under 1) shows as k of them stacked would - CAP (1 - (1 - A / CAP)^k): a merge keeps the look
const GRV_AURA_A = 0.3, GRV_AURA_CAP = 0.5; // BACK to 0.3 / 0.5 (owner, 2026-10-26: "void still has no aura" - the aura is a ring x1.4-2 the void since 2026-10-25, a third as wide as when 0.1 / 0.17 read fine); were a third of these (owner, 2026-10-24: x0.1 first - 0.03 / 0.05 read as no aura at all, "wait the whole aura is gone")
const grvAuraAlpha = (sp, ar) => GRV_AURA_CAP * (1 - Math.pow(1 - GRV_AURA_A / GRV_AURA_CAP, Math.max(1, ar * ar / Math.max(1e-6, sp.apm || ar * ar))));
let grvAuraCv = null;
// THE BANDS RUN OVER THE VISIBLE RING (owner, 2026-10-26: "GRV aura not visible"): from the void's black core (inner) out to the aura's
// edge - they sat at 15-66% of the whole radius, all under the core since the aura shrank to x1.4-2 the void (2026-10-25)
function grvAura(x, sp, ar, a, inner = 0) { // one aura's gradient disc on context x at alpha a
  const g = x.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, ar), c = Math.min(0.95, Math.max(0, inner / ar));
  g.addColorStop(0, "transparent"); if (c > 0) g.addColorStop(c, "transparent"); for (const [f, k] of GRV_BANDS) g.addColorStop(c + f * (1 - c), COL[k]); g.addColorStop(1, "transparent");
  x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(sp.x, sp.y, ar, 0, 6.283); x.fill();
}
function grvAurasCapped(list) { // [[sp, ar]] that overlap: through the scratch layer, under the board's own transform
  const real = ctx.canvas.getContext("2d"), m = real.getTransform(), c = grvAuraCv ||= document.createElement("canvas");
  if (c.width !== real.canvas.width || c.height !== real.canvas.height) { c.width = real.canvas.width; c.height = real.canvas.height; }
  const x = c.getContext("2d"); if (!x) return false;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, c.width, c.height); x.setTransform(m);
  for (const [sp, ar, inner] of list) grvAura(x, sp, ar, grvAuraAlpha(sp, ar) / GRV_AURA_CAP, inner);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = GRV_AURA_CAP; ctx.drawImage(c, 0, 0); ctx.restore();
  return true;
}
const GRV_RING_OUT = 0.5; // the reach rings run out to half the aura (drawSphere)
// ---------- the look: yellow front, the aura's gradient band, the black sphere, the inward numbers ----------
function drawGrv() {
  const now = performance.now() / 1000, all = [];
  for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) all.push([sp, st, grvCoreR(grvAuraNow(sp, st)) * st.accR]);
  }
  const over = all.filter(([sp, st, ar]) => ar > 1 && st.auraOn && all.some(([q, qs, qr]) => q !== sp && qr > 1 && qs.auraOn && Math.hypot(q.x - sp.x, q.y - sp.y) < ar + qr));
  const capped = over.length > 1 && grvAurasCapped(over.map(([sp, st, ar]) => [sp, ar, ar / st.accR])); // (the lone ones are drawn by drawSphere, at A)
  for (const [sp, st] of all) drawSphere(sp, st, !(capped && over.some(o => o[0] === sp)));
  drawGrvPellets();
  ctx.globalAlpha = 1;
}
function drawSphere(sp, st, auraOwn = true) {
  const k = grvMassK(sp), ar = grvCoreR(grvAuraNow(sp, st)) * st.accR; // the AURA's reach (Gravity Well): x the void's own radius, x2 at most
  if (ar > 1 && st.auraOn) { // the aura: clear at the sphere, its alpha (grvAuraAlpha) at mid-radius, clear at the edge (auraOwn false: drawn capped with its overlaps - drawGrv)
    if (auraOwn) grvAura(ctx, sp, ar, grvAuraAlpha(sp, ar), ar / st.accR);
    // its REACH, shown like Permafrost's rings (owner, 2026-10-16: "for bh aura, show range of aura using a range indicator similar to
    // permafrost"): a thin glowing ring out from the centre to the edge every GRV_RING_S, fading as it goes
    const f = (sp.age % GRV_RING_S) / GRV_RING_S;
    ctx.strokeStyle = COL.violet; ctx.lineWidth = 1.5; ctx.shadowColor = COL.violet; ctx.shadowBlur = 12 * cam.k;
    // ...CONDENSED to the inner half, fading fast (owner, 2026-10-22: "condense glow rings to halfway out and fade opacity faster towards edge /
    // thinking ~0 around halfway out / (only visual)"): out to GRV_RING_OUT of the reach, its alpha (1 - f)^2 - ~0 by then (was to the edge, x 1 - 0.6 f)
    ctx.globalAlpha = 0.45 * (1 - f) ** 2; ctx.beginPath(); ctx.arc(sp.x, sp.y, ar * GRV_RING_OUT * f, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
  }
  if (sp.age < novaEnd(sp)) { // the NOVA: a thick ring collapsing INWARD, accelerating, GRV purple slowly turning white (owner)
    const p = Math.min(1, novaLocal(sp)[1] / GRV_FRONT_T), r = grvNovaR(sp, st), w = Math.min(r, st.novaR * GRV_NOVA_W);
    if (r > 0.5) {
      // BRIGHTER as it closes on the centre (owner, 2026-10-17: "make GRV nova rings much thinner, however, they should get brighter as
      // they approach the center"): fainter far out, whiter and glowing as it collapses
      ctx.globalAlpha = Math.min(1, GRV_NOVA_A * (0.45 + 0.65 * p)); ctx.strokeStyle = mixRgb(COL.violet, COL.bhwhite, GRV_NOVA_WHITE + 0.6 * p ** 2); ctx.lineWidth = Math.max(1, w); // (a solid stroke: the 3D board takes no gradient stroke)
      ctx.shadowColor = COL.violet; ctx.shadowBlur = 14 * cam.k * p;
      const ring = () => { ctx.beginPath(); ctx.arc(sp.nova ? sp.nova.x : sp.x, sp.nova ? sp.nova.y : sp.y, r - w / 2, 0, 6.283); ctx.stroke(); };
      const ringK = () => { if (typeof GLC_GLOW_K === "undefined") return ring(); GLC_GLOW_K = GRV_NOVA_GLOW; try { ring(); } finally { GLC_GLOW_K = null; } }; // its glow's middle ring x0.5, outer x0.25 (GRV_NOVA_GLOW)
      if (typeof fxGlSkyOff === "function") fxGlSkyOff(ringK); else ringK(); ctx.shadowBlur = 0; // (always inverted on the boss sky: it whitens as it closes - aspira-fxgl.js)
    }
  }


}
// the CENTRE and its ACCRETION DISK - black in a yellow ring and a thin pink rim (the image's core), as big as its aura is (it
// grows and shrinks with it). ABOVE the damage numbers (owner, 2026-10-15): in 2D the board draws them first; in 3D the pop-up
// pass calls drawGrvCores after them, `at` placing each at its spot like a number
// pass: 0 the pink rim, 1 the yellow ring, 2 the BLACK - each pass for EVERY sphere before the next (drawGrvCores), so two disks that
// overlap join into one, the dark of each over all the rings (owner, 2026-10-16: "accretion disks should connect, not be drawn over
// another black hole", "the dark part needs to be drawn over all accretion disk layers")
function drawGrvCore(sp, st, pass) {
  if (sp.age < novaEnd(sp) || !st.hole) return; // (the nova first - the centre appears once it is gone; no centre without Void - tier redesign)
  const r = grvCoreR(grvAuraNow(sp, st)); // LOGARITHMIC in its aura (owner, 2026-10-16: "make the center sphere of a bh increase logarithmically visually instead of linearly"; was 0.16 x the aura + 2 root mass); shrinks with its mass, to nothing
  if (r < 0.3) return;
  ctx.globalAlpha = 1; ctx.beginPath();
  if (pass === 0) { ctx.strokeStyle = COL.bhpink; ctx.lineWidth = 1; ctx.arc(sp.x, sp.y, r + Math.min(2, r), 0, 6.283); ctx.stroke(); }
  else if (pass === 1) { ctx.strokeStyle = COL.yellow; ctx.lineWidth = 2; ctx.arc(sp.x, sp.y, r, 0, 6.283); ctx.stroke(); }
  else { ctx.fillStyle = "#000"; ctx.arc(sp.x, sp.y, Math.max(0, r - 1), 0, 6.283); ctx.fill(); } /* r - 1: the yellow ring's outer half stays */
}
function drawGrvCores(at) {
  for (let pass = 0; pass < 3; pass++) for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) at(sp.x, sp.y, () => drawGrvCore(sp, st, pass));
  }
}
