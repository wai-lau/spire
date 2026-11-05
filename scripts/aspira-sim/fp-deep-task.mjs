// THE DEEP FINGERPRINT (scripts/aspira-sim/fp.sh deep; Visual, 2026-11-05): fp-task's six games stop at wave 40 and never reach some
// code (an ACD drip never dropped, so a split that moved DRIP_HOLLOW to a draw-only file passed fp and would have crashed a late sim).
// Here each of the seven kinds is ONE tower with every axis bought (the first at V, the others IV) against a held 40-enemy crowd of
// every type at wave 90, 1200 steps in the SIM's own environment (no draw files): a hash of every enemy's hp, spot, armor and slow
// each second, the kills, and the most live drips. Run from the snapshot fp.sh unpacks (it plays THAT tree's web/)
import { makeGame } from "./sim.mjs";
const out = {};
for (const kind of ["arc", "acd", "grv", "frz", "sol", "crr", "ifr"]) {
  const g = makeGame(7);
  out[kind] = g.run(`(() => { G = newGame(); G.money = 1e9; G.started = true; G.wave = 90; G.nextIn = 1e9; G.spawns = [];
    const ci = CELLS.findIndex((c, i) => cellOpen(i)); const C = CELLS[ci];
    const sk = {}; SKILL_TREES["${kind}"].forEach((a, k) => sk[a.id] = k === 0 ? 5 : 4);
    const t = { id: G.id++, kind: "${kind}", cell: ci, x: C.x, y: C.y, lvl: 1, cd: 0, mode: DEFAULT_MODE["${kind}"], spent: 0, skills: sk }; t.lvl = 1 + towerLevel(t); G.towers.push(t);
    for (let k = 0; k < 40; k++) { spawnEnemy(["swarm", "shield", "armor", "fast"][k % 4], 90, k % PATHS.length, 0); const e = G.enemies[G.enemies.length - 1]; e.hp = e.max = e.max * 50; }
    let h = 2166136261, dm = 0; const mix = v => { h = Math.imul(h ^ (Math.round(v * 1000) | 0), 16777619) >>> 0; };
    for (let f = 0; f < 1200; f++) { step(1 / 60); dm = Math.max(dm, (G.drips || []).length); if (f % 60 === 0) for (const e of G.enemies) { mix(e.hp); mix(e.x); mix(e.armor); mix(e.slowT || 0); } }
    mix(G.enemies.filter(e => e.dead).length); mix(dm); return h.toString(16) + " dead " + G.enemies.filter(e => e.dead).length + " drips " + dm; })()`);
}
console.log(JSON.stringify(out));
