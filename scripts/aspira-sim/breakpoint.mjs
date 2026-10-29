// TYPE BREAK POINTS (PROBE=speed by default since 2026-10-22; PROBE=hp the HP ladder) (owner, 2026-10-22: the forced-type games saturated - the smart saver won armor at 18/18 lives with HP x4 or no
// armor at all, so a win rate says nothing about how hard a type is): every trio, every wave one type (typecal.mjs's games, no
// rewinds), at a ladder of HP multipliers per type. Per type and band the multiplier where the average trio starts losing lives is
// its BREAK POINT; equally hard types break at the same multiplier, and a type that holds to x4 while another breaks at x1.3 is
// easier by about that factor. A game dead before a band loses the band's share of the 18 lives it no longer has.
// env KINDS, SEEDS (1,2), TYPES, KS (1,1.6,2.5,4), BANDS, LOSE (2: lives lost in a band that count as broken); argv[2] = a resumable results file
import { isMainThread } from "node:worker_threads";
import { runPool } from "./pool.mjs";
process.env.REWIND = "0";
export { default } from "./typecal.mjs";
import { BANDS as BANDS_N } from "./typecal.mjs";
if (isMainThread && process.argv[1].endsWith("breakpoint.mjs")) {
  const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,crr,ifr").split(","), TYPES = (process.env.TYPES || "swarm,fast,shield,armor").split(",");
  const PROBE = process.env.PROBE || "speed", probe = (type, k) => PROBE === "hp" ? `${type}:${k}` : `${type}.${PROBE}:${k}`; // the STRESS the ladder raises (owner, 2026-10-22: break point leads; speed, not HP - early shields ignore HP)
  const KS = (process.env.KS || "1,1.3,1.6,2,2.5,3").split(",").map(Number), LOSE = Number(process.env.LOSE || 2), SEEDS = (process.env.SEEDS || "1,2").split(",").map(Number);
  const trios = []; for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
  const jobs = []; for (const k of KS) for (const type of TYPES) for (const trio of trios) for (const seed of SEEDS) jobs.push({ trio, type, seed, typeHp: probe(type, k) });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true, out: process.argv[2] || null });
  const lost = (r, j) => r.bands[j].lost ?? 18 / BANDS_N.length; // dead before the band: lost its share of the lives
  const BANDS = BANDS_N.map(([a, b]) => a + "-" + b);
  console.log(`BREAK POINTS (no rewinds, the ${PROBE} ladder): mean lives lost per band at each multiplier; break = first x where the mean reaches ${LOSE} (interpolated)`);
  for (const type of TYPES) {
    const row = KS.map(k => { const g = res.filter((r, i) => jobs[i].type === type && jobs[i].typeHp === probe(type, k)); return BANDS.map((_, j) => g.reduce((s, r) => s + lost(r, j), 0) / g.length); });
    const brk = BANDS.map((_, j) => { for (let i = 0; i < KS.length; i++) if (row[i][j] >= LOSE) return i === 0 ? `<=${KS[0]}` : (KS[i - 1] + (KS[i] - KS[i - 1]) * (LOSE - row[i - 1][j]) / (row[i][j] - row[i - 1][j])).toFixed(2); return `>${KS.at(-1)}`; });
    console.log(`\n${type}: won ${KS.map(k => res.filter((r, i) => jobs[i].type === type && jobs[i].typeHp === probe(type, k) && r.won).length).join(" / ")} of ${trios.length * SEEDS.length} at x${KS.join(" / x")}`);
    console.log("  x".padEnd(8) + BANDS.map(b => b.padStart(9)).join(""));
    KS.forEach((k, i) => console.log(`  ${k}`.padEnd(8) + row[i].map(v => v.toFixed(1).padStart(9)).join("")));
    console.log("  break".padEnd(8) + brk.map(v => String(v).padStart(9)).join(""));
    const kt = KS.map(k => { const g = res.filter((r, i) => jobs[i].type === type && jobs[i].typeHp === probe(type, k)); return BANDS.map((_, j) => { const v = g.map(r => r.bands[j].kt).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; }); });
    KS.forEach((k, i) => console.log(`  kill-t ${k}`.padEnd(14) + kt[i].map(v => (v.toFixed(1) + "s").padStart(9)).join(""))); // seconds to the core at the kill, mean over games (higher = killed further out)
  }
}
