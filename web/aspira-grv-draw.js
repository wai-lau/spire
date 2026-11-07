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
const GRV_BANDS = [[0, "white"], [0.12, "violet"], [0.4, "violet"], [0.66, "bhplum"], [0.86, "violet"]]; /* + a soft violet glow toward the edge (owner, 2026-11-06: "can't actually see WELL very much / add a faint glow?") - one gradient, no steps */ /* NO DARK GAP (owner, 2026-11-06: "make the black gap around void white, or at least very light purple"): white right at the core's edge, into violet */ /* THE TOWER'S COLOURS (owner, 2026-11-06: "for GRV, update the void attack to use the same colors as the ones used by the tower now"): violet into plum, then clear; was white-hot, yellow, coral, pink, plum */ // the outermost band CLEAR, not the near-black deep purple (owner, 2026-10-24: "GRV BH outermost color should be transparent, not black"; was [0.86, "bhdeep"])
// the NOVA: a thick ring (GRV_NOVA_W of its reach), GRV purple turning white as it collapses (owner, 2026-10-15; it was a red /
// orange / yellow ring going OUT for an hour)
const GRV_NOVA_LOOK_A = 0.5; // the WHOLE nova - ring and glow - at half (owner, 2026-11-05: "Halve opacity of all gr novas"), on top of GRV_NOVA_GLOW
const GRV_NOVA_GLOW = [0.25, 0.5]; // the 3D glow's [outer, middle] ring alpha x this (owner, 2026-11-05: "for nova, visually halve the opacity of the middle ring, and quarter opacity of the outermost"; glcStroke's GLC_GLOW_K); the ring itself as it was
const GRV_NOVA_A = 0.9, GRV_NOVA_W = 0.025 /* much THINNER (owner, 2026-10-17; was 0.08) */, GRV_NOVA_WHITE = 0.2; // a THIN line, only 20% of the way to white (owner, 2026-10-15; was 0.45 thick, all the way)
// a colour between two "rgb(r, g, b)" palette strings, f 0..1
function mixRgb(a, b, f) {
  const p = s => (String(s).match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number), A = p(a), B = p(b);
  return "rgb(" + [0, 1, 2].map(i => Math.round(A[i] + (B[i] - A[i]) * f)).join(", ") + ")";
}
const GRV_SUPER_W = 1.8, GRV_SUPER_WHITE = 0.3, GRV_SUPER_GLOW = 26, GRV_SUPER_FLASH = 40; // Nova V's double ring (Hypernova): thicker, whiter, a bigger glow than a single nova's
const GRV_REEL_Q = 1.5, GRV_EH_RING = [1.35, 0.35, 0.65]; // Undertow: a reeling enemy's chain x thicker; Event Horizon: the accretion ring's radius (x the core), its alpha floor, its alpha gain per kill share
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
// THE WELL'S CHAINS (owner, 2026-11-06: "when WELL acting on something, show a purple chain, bigger the slow/pull, thicker the chain"): from the void to every
// enemy its Gravity Well aura is slowing now (its "grv:<tower>" slow, live - applySlow), the nearest of the tower's voids that reaches it, as the CRR tether's
// chain in GRV violet, its links GRV_CHAIN_Q[0] .. [1] x ARC's by that slow's share of the cap (TOWER_SLOW_MAX). 3D: one GPU capsule a link (fxGlChain); 2D: drawChain2D.
// On the moving layer: the void (drawGrvCores, the pop pass) is drawn OVER them (owner: "make sure the void renders over the chain")
const GRV_CHAIN_Q = [0.3, 1.4], GRV_CHAIN_A = 0.8;
function drawGrvChains(all) {
  const gl3 = !!(ctx && ctx.real && typeof fxGl !== "undefined" && fxGl.on && typeof fxGlChain === "function");
  if (!gl3 && typeof drawChain2D !== "function") return;
  for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres || !t.spheres.length || skillOf(t, "radiation") < CAPSTONE_TIER) continue; // Gravity Well V only (owner, 2026-11-06: "actually, only show chains for WELL 5")
    const tag = "grv:" + t.id, mine = all.filter(([sp, st, ar]) => st.auraOn && ar > 1 && t.spheres.includes(sp)); if (!mine.length) continue;
    for (const e of G.enemies) {
      const d = !e.dead && e.slows && e.slows[tag]; if (!d || !(d.t > 0) || !(d.v > 0)) continue;
      let best = null, bd = Infinity; for (const m of mine) { const dd = Math.hypot(e.x - m[0].x, e.y - m[0].y); if (dd < m[2] && dd < bd) { bd = dd; best = m[0]; } } if (!best) continue;
      const reel = e.reelT > 0 ? 1 + (GRV_REEL_Q - 1) * e.reelT / GRV_REEL_T : 1; // a chain being reeled in: thicker, pulling taut as the enemy comes
      const q = (GRV_CHAIN_Q[0] + (GRV_CHAIN_Q[1] - GRV_CHAIN_Q[0]) * Math.min(1, d.v / TOWER_SLOW_MAX)) * reel;
      if (gl3) fxGlChain({ x1: best.x, y1: best.y, x2: e.x, y2: e.y, color: "violet", thin: q }, GRV_CHAIN_A);
      else { ctx.globalAlpha = GRV_CHAIN_A; drawChain2D(best.x, best.y, e.x, e.y, (x, y) => ({ x, y }), 1, COL.violet, q); }
    }
  }
  ctx.globalAlpha = 1;
}
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
  drawGrvChains(all);
  drawGrvPellets();
  ctx.globalAlpha = 1;
}
// HYPERNOVA'S SECOND RING, a white FLASH (Wai 2026-11-07: "bigger whiter flash"; Leader: it read as a thick grey band): pure white at full alpha from its start,
// a GRV_SUPER_FLASH white glow (at least half of it from the start); the first ring keeps the double nova's look (GRV_SUPER_*).
// IN THE CARD BOX (Leader, 2026-11-07): a demo scene (demoDrawing) scales a nova's drawn rings so its widest one (x GRV_SUPER_R on a double) stays inside the
// canvas from its centre - both rings by one factor, so the second still reads 1.5x the first. Draw only; the board never scales
const GRV_FIT_PAD = 1.1; // room for the ring's half width and glow, x the reach
function grvNovaFit(sp, st) {
  if (typeof demoDrawing === "undefined" || !demoDrawing) return 1;
  const m = ctx.getTransform(), cx = sp.nova ? sp.nova.x : sp.x, cy = sp.nova ? sp.nova.y : sp.y, px = m.a * cx + m.c * cy + m.e, py = m.b * cx + m.d * cy + m.f;
  const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d), W = ctx.canvas.width, H = ctx.canvas.height;
  const room = Math.max(0, Math.min(px / sx, (W - px) / sx, py / sy, (H - py) / sy)), reach = st.novaR * (sp.nN > 1 ? GRV_SUPER_R : 1) * GRV_FIT_PAD;
  return reach > room ? room / reach : 1;
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
    const fit = grvNovaFit(sp, st), p = Math.min(1, novaLocal(sp)[1] / GRV_NOVA_T), r = grvNovaR(sp, st) * fit, dbl = sp.nN > 1, two = dbl && novaLocal(sp)[0] > 0, w = Math.min(r, grvNovaReach(sp, st) * fit * GRV_NOVA_W * (dbl ? GRV_SUPER_W : 1));
    if (r > 0.5) {
      // BRIGHTER as it closes on the centre (owner, 2026-10-17: "make GRV nova rings much thinner, however, they should get brighter as
      // they approach the center"): fainter far out, whiter and glowing as it collapses
      ctx.globalAlpha = GRV_NOVA_LOOK_A * Math.min(1, GRV_NOVA_A * (two ? 1 : 0.45 + 0.65 * p)); /* GRV_NOVA_LOOK_A: the whole nova, its glow too (glcStroke reads this alpha) */ ctx.strokeStyle = mixRgb(COL.violet, COL.bhwhite, two ? 1 : Math.min(1, GRV_NOVA_WHITE + 0.6 * p ** 2 + (dbl ? GRV_SUPER_WHITE : 0))); ctx.lineWidth = Math.max(1, w); // (a solid stroke: the 3D board takes no gradient stroke)
      ctx.shadowColor = dbl ? COL.white : COL.violet; ctx.shadowBlur = (two ? GRV_SUPER_FLASH : dbl ? GRV_SUPER_GLOW : 14) * cam.k * (two ? Math.max(0.5, p) : p);
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
// the HALO: a smooth radial fade in GRV violet to nothing at 2.4 r (owner, 2026-11-06: "never use step glow unless huge perf gains") - IFR's cached
// unit fade (ifrFadeGrad, aspira-ifrit-draw.js: (1 - t)^3 from the centre, one gradient a colour, made once) scaled to it; the black core covers its middle
const GRV_RIM_GLOW = 0.5; // the rim's white glow, x the orb's radius (screen px through the transform)
function grvHalo(x, y, r1) {
  if (typeof ifrFadeGrad !== "function") return;
  ctx.save(); ctx.translate(x, y); ctx.scale(r1, r1); ctx.fillStyle = ifrFadeGrad(COL.violet); ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.283); ctx.fill(); ctx.restore();
}
function drawGrvCore(sp, st, pass) {
  if (sp.age < novaEnd(sp) || !st.hole) return; // (the nova first - the centre appears once it is gone; no centre without Void - tier redesign)
  const r = grvCoreR(grvAuraNow(sp, st)); // LOGARITHMIC in its aura (owner, 2026-10-16: "make the center sphere of a bh increase logarithmically visually instead of linearly"; was 0.16 x the aura + 2 root mass); shrinks with its mass, to nothing
  if (r < 0.3) return;
  ctx.globalAlpha = 1; ctx.beginPath();
  // THE BODY'S COLOURS (owner, 2026-11-06: "for GRV, update the void attack to use the same colors as the ones used by the tower now"; "don't have that
  // reflective arc on the sphere, black holes don't reflect"): a soft violet halo (a smooth radial fade, no steps), a violet rim, a black core - as drawGrvBody's orb
  if (pass === 0) grvHalo(sp.x, sp.y, 2.4 * r);
  else if (pass === 1) {
    if (st.eh && sp.evK > 1) { // EVENT HORIZON's accretion ring: brighter per kill (its growth share), a flash on the kill, dimming as the growth fades
      const g = (grvEvK(sp) - 1) / (GRV_EH_MAX - 1), fl = Math.max(0, 1 - (sp.age - sp.evAt) / 0.3), m0 = ctx.getTransform();
      ctx.globalAlpha = Math.min(1, GRV_EH_RING[1] * g + GRV_EH_RING[2] * g * g + 0.5 * fl) * (g > 0 ? 1 : 0); ctx.shadowColor = COL.white; ctx.shadowBlur = (2 + 6 * fl) * r * Math.hypot(m0.a, m0.b) * 0.3;
      ctx.strokeStyle = mixRgb(COL.violet, COL.white, Math.min(1, g + fl * 0.5)); ctx.lineWidth = Math.min(3, 0.18 * r + 0.8); ctx.beginPath(); ctx.arc(sp.x, sp.y, r * GRV_EH_RING[0], 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.beginPath();
    }
    const m = ctx.getTransform(); ctx.shadowColor = COL.white; ctx.shadowBlur = GRV_RIM_GLOW * r * Math.hypot(m.a, m.b); ctx.strokeStyle = COL.violet; ctx.lineWidth = Math.min(1.5, 0.15 * r + 0.5); ctx.arc(sp.x, sp.y, r, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0; } // the rim lit white just outside it - no dark band before the halo
  else { ctx.fillStyle = COL.bg; ctx.arc(sp.x, sp.y, Math.max(0, r - 0.5), 0, 6.283); ctx.fill(); } /* r - 0.5: the rim's outer half stays */
}
function drawGrvCores(at) {
  for (let pass = 0; pass < 3; pass++) for (const t of G.towers) {
    if (t.kind !== "grv" || !t.spheres) continue;
    const st = towerStats(t, true);
    for (const sp of t.spheres) at(sp.x, sp.y, () => drawGrvCore(sp, st, pass));
  }
}
// ---------- THE BODY SHOWS THE BUILD (owner, 2026-11-06, the approved mockup: "GRV is good, but move the orb a bit higher off the top of the
// tower", then "also move the ball another 5u up"; "on GRV, the tracers on gravity well, their tracers should be split into 3 sections to make it look
// smoother") - over the prism's top, in screen-upright units (a sphere stays round; the rings lie in the board's tilt):
// VOID a black orb with a violet rim and a soft halo (no glint), GRB_GAP x the hex radius clear of the top, its radius GRB_ORB_R a Void tier (V = 2x I);
// NOVA a thin ring round it, contracting onto it every GRB_NOVA_T s, brighter and thicker a tier; GRAVITY WELL GRB_WELL_N debris spiralling in,
// each with a 3-segment trail along its spiral. Back halves before the orb, front halves after. Nova or Well with Void 0: a Void I orb. Look only
const GRB_GAP = (29 - 40 * 0.58) / 40, GRB_ORB_R = [0, 7.5, 9, 10.8, 12.8, 15].map(r => r / 40), GRB_NOVA_T = 2, GRB_WELL_T = 3.2;
const GRB_NOVA_A = [0, 0.5, 0.6, 0.72, 0.86, 1], GRB_NOVA_W = [0, 0.9, 1.2, 1.5, 1.9, 2.4].map(w => w / 40), GRB_WELL_N = [0, 6, 10, 14, 18, 24]; // (Well: owner, 2026-11-06 "double the number of particles and add size jitter"; was 3 5 7 9 12)
// each particle's dot x 0.5..1.6 (hashed per tower and particle - no Math.random; the trails one width, batched); drawn in GRB_BANDS alpha bands
const GRB_BANDS = 5, GRB_SEGS = Array.from({ length: GRB_BANDS }, () => []), GRB_DOTS = Array.from({ length: GRB_BANDS }, () => []);
const grbHash = (a, b) => { const v = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return v - Math.floor(v); };
function drawGrvBody(t, x, y, top, R) { // top: the prism top's height (warpFrame units); R: the hex radius (world u)
  const v = skillOf(t, "void"), nv = skillOf(t, "supernova"), wl = skillOf(t, "radiation"), vt = v || (nv || wl ? 1 : 0); if (!vt) return;
  const F = warpFrame(x, y, top), k = Math.hypot(F[0], F[1]), sq = Math.hypot(F[2], F[3]) / k, r = GRB_ORB_R[vt] * R, oy = -(sq * R + GRB_GAP * R + r), now = performance.now() / 1000;
  ctx.setTransform(k, 0, 0, k, F[0] * x + F[2] * y + F[4], F[1] * x + F[3] * y + F[5] + oy * k); // (screen-upright, centred on the orb)
  const col = COL.violet;
  const nova = front => { // the ring: contracting from 3.3 r to 1.25 r, fading in and out
    const p = (now / GRB_NOVA_T) % 1, rho = r * (3.3 - 2.05 * p), env = Math.min(p / 0.15, 1) * Math.min((1 - p) / 0.22, 1), a = GRB_NOVA_A[nv] * env, w = GRB_NOVA_W[nv] * R;
    ctx.save(); ctx.scale(1, sq); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0, rho, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI);
    ctx.restore(); // (the path keeps its squash; the strokes stay round)
    ctx.shadowColor = col; ctx.shadowBlur = 3.2 * w * k; // a smooth glow (was a wide faint stroke under the core - owner, 2026-11-06: "never use step glow")
    ctx.strokeStyle = COL.white; ctx.globalAlpha = 0.85 * a; ctx.lineWidth = w; ctx.stroke(); ctx.shadowBlur = 0;
  };
  const well = front => { // the debris: spiralling in from 4 r, a 3-segment trail behind each, fading with distance from the orb; ONE path an alpha band
    const n = GRB_WELL_N[wl], at = (k, p) => { const th = k * 2.4 - 2 * Math.PI * 1.4 * p, rho = r * (4 - 3 * p ** 1.1); return [rho * Math.cos(th), rho * sq * Math.sin(th), Math.sin(th), rho]; };
    const band = a => Math.min(GRB_BANDS - 1, Math.floor(a * GRB_BANDS)), segs = GRB_SEGS, dots = GRB_DOTS;
    for (let b = 0; b < GRB_BANDS; b++) { segs[b].length = 0; dots[b].length = 0; }
    for (let k = 0; k < n; k++) {
      const p = (now / GRB_WELL_T + k / n) % 1, q = at(k, p); if ((q[2] > 0) !== front) continue;
      const al = Math.min(p / 0.1, 1) * Math.min((1 - p) / 0.1, 1), j = 0.5 + 1.1 * grbHash(t.id || 0, k);
      let w0 = at(k, Math.max(0, p - 0.05));
      for (const d of [0.0333, 0.0167, 0]) { // three sections, each faded by its middle's distance from the orb (owner, 2026-11-06: "tracers should become lower and lower in opacity further away from the ball")
        const w1 = d ? at(k, Math.max(0, p - d)) : q, f = Math.max(0, Math.min(1, 1 - ((w0[3] + w1[3]) / 2 - r) / (3 * r))) ** 1.5, a = 0.55 * al * f;
        if (a > 0.004) segs[band(a)].push(w0[0], w0[1], w1[0], w1[1]); w0 = w1;
      }
      const a = al * (0.45 + 0.55 * p); if (a > 0.004) dots[band(a)].push(q[0], q[1], (0.052 - 0.0175 * p) * R * j);
    }
    ctx.lineCap = "round"; ctx.strokeStyle = col; ctx.fillStyle = COL.white;
    for (let b = 0; b < GRB_BANDS; b++) {
      const sg = segs[b], dt = dots[b], a = (b + 0.5) / GRB_BANDS;
      if (sg.length) { ctx.globalAlpha = a; ctx.lineWidth = 0.028 * R; ctx.beginPath(); for (let m = 0; m < sg.length; m += 4) { ctx.moveTo(sg[m], sg[m + 1]); ctx.lineTo(sg[m + 2], sg[m + 3]); } ctx.stroke(); }
      if (dt.length) { ctx.globalAlpha = a; ctx.beginPath(); for (let m = 0; m < dt.length; m += 3) { ctx.moveTo(dt[m] + dt[m + 2], dt[m + 1]); ctx.arc(dt[m], dt[m + 1], dt[m + 2], 0, 2 * Math.PI); } ctx.fill(); }
    }
  };
  if (nv) nova(false); if (wl) well(false);
  ctx.globalAlpha = 1; grvHalo(0, 0, r * 2.4); // the halo (smooth)
  ctx.fillStyle = COL.bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fill();
  ctx.shadowColor = COL.white; ctx.shadowBlur = GRV_RIM_GLOW * r * k; ctx.strokeStyle = col; ctx.lineWidth = 0.035 * R; ctx.stroke(); ctx.shadowBlur = 0; // the rim, lit white just outside (no dark band) (no glint: "black holes don't reflect", owner 2026-11-06)
  if (nv) nova(true); if (wl) well(true);
  ctx.globalAlpha = 1;
}
