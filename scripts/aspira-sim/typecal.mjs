// TYPE DIFFICULTY BY BAND (owner, 2026-10-21: "if most trios win comfortably, that type is too weak / the difficulty of the type needs
// to be adjusted / make sure that all types are equally difficult (against the "average" team of towers) at each level"): typepower.mjs's
// games (every wave one type, a boss wave an ordinary one of it; every trio, the smart saver) but read BAND BY BAND - per type and band
// (the four sections: waves 1-24, 25-60, 61-96, 97-120): lives lost and rewinds (the smart saver rewinds a leaked wave and buys, so rewinds are the
// difficulty its lives hide), over every trio = the average team. Lever: TYPE_HP="swarm:1.1,fast:0.9" multiplies ENEMIES[type].hp.
// env KINDS, SEEDS (1,2), TYPES, TYPE_HP, REWIND, BANDS, ASPIRA_PATCH, ASPIRA_WEB; argv[2] = a resumable results file
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
import { force } from "./typepower.mjs";
const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,car,ifr").split(",");
const TYPES = (process.env.TYPES || "swarm,fast,shield,armor").split(",");
export const BANDS = (process.env.BANDS || "1-24,25-60,61-96,97-120").split(",").map(x => x.split("-").map(Number)); // the four sections (ARCHITECTURE.md 5.6); BANDS=1-24 plays only that far
// TYPE_HP="armor:1.4" = ENEMIES.armor.hp x1.4; "armor.speed:1.3" any other number of the type
const hpPatch = s => (s || "").split(",").filter(Boolean).map(x => { const [t, k] = x.split(":"); return `ENEMIES.${t.includes(".") ? t : t + ".hp"} *= ${Number(k)};`; }).join("\n");
export default async function task({ trio, type, seed, typeHp }) {
  const patch = [force(type), hpPatch(typeHp)].join("\n"); // (ASPIRA_PATCH: makeGame adds it itself)
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", rewind: process.env.REWIND !== "0", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, BANDS.at(-1)[1], 0.02, patch); // REWIND=0: no replays, so a leak costs lives (the rewinding saver won armor at 18/18 lives with HP x4 or no armor at all)
  const bands = [];
  for (const [a, b] of BANDS) {
    const lives0 = p.g.G.lives, over0 = p.g.G.over;
    p.runTo(b + 1);
    let rw = 0; for (let w = a; w <= b; w++) rw += ((p.rw || {})[w] || {}).r || 0;
    bands.push({ lost: over0 ? null : lives0 - Math.max(0, p.g.G.lives), rw, dead: p.g.G.over && !p.g.G.won });
  }
  const r = p.result();
  return { won: r.won, wave: r.wave, lives: r.lives, bands };
}
if (isMainThread && process.argv[1].endsWith("typecal.mjs")) {
  const trios = []; for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
  const typeHp = process.env.TYPE_HP || "";
  const jobs = []; for (const type of TYPES) for (const trio of trios) for (const seed of (process.env.SEEDS || "1,2").split(",").map(Number)) jobs.push({ trio, type, seed, typeHp });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  console.log(`TYPE DIFFICULTY BY BAND (TYPE_HP ${typeHp || "none"}): every trio, every wave one type; per band, mean over games still alive in it`);
  console.log("type".padEnd(8) + "won".padStart(6) + BANDS.map(([a, b]) => `${a}-${b} lost/rw/dead`.padStart(22)).join(""));
  for (const type of TYPES) {
    const g = res.filter((r, i) => jobs[i].type === type);
    const cells = BANDS.map((_, j) => {
      const alive = g.filter(r => r.bands[j].lost !== null), m = f => alive.length ? alive.reduce((s, r) => s + f(r), 0) / alive.length : 0;
      return `${m(r => r.bands[j].lost).toFixed(1)}/${m(r => r.bands[j].rw).toFixed(1)}/${g.filter(r => r.bands[j].dead).length}`.padStart(22);
    });
    console.log(type.padEnd(8) + `${g.filter(r => r.won).length}/${g.length}`.padStart(6) + cells.join(""));
  }
}
