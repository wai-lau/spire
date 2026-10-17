// /spire - WARM-UP (2026-10-16): the first frame with a tower on it cost 33-44 ms and the first boss-sky frames 30 ms, cold code
// V8 had not run yet. A few seconds after load - the game still pristine (wave 0, no tower, nothing on the field) and the 3D view up - one
// task puts a tower of every kind and an enemy of every plain type on the board, draws it (and a spreading and a full boss sky)
// a few times, and takes it all away again before any frame is shown: G's towers and enemies, its id counter, the sky's state and
// the board layer's cache are put back. Never in the simulator (it has no timer or document); never over a game that has begun.
(function warmUp() {
  if (typeof setTimeout !== "function" || typeof document === "undefined" || (typeof INSTANT_COINS !== "undefined" && INSTANT_COINS)) return;
  let tries = 0;
  const run = () => {
    const ok = typeof warp !== "undefined" && warp.p && !document.hidden && G.wave === 0 && !G.started && !G.over && !G.towers.length && !G.enemies.length && !G.spawns.length;
    if (!ok) { if (++tries < 40) setTimeout(run, 1500); return; }
    const bs0 = bossSkyStep, id0 = G.id, sky0 = { ...bossInv }, sel0 = ui.sel, build0 = ui.build, hover0 = ui.hover;
    try {
      KINDS.forEach((kind, i) => G.towers.push({ id: G.id++, kind, cell: i, x: CELLS[i].x, y: CELLS[i].y, lvl: 5, cd: 0, mode: DEFAULT_MODE[kind], spent: 0 }));
      Object.keys(ENEMIES).filter(t => !ENEMIES[t].star).forEach((type, i) => spawnEnemy(type, 30, i % PATHS.length));
      warp3d(); warp3d();
      bossSkyStep = () => {}; /* (it would set the sky back off on every draw) */
      Object.assign(bossInv, { phase: "out", full: false, r: 300, x: CX, y: CY }); warp3d(); warp3d();
      Object.assign(bossInv, { full: true, r: 5000 }); warp3d();
    } catch (e) { /* a warm-up never gets in the way */ } finally {
      bossSkyStep = bs0; G.towers.length = 0; G.enemies.length = 0; G.id = id0; Object.assign(bossInv, sky0); ui.sel = sel0; ui.build = build0; ui.hover = hover0;
      if (typeof warp !== "undefined") { warp.statKey = ""; warp.dynDirty = true; } // (the board layer redraws on the next real frame)
    }
  };
  setTimeout(run, 3000);
})();
