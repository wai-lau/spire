// THE ADAPTIVE BUYER (owner, 2026-11-09: "simulated players should always go for the best build depending on their situation (whichever
// helps the most with the type they are having difficulty with)"): at each upgrade the good model scores EVERY upgradable tower x open
// path - the trouble it is in by enemy type (each type's closeness and lives lost over the last ADAPT_WAVES waves, recent ones weighing
// more, plus the types of the next BUY_AHEAD waves on the list) times what one more tier there cuts that type's team leak (surface.json,
// surfvalue.py: the tower's own gain a point + the path's edge at the level nearest its points after the buy), over the tier's price -
// and buys the best. No trouble yet: every type weighs the same (the best overall). The default since 2026-11-09 (paired 50 on 7.12.37,
// bosses skipped: 22 -> 37 wins, lives 9.0 -> 15.7); BUYER=old keeps the cheapest-tower + axis-vs.json row spend. surface.json: the 7.12.37
// team surface (surfvalue.py); refresh a tower's rows when its balance changes
import fs from "node:fs";

const TYPES = ["swarm", "fast", "shield", "armor"], BUY_AHEAD = 2, AHEAD_K = 0.3;
const SURFACE = (() => { try { return JSON.parse(fs.readFileSync(process.env.SURFACE || new URL("./surface.json", import.meta.url), "utf8")); } catch (e) { return null; } })();
export const haveSurface = () => !!SURFACE;

// the trouble by type: the planner's threat (sim.mjs adaptAxis), plus what is coming
export function troubleByType(g, S, consts) {
  const { ADAPT_WAVES, ADAPT_DECAY, ADAPT_NEAR, ADAPT_LIFE } = consts, G = g.G, w = {};
  for (let n = Math.max(1, G.wave - ADAPT_WAVES); n < G.wave; n++) {
    const s = (S.waveStats || {})[n]; if (!s) continue;
    const k = ADAPT_DECAY ** (G.wave - 1 - n), close = Number.isFinite(s.near) ? Math.max(0, 1 - s.near / ADAPT_NEAR) ** 2 : 0;
    for (const ty of Object.keys(s.types)) if (TYPES.includes(ty)) w[ty] = (w[ty] || 0) + k * (close + ADAPT_LIFE * s.lost);
  }
  const ahead = g.run(`(() => { let last = G.lastType; const out = []; for (let n = G.wave + 1; n <= G.wave + ${BUY_AHEAD}; n++) { const p = wavePlan(n, last); out.push(p.type); if (p.type !== "bonus") last = p.type; } return out; })()`);
  const any = TYPES.some(ty => (w[ty] || 0) > 0);
  for (const ty of ahead) if (TYPES.includes(ty)) w[ty] = (w[ty] || 0) + (any ? AHEAD_K : 0);
  if (!TYPES.some(ty => (w[ty] || 0) > 0)) for (const ty of TYPES) w[ty] = 1;
  return w;
}

// the best (tower, path) to buy now - the rot-th best on the smart saver's alt tries (smartWave) - or null (no surface, nothing open)
export function bestBuy(g, S, consts, rot = 0) {
  if (!SURFACE) return null;
  const w = troubleByType(g, S, consts);
  const cands = g.run(`G.towers.filter(t => t.lvl < maxLvl(t) && pendingChoice(t) === "skill").map(t => ({ id: t.id, kind: t.kind,
    axes: SKILL_TREES[t.kind].map(a => [a.id, skillOf(t, a.id), axisCap(t, a.id), (s => s > 1 ? skillPointsCost(t, s) : upCost(t))(tierSteps(t, a.id))]) }))`);
  const ranked = [];
  for (const c of cands) {
    const surf = SURFACE[c.kind]; if (!surf) continue;
    const levels = Object.keys(surf).map(Number), pts = c.axes.reduce((s, a) => s + a[1], 0) + 1;
    const L = String(levels.reduce((a, b) => (Math.abs(b - pts) < Math.abs(a - pts) ? b : a)));
    c.axes.forEach(([id, tier, cap, price], i) => {
      if (tier >= cap) return;
      let v = 0; for (const ty of TYPES) v += (w[ty] || 0) * ((surf[L].g[ty] || 0) + (surf[L].m[i][ty] || 0));
      ranked.push({ id: c.id, axis: id, sc: v / Math.max(1, price) });
    });
  }
  if (!ranked.length) return null;
  ranked.sort((a, b) => b.sc - a.sc);
  return ranked[rot % ranked.length];
}
