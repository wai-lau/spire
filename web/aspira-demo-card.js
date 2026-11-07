// /spire - THE DEMO ON THE TOWER CARD (owner, 2026-11-03: "replace the description text box with a tower attacking a group of immobile
// dummies"; "T2 except the i is bottom right of demo box (within demo box)"; build chooser: "No"; sound: "Real sounds"): the placed tower's
// card shows, where its sentence was, the tower with its build - the PREVIEWED build while points are pulled - in its own small scene
// (aspira-demo.js, the layout from aspira-demo-layouts.js). An "i" in the scene's bottom-right corner flips the box to the sentence (with
// its preview changes marked, skillDesc) and back; the choice holds while the card stays open. The scene runs at 1x play's pace only while
// its canvas is on the page and the tab is visible, and drops when the card closes (demoTick).
const DEMO_ASPECT = 1 / DEMO_BOX_AR; // the box's height over its width (aspira-demo.js)
const demoCard = { key: "", S: null, cv: null, c2: null, view: null, text: false, tid: null };
function demoBox(t, pv) {
  return '<div class="asp-demo' + (demoCard.text ? " is-text" : "") + '"><canvas class="asp-demo-cv" role="img" aria-label="' + TOWERS[t.kind].name + ' attacking practice targets"></canvas>' +
    '<div class="asp-demo-txt">' + skillDesc(t, pv) + "</div>" +
    '<button type="button" class="asp-demo-i" aria-label="Show the description" aria-pressed="' + demoCard.text + '">i</button></div>';
}
// after the box is on the page: size its canvas, keep the scene while the build it shows holds, else build it anew
function demoMount(t, pv) {
  const host = $("asp-desc-box"), box = host && host.querySelector(".asp-demo"); if (!box) return;
  const cv = box.querySelector("canvas"), btn = box.querySelector(".asp-demo-i");
  btn.onclick = ev => { ev.stopPropagation(); demoCard.text = !demoCard.text; box.classList.toggle("is-text", demoCard.text); btn.setAttribute("aria-pressed", String(demoCard.text)); };
  const tw = pv || t, lay = demoLayoutKey(t, pv), key = [t.id, t.kind, t.cell, JSON.stringify(tw.skills || {}), lay].join("|");
  const w = Math.max(120, Math.round(cv.clientWidth || box.clientWidth || 360)), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * DEMO_ASPECT * dpr);
  if (key !== demoCard.key || !demoCard.S) {
    const L = DEMO_LAYOUTS[t.kind] && (DEMO_LAYOUTS[t.kind][lay] || DEMO_LAYOUTS[t.kind].base); if (!L) return;
    demoCard.S = demoScene(t.kind, tw.skills || {}, t.cell, demoPlace(t.kind, towerStats(tw), t.cell, L)); demoCard.S.sound = true; demoCard.key = key;
  }
  demoCard.cv = cv; demoCard.tid = t.id; demoCard.c2 = cv.getContext("2d"); demoCard.S.kMax = demoBoardK(dpr); demoCard.view = demoView3d(demoCard.S, cv.width, cv.height);
}
// every frame (aspira-ui.js frame, its real `dt`, already capped at 0.05 s so a stalled tab takes no huge step): the scene at 1x play
function demoTick(dt = DEMO_DT) {
  const D = demoCard; if (!D.cv) return;
  if (D.cv.isConnected === false || ui.sel !== D.tid) { D.cv = D.c2 = D.S = null; D.key = ""; D.text = false; return; } // the card closed (or redrew without it): the next card opens on its scene
  if (D.text || document.hidden) return;
  try { demoFrame(D.S, D.c2, D.view, demoDraw3d, Math.min(0.05, dt), BASE_SPEED); } catch (err) { D.cv = null; D.S = null; D.key = ""; if (typeof console !== "undefined") console.error("demo scene", err); } // (a broken scene leaves the card, never the game)
}
