// DEV SCENES (owner, 2026-10-27: "serve on a different page the boss screen, and make it so (for that specific page) when I refresh,
// it just takes me to the same state, except with the latest code"): /spire?dev=boss rebuilds the boss scene on EVERY load - the
// resume card dropped, a FRZ on the first open cell, the Star sent AT THE FIRST TAP (the audio needs a gesture before it can make a
// sound - sent on load the whole scene was silent, owner 2026-10-27: "no sound"), its HP set to DEV_BOSS_HP once it is well onto the
// board, then the game paused (1x resumes). Never touches the real run: the autosave's checkpoint is parked (runSavedAt).
// ?dev=boss&hp=0.3 for another HP share; ?dev=boss&t=<kind> for another tower; ?dev=boss&boss=lovers (any arcana id) for another boss. Loaded last (aspira.html); does nothing without ?dev=.
// ?dev=boss&intro (2026-10-28, the HP-bar hold of 6.15.38): WATCH the entrance at real speed instead - the scene stops driving once the
// boss is on the board, so the HP pieces fly in and every boss body waits at its edge for the 2nd-last ring (BAR_HOLD stays on); no fast-forward, no HP set, no pause.
const DEV = typeof location !== "undefined" ? new URLSearchParams(location.search) : null, DEV_SCENE = DEV ? DEV.get("dev") || "" : "";
const DEV_BOSS_HP = 0.55, DEV_BOSS_IN_U = 150, DEV_INTRO = DEV_SCENE === "boss" && DEV.has("intro");
if (DEV_SCENE === "boss") {
  if (typeof BAR_HOLD !== "undefined" && !DEV_INTRO) BAR_HOLD = false; // (no waiting for the HP bar: the scene steps its boss straight in - aspira-bossbar.js; &intro keeps the wait)
  let built = false, tapped = false; const devLog = window.devLog = []; // (devLog: what each tick did - read it from the console when a scene misbehaves)
  document.addEventListener("pointerdown", () => { tapped = true; }, { once: true }); document.addEventListener("keydown", () => { tapped = true; }, { once: true }); // (the same gestures aspira-sfx.js unlocks the audio on)
  const tickDev = () => {
    if (!tapped || typeof G === "undefined" || typeof CELLS === "undefined" || !CELLS.length) return;
    devLog.push([Math.round(performance.now()), built, G.wave, G.enemies.length, G.enemies.filter(e => e.arcana).length, ui.paused]);
    const card = document.getElementById("asp-resume"); if (card) { card.remove(); ui.paused = false; }
    if (!built) {
      if (typeof runSavedAt !== "undefined") runSavedAt = Infinity; // (no checkpoint of this scene over the real run - aspira-autosave.js)
      G.money = 1e9; ui.build = DEV.get("t") || "frz"; placeTower(CELLS[CELLS.findIndex((c, i) => cellOpen(i))]); ui.build = null;
      G.started = true; G.wave = STAR_EVERY * (Math.max(0, ARCANA.findIndex(a => a.id === DEV.get("boss"))) + 1) - 1; /* &boss=<id>: that arcana's wave (else the Star) */ G.lastType = "fast"; G.enemies.length = 0; G.fleetQ.length = 0; G.spawns.length = 0; G.nextIn = 0;
      built = true; return;
    }
    let b = G.enemies.find(e => e.arcana && !e.dead);
    if (!b) { for (let i = 0; i < 40 && !b; i++) { step(0.05); b = G.enemies.find(e => e.arcana && !e.dead); } if (!b) return; } // (2 s of game a tick till the boss is out: no waiting through its warning)
    if (DEV_INTRO) { clearInterval(devTimer); return; } // (&intro: handed to the real loop the tick the boss spawns - the fly-in and the hold play out at real speed from here)
    for (let i = 0; i < 2000 && b.s < entryS(b.pi) + DEV_BOSS_IN_U && !b.dead; i++) step(0.05); // fast-forwarded DEV_BOSS_IN_U in (real steps, not a moved boss): the scene is up at once
    b.hp = b.max * (Number(DEV.get("hp")) || DEV_BOSS_HP); ui.paused = true; ui.pauseBtn = true; clearInterval(devTimer);
  };
  const devTimer = setInterval(tickDev, 100);
}
