// DEV SCENES (owner, 2026-10-27: "serve on a different page the boss screen, and make it so (for that specific page) when I refresh,
// it just takes me to the same state, except with the latest code"): /spire?dev=boss rebuilds the boss scene on EVERY load - the
// resume card dropped, a FRZ on the first open cell, the Star sent at once, its HP set to DEV_BOSS_HP once it is well onto the
// board, then the game paused (1x resumes). Never touches the real run: the autosave's checkpoint is parked (runSavedAt).
// ?dev=boss&hp=0.3 for another HP share; ?dev=boss&t=<kind> for another tower. Loaded last (aspira.html); does nothing without ?dev=.
const DEV = typeof location !== "undefined" ? new URLSearchParams(location.search) : null, DEV_SCENE = DEV ? DEV.get("dev") || "" : "";
const DEV_BOSS_HP = 0.55, DEV_BOSS_IN_U = 150;
if (DEV_SCENE === "boss") {
  let built = false;
  const tickDev = () => {
    if (typeof G === "undefined" || typeof CELLS === "undefined" || !CELLS.length) return;
    const card = document.getElementById("asp-resume"); if (card) { card.remove(); ui.paused = false; }
    if (!built) {
      if (typeof runSavedAt !== "undefined") runSavedAt = Infinity; // (no checkpoint of this scene over the real run - aspira-autosave.js)
      G.money = 1e9; ui.build = DEV.get("t") || "frz"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null;
      G.started = true; G.wave = STAR_EVERY - 1; G.lastType = "fast"; G.enemies.length = 0; G.fleetQ.length = 0; G.spawns.length = 0; G.nextIn = 0;
      built = true; return;
    }
    const b = G.enemies.find(e => e.arcana && !e.dead); if (!b || b.s < entryS(b.pi) + DEV_BOSS_IN_U) return;
    b.hp = b.max * (Number(DEV.get("hp")) || DEV_BOSS_HP); ui.paused = true; ui.pauseBtn = true; clearInterval(devTimer);
  };
  const devTimer = setInterval(tickDev, 100);
}
