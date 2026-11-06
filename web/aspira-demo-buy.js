// /spire - THE BUY CARD'S DEMO (owner, 2026-11-06: "for buy tower cards add an i information button like the one on the tower cards, except top right,
// and more visible / On click, randomly allocate 5 points on that tower randomly, then show the demo video for that tower within the buy card bounds /
// while demo is playing, a click anywhere on the screen closes the demo"): each build card gets an "i" (top right); a tap builds a demo of that
// kind with BUY_DEMO_PTS points spread at random over its axes (one tier a point, at most one capstone - the purchase rules), and plays the tower
// card's scene (demoScene / demoFrame / demoDraw3d, aspira-demo.js) over the card on its own canvas and its own animation frames - paused or not.
// Any tap then closes it and is swallowed (nothing bought, no other control). UI only: a UI-side PRNG (never Math.random), no game state touched.
// Loaded after aspira-demo-card.js; openBuildChooser (aspira-chooser.js) calls buyDemoButtons.
const BUY_DEMO_PTS = 5;
const buyDemo = { S: null, cv: null, c2: null, view: null, raf: 0, last: 0, seed: 0x9e3779b9 };
function buyDemoRand() { // mulberry32 on its own seed
  let t = (buyDemo.seed = (buyDemo.seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function buyDemoSkills(kind) { // BUY_DEMO_PTS tiers spread at random; an axis full (V) or a second capstone is passed over
  const axes = (SKILL_TREES[kind] || []).map(a => a.id), sk = {}; if (!axes.length) return sk;
  for (let n = 0, tries = 0; n < BUY_DEMO_PTS && tries < 100; tries++) {
    const id = axes[Math.floor(buyDemoRand() * axes.length)], v = sk[id] || 0, cap = axes.some(a => (sk[a] || 0) >= CAPSTONE_TIER);
    if (v >= SKILL_TIERS || (v + 1 >= CAPSTONE_TIER && cap)) continue;
    sk[id] = v + 1; n++;
  }
  return sk;
}
function buyDemoButtons(row, ci) {
  for (const c of row.querySelectorAll(".asp-card")) {
    const k = c.dataset.kind; if (!k) continue;
    const b = document.createElement("button"); b.type = "button"; b.className = "asp-buy-i"; b.textContent = "i"; b.setAttribute("aria-label", "Show a demo of " + TOWERS[k].name);
    const go = ev => { ev.stopPropagation(); ev.preventDefault(); buyDemoOpen(c, k, ci); };
    b.addEventListener("pointerdown", ev => { ev.stopPropagation(); }); b.addEventListener("click", go);
    c.appendChild(b);
  }
}
function buyDemoOpen(card, kind, ci) {
  buyDemoClose(); buyDemo.seed ^= Math.round(performance.now() * 1000) | 0;
  const r = card.getBoundingClientRect(), box = document.createElement("div"); box.className = "asp-buy-demo";
  Object.assign(box.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); box.appendChild(cv);
  (document.getElementById("asp") || document.body).appendChild(box);
  const sk = buyDemoSkills(kind), t = { kind, skills: sk, cell: ci, id: -1 }, lay = demoLayoutKey(t, null), L = DEMO_LAYOUTS[kind] && (DEMO_LAYOUTS[kind][lay] || DEMO_LAYOUTS[kind].base);
  if (!L) { box.remove(); return; }
  buyDemo.S = demoScene(kind, sk, ci, demoPlace(kind, towerStats(t), ci, L)); buyDemo.cv = cv; buyDemo.c2 = cv.getContext("2d"); buyDemo.view = demoView3d(buyDemo.S, cv.width, cv.height); buyDemo.box = box;
  setTimeout(() => { document.addEventListener("pointerdown", buyDemoSwallow, true); document.addEventListener("click", buyDemoSwallow, true); }, 0); // (not the tap that opened it)
  buyDemoTri(kind, sk, r);
  buyDemo.last = performance.now(); buyDemo.raf = requestAnimationFrame(buyDemoTick);
}
// THE BUILD'S TRIANGLE BESIDE IT (owner, 2026-11-06: "when showing the demo, show the upgrade triangle that was randomly allocated to the tower on an
// adjacent side of the demo, wherever there is space, and it can be most centered"): the side (right, left, below, above) where a BUY_TRI_W chart fits
// and sits most centred on the card; none fits: the roomiest side, the chart shrunk to it. Inside #asp (its colour tokens)
const BUY_TRI_W = 150, BUY_TRI_AR = 97 / 120, BUY_TRI_PAD = 8;
function buyDemoTri(kind, sk, r) {
  if (typeof triSvg !== "function") return;
  const vw = window.innerWidth, vh = window.innerHeight, P = BUY_TRI_PAD, room = { right: vw - r.right - 2 * P, left: r.left - 2 * P, below: vh - r.bottom - 2 * P, above: r.top - 2 * P };
  const fitW = side => (side === "right" || side === "left" ? Math.min(BUY_TRI_W, room[side], (vh - 2 * P) / BUY_TRI_AR) : Math.min(BUY_TRI_W, room[side] / BUY_TRI_AR, vw - 2 * P));
  const place = (side, w) => { const h = w * BUY_TRI_AR, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const x = side === "right" ? r.right + P : side === "left" ? r.left - P - w : Math.max(P, Math.min(vw - P - w, cx - w / 2));
    const y = side === "below" ? r.bottom + P : side === "above" ? r.top - P - h : Math.max(P, Math.min(vh - P - h, cy - h / 2));
    return { x, y, w, h, off: side === "right" || side === "left" ? Math.abs(y + h / 2 - cy) : Math.abs(x + w / 2 - cx) }; };
  const sides = ["right", "left", "below", "above"], fits = sides.filter(s => fitW(s) >= BUY_TRI_W).map(s => place(s, BUY_TRI_W));
  const at = fits.length ? fits.reduce((a, b) => (b.off < a.off ? b : a)) : (s => place(s, Math.max(40, fitW(s))))(sides.reduce((a, b) => (fitW(b) > fitW(a) ? b : a)));
  const el = document.createElement("div"); el.className = "asp-buy-tri"; el.dataset.kind = kind; el.innerHTML = triSvg(kind, sk);
  Object.assign(el.style, { left: at.x + "px", top: at.y + "px", width: at.w + "px" }); (document.getElementById("asp") || document.body).appendChild(el); buyDemo.tri = el;
}
function buyDemoTick(now) {
  if (!buyDemo.S) return;
  const dt = Math.min(0.05, Math.max(0, (now - buyDemo.last) / 1000)); buyDemo.last = now;
  try { demoFrame(buyDemo.S, buyDemo.c2, buyDemo.view, demoDraw3d, dt, BASE_SPEED); } catch (err) { if (typeof console !== "undefined") console.error("buy demo", err); buyDemoClose(); return; }
  buyDemo.raf = requestAnimationFrame(buyDemoTick);
}
function buyDemoSwallow(ev) { ev.stopPropagation(); ev.preventDefault(); if (ev.type === "click") buyDemoClose(); } // EVERY tap closes it, and does nothing else
function buyDemoClose() {
  if (buyDemo.raf) cancelAnimationFrame(buyDemo.raf);
  document.removeEventListener("pointerdown", buyDemoSwallow, true); document.removeEventListener("click", buyDemoSwallow, true);
  if (buyDemo.box) buyDemo.box.remove(); if (buyDemo.tri) buyDemo.tri.remove();
  Object.assign(buyDemo, { S: null, cv: null, c2: null, view: null, raf: 0, box: null, tri: null });
}
