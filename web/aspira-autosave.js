// /spire - AUTOSAVE (owner, 2026-10-14: "sure on the autosave" - an iPhone that runs out of memory reloads the page, and a
// run at wave 62 or 120 was gone). The whole game state G is put in IndexedDB as each wave starts (a structured clone: its
// Maps, Sets and shared enemies kept as they are), dropped when the game ends; on a load with a run saved, a card offers to
// resume that wave or start fresh. A resumed run may still sign TOP PLAYERS (owner). Loaded after aspira-ui.js; the
// simulator has no indexedDB, so all of this stands down there.
const RUN_DB = "spire", RUN_STORE = "run", RUN_KEY = "current";
const runDb = () => new Promise((res, rej) => {
  const r = indexedDB.open(RUN_DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(RUN_STORE);
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function runDo(mode, fn) {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await runDb();
    return await new Promise((res, rej) => { const tx = db.transaction(RUN_STORE, mode), q = fn(tx.objectStore(RUN_STORE)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); });
  } catch (e) { return null; } // (a private window, a full disk: no save, the game plays on)
}
// the clone is taken the moment put() is called: the state as this wave starts
const runSave = () => { if (G.started && !G.over) runDo("readwrite", s => s.put({ G, wave: G.wave, lives: G.lives, at: Date.now() }, RUN_KEY)); };
const runClear = () => runDo("readwrite", s => s.delete(RUN_KEY));
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
// on load: a saved run waiting - the card, the game held behind it
function runOffer(saved) {
  const card = document.createElement("div");
  card.id = "asp-resume"; card.className = "asp-deck asp-log";
  card.innerHTML = '<h2>resume?</h2><p>Your game after wave ' + saved.wave + " (" + saved.lives + " lives) was saved.</p>";
  const row = document.createElement("div"); row.className = "asp-row asp-resume-row"; card.appendChild(row);
  const done = () => { card.remove(); ui.paused = false; };
  button(row, "asp-primary", "resume after wave " + saved.wave, () => { if (!runResume(saved)) runClear(); done(); });
  button(row, "", "new game", () => { runClear(); done(); });
  document.querySelector(".asp-board").appendChild(card);
  ui.paused = true;
}
function runResume(saved) {
  try {
    G = saved.G; runSavedAt = G.wave; autoMove = !!G.autoMove; // (auto-move is the game's own)
    for (const t of G.towers) delete t.leashHint; // page-clock stamps (performance.now) mean nothing after a reload: a saved one kept the movement rings on for hours (owner, 2026-10-16)
    fx = []; dmgLive = []; coins = []; ui.sel = null; ui.build = null;
    if (typeof bossInv === "object") Object.assign(bossInv, { phase: "off", full: false, r: 0 });
    refreshPanels();
    return true;
  } catch (e) { G = newGame(); autoMove = false; refreshPanels(); return false; } // a save the game can no longer read: a fresh one
}
runDo("readonly", s => s.get(RUN_KEY)).then(saved => { if (saved && saved.G && !saved.G.over && G.wave === 0 && !G.towers.length) runOffer(saved); });
