// /spire - AUTOSAVE (owner, 2026-10-14: "sure on the autosave" - an iPhone that runs out of memory reloads the page, and a
// run at wave 62 or 120 was gone). The whole game state G is put in IndexedDB as each wave starts (a structured clone: its
// Maps, Sets and shared enemies kept as they are), dropped when the game ends; on a load with a run saved, a card offers to
// resume that wave or start fresh. A resumed run may still sign TOP PLAYERS (owner). Loaded after aspira-ui.js; the
// simulator has no indexedDB, so all of this stands down there.
// RUN_META: the card's few numbers, kept apart from the run (owner, 2026-10-19: the card came up only after the first tower was
// built) - reading the whole run on load took long enough on a phone for a tower to go down first; the run is read on "resume"
const RUN_DB = "spire", RUN_STORE = "run", RUN_KEY = "current", RUN_META = "meta";
// one connection, opened once. WebKit can leave the page's first open hanging: unanswered after RUN_OPEN_RETRY ms, it asks again
// (up to RUN_OPEN_TRIES), the first answer wins and a late one is closed
const RUN_OPEN_RETRY = 300, RUN_OPEN_TRIES = 4;
let runDbP = null;
const runDb = () => runDbP || (runDbP = new Promise((res, rej) => {
  let done = false, n = 0;
  const go = () => {
    const r = indexedDB.open(RUN_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(RUN_STORE);
    r.onsuccess = () => { if (done) r.result.close(); else { done = true; res(r.result); } };
    r.onerror = () => { if (!done) { done = true; rej(r.error); } };
    if (++n < RUN_OPEN_TRIES) setTimeout(() => { if (!done) go(); }, RUN_OPEN_RETRY);
  };
  go();
}).catch(e => { runDbP = null; throw e; }));
async function runDo(mode, fn) {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await runDb();
    return await new Promise((res, rej) => { const tx = db.transaction(RUN_STORE, mode), q = fn(tx.objectStore(RUN_STORE)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); });
  } catch (e) { return null; } // (a private window, a full disk: no save, the game plays on)
}
// A SAVE IS THE BOARD AT REST (owner, 2026-10-19: "on save, don't save tower positions and effects of enemies on screen, just load the
// screen with 'Challenge X' button and the towers in their starting positions and board empty"): every tower back on the slot it was
// built on, its moment-to-moment state dropped (cooldowns, locks, pools, holes, pellets, interceptors, bolts, drags, an active Relay),
// the field empty - only what was BOUGHT (kind, slot, skills, mode, spent) and its stats kept. Applied to the copy that is saved, and
// again on resume (an older save). The resume lands between waves after a boss, so the Challenge button is up (afterBoss)
const RUN_TOWER_DROP = ["cd", "spin", "posT", "goal", "auraT", "rimeT", "pulses", "period", "locks", "lines", "spare", "puddles", "poolSumT",
  "spheres", "pellets", "icp", "launchCd", "launchN", "carBolts", "fling", "held", "leashHint", "links", "relayUntil", "tc", "ve",
  "ifrSlot0", "ifrCharge", "ifrReady", "ifrLaunchCd", "ifrBalls", "ifrRings", "ifrPellets", "ifrFlares", "ifrFs", "ifrFires", "ifrInit0", "ifrGap", "ifrOrb"]; /* IFR: all of it - ifrInit rebuilds it on the first step (ifrInit0 unset); the 6.4 keys too */
function runClean(g) {
  for (const t of g.towers) { const c = CELLS[t.cell]; if (c) { t.x = c.x; t.y = c.y; } for (const k of RUN_TOWER_DROP) delete t[k]; }
  Object.assign(g, { enemies: [], spawns: [], fleetQ: [], chains: [], drips: [] });
  return g;
}
const runSave = () => { if (G.started && !G.over) runDo("readwrite", s => { const at = Date.now(); s.put({ wave: G.wave, lives: G.lives, at }, RUN_META); return s.put({ G: Object.assign(runClean(structuredClone(G)), { skillScale: SKILL_SCALE }), wave: G.wave, lives: G.lives, at }, RUN_KEY); }); }; // (stamped: its axis levels are the tiers - skillScaleFix, aspira-capstone.js)
const runClear = () => runDo("readwrite", s => { s.delete(RUN_META); return s.delete(RUN_KEY); });
// a CHECKPOINT AT EVERY BOSS, on a CLEAR board (owner, 2026-10-16: "save to last wave not mid wave", "actually, save every boss"):
// once a boss wave is beaten and nothing is left on the field or still to spawn (waveClear, aspira-waves.js), that state is
// saved - a resume starts between waves, the boss behind it. Was: every wave as it was SENT, mid-fight. Every end (a loss, a
// win) clears; the globals are looked up by name, so wrapping them reaches every caller
let runSavedAt = 0;
const runCheckpoint = () => { if (G.started && !G.over && G.wave > runSavedAt && G.wave % STAR_EVERY === 0 && waveClear()) { runSavedAt = G.wave; runSave(); } };
if (typeof indexedDB !== "undefined") {
  setInterval(runCheckpoint, 500);
  const over0 = gameOver; gameOver = function (...a) { runClear(); return over0.apply(this, a); };
  const win0 = winGame; winGame = function (...a) { runClear(); return win0.apply(this, a); };
}
// NO BUILD WHILE THE RESUME CARD IS UP (owner, 2026-10-19): a tower would start wave 1, and "resume" would then throw that game away
{ const place0 = placeTower; placeTower = function (...a) { if (document.getElementById("asp-resume")) { ui.build = null; return; } return place0.apply(this, a); }; }
// on load: a saved run waiting - the card, the game held behind it
function runOffer(saved) {
  const card = document.createElement("div");
  card.id = "asp-resume"; card.className = "asp-deck asp-log";
  card.innerHTML = '<h2>resume?</h2><p>Your game after wave ' + saved.wave + " (" + saved.lives + " lives) was saved.</p>";
  const row = document.createElement("div"); row.className = "asp-row asp-resume-row"; card.appendChild(row);
  const done = () => { card.remove(); ui.paused = false; };
  button(row, "asp-primary", "resume after wave " + saved.wave, () => runDo("readonly", s => s.get(RUN_KEY)).then(run => { if (!run || !runResume(run)) runClear(); done(); }));
  button(row, "", "new game", () => { runClear(); done(); });
  document.querySelector(".asp-board").appendChild(card);
  ui.paused = true;
}
function runResume(saved) {
  try {
    G = runClean(skillScaleFix(saved.G)); runSavedAt = G.wave; autoMove = !!G.autoMove; freeMode = !!G.freeMode; // (auto-move is the game's own; runClean also drops leashHint - a page-clock stamp that kept the movement rings on for hours, owner 2026-10-16)
    fx = []; dmgLive = []; coins = []; ui.sel = null; ui.build = null;
    if (typeof bossInv === "object") Object.assign(bossInv, { phase: "off", full: false, r: 0 });
    refreshPanels();
    return true;
  } catch (e) { G = newGame(); autoMove = false; freeMode = false; refreshPanels(); return false; } // a save the game can no longer read: a fresh one
}
// (a save from before RUN_META has no meta: its whole run is read, once - the next save writes one)
runDo("readonly", s => s.get(RUN_META)).then(m => m || runDo("readonly", s => s.get(RUN_KEY)))
  .then(saved => { if (saved && !(saved.G && saved.G.over) && G.wave === 0 && !G.towers.length) runOffer(saved); });
