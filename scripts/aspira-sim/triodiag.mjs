// TRIO DIAGNOSIS (2026-10-16): the trios on the wrong side of the design, played like tribal.mjs (smart saver, both powers, to
// 120), with each game's per-wave records (sim.mjs waveStats): per enemy type over waves 60+, lives lost and the closest approach
// (u from the core; smaller = closer); for a loss, the killing wave's types. env TRIOS ("a.b.c,..."), SEEDS, ASPIRA_WEB
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";
export default async function task({ trio, seed }) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true }, seed, 120, 0.02, process.env.ASPIRA_PATCH || "");
  p.runTo(121); const r = p.result();
  const by = {}; let kill = null;
  for (const [n, w] of Object.entries(r.waveStats || {})) {
    if (+n < 60) continue;
    const ts = Object.keys(w.types).filter(t => t !== "bonus").join("+") || "boss";
    const k = (w.boss ? "BOSS " : "") + ts, b = by[k] ||= { lost: 0, near: Infinity, waves: 0 };
    b.lost += w.lost; b.near = Math.min(b.near, Number.isFinite(w.near) ? w.near : Infinity); b.waves++;
    if (!r.won && +n === r.wave) kill = k;
  }
  return { won: r.won, wave: r.wave, lives: r.lives, by, kill };
}
if (isMainThread && process.argv[1].endsWith("triodiag.mjs")) {
  const trios = process.env.TRIOS.split(",").map(s => s.split("."));
  const jobs = []; for (const trio of trios) for (const seed of (process.env.SEEDS || "1,2,3").split(",").map(Number)) jobs.push({ trio, seed });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  for (const trio of trios) {
    const m = res.filter((r, i) => jobs[i].trio === trio), all = {};
    for (const r of m) for (const [k, b] of Object.entries(r.by)) { const a = all[k] ||= { lost: 0, near: Infinity, waves: 0 }; a.lost += b.lost; a.near = Math.min(a.near, b.near); a.waves += b.waves; }
    console.log("\n" + trio.join("+").toUpperCase(), "won", m.filter(r => r.won).length + "/" + m.length, "waves", m.map(r => r.wave).join("/"), "killed by", m.map(r => r.kill || "-").join(" | "));
    for (const [k, a] of Object.entries(all).sort((x, y) => y[1].lost - x[1].lost || x[1].near - y[1].near)) console.log("  " + k.padEnd(22), "lives lost", String(a.lost).padStart(4), " closest", String(Math.round(a.near)).padStart(5), " (" + a.waves + " waves)");
  }
}
