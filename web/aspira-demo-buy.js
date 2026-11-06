// /spire - THE BUY CARD'S DEMO (owner, 2026-11-06: "for buy tower cards add an i information button like the one on the tower cards, except top right,
// and more visible / On click, randomly allocate 5 points on that tower randomly, then show the demo video for that tower within the buy card bounds /
// while demo is playing, a click anywhere on the screen closes the demo"): each build card gets an "i" (top right); a tap builds a demo of that
// kind with BUY_DEMO_PTS points spread at random over its axes (one tier a point, at most one capstone - the purchase rules), and plays the tower
// card's scene (demoScene / demoFrame / demoDraw3d, aspira-demo.js) in a panel over the cards (buyDemoOpen) on its own animation frames - paused or not.
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
// THE PANEL (owner, 2026-11-06: "for the build menu demo box / vertically stack the demo over triangle / center them over a matching tower buy button
// styled card that is the width of 2 buildcards + gap, / expand demo to meet either pair of edges of the card (with a little bit of padding) / add a close
// button underneath, but clicking anywhere will close demo / ensure all demos have a black background"; "also all demos should have rounded corners"):
// a card in the tower's own look, two cards and their gap wide, centred over the cards; inside, the demo (its box's shape, as wide as the panel less
// BUY_PAD each side), the build's triangle under it, then "close"
const BUY_PAD = 8, BUY_TRI_W = 150; // (BUY_PAD: the panel's padding, --space-2-5)
function buyDemoOpen(card, kind, ci) {
  buyDemoClose(); buyDemo.seed ^= Math.round(performance.now() * 1000) | 0;
  const row = card.parentElement, rr = row.getBoundingClientRect(), cr = card.getBoundingClientRect(), gap = parseFloat(getComputedStyle(row).columnGap) || 8;
  const pw = Math.min(window.innerWidth - 2 * BUY_PAD, 2 * cr.width + gap), cw = pw - 2 * BUY_PAD, ch = cw / DEMO_BOX_AR;
  const box = document.createElement("div"); box.className = "asp-buy-panel"; box.dataset.kind = kind; box.style.width = pw + "px";
  const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); cv.className = "asp-buy-cv"; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); box.appendChild(cv);
  const sk = buyDemoSkills(kind), t = { kind, skills: sk, cell: ci, id: -1 }, lay = demoLayoutKey(t, null), L = DEMO_LAYOUTS[kind] && (DEMO_LAYOUTS[kind][lay] || DEMO_LAYOUTS[kind].base);
  if (!L) return;
  if (typeof triSvg === "function") { const tri = document.createElement("div"); tri.className = "asp-buy-tri"; tri.style.width = Math.min(BUY_TRI_W, cw) + "px"; tri.innerHTML = triSvg(kind, sk); box.appendChild(tri); }
  const close = document.createElement("button"); close.type = "button"; close.className = "asp-buy-close"; close.textContent = "close"; box.appendChild(close); // (any tap closes it - buyDemoSwallow - this one too)
  (document.getElementById("asp") || document.body).appendChild(box);
  const bh = box.getBoundingClientRect().height, vh = window.innerHeight; // centred over the cards, kept on screen
  box.style.left = Math.max(BUY_PAD, rr.left + rr.width / 2 - pw / 2) + "px"; box.style.top = Math.max(BUY_PAD, Math.min(vh - BUY_PAD - bh, rr.top + rr.height / 2 - bh / 2)) + "px";
  buyDemo.S = demoScene(kind, sk, ci, demoPlace(kind, towerStats(t), ci, L)); buyDemo.cv = cv; buyDemo.c2 = cv.getContext("2d"); buyDemo.view = demoView3d(buyDemo.S, cv.width, cv.height); buyDemo.box = box;
  setTimeout(() => { document.addEventListener("pointerdown", buyDemoSwallow, true); document.addEventListener("click", buyDemoSwallow, true); }, 0); // (not the tap that opened it)
  buyDemo.last = performance.now(); buyDemo.raf = requestAnimationFrame(buyDemoTick);
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
  if (buyDemo.box) buyDemo.box.remove();
  Object.assign(buyDemo, { S: null, cv: null, c2: null, view: null, raf: 0, box: null });
}
