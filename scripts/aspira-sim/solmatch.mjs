// SOL MATCH (owner, 2026-10-22: the SOL rework - "keep same strength" / "build now, balance overnight" / "balance SOL axes by running sims
// with every other non repeating pair of towers" / "waves 24-120"): the reworked SOL fitted to the OLD SOL's strength by axis.mjs's
// method (2026-10-18): each SOL axis pushed FIRST inside every trio of SOL + two different other kinds (15), the perfect player (smart
// saver, both powers), 120 waves; the score is axis.mjs's MARGIN over waves FROM..TO - the mean closest approach (u from the core, capped
// 400) less 10 u per life lost.
//   node solmatch.mjs measure old.json        (ASPIRA_WEB=<the pre-rework web>): the old SOL's margin per axis
//   node solmatch.mjs fit old.json [rounds=6]  (the live web): SOL's base damage so the three axes' MEAN margin matches, then one scale
//     per axis on its lever table - focus SOL_FOCUS_DMG, refraction (Reflection) SOL_REFRACTION_DMG, breach SOL_SCORCH - so each axis's
//     margin matches its old one
// env SEEDS (1), FROM (24), TO (120)
import fs from "node:fs";
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";

// KIND (sol): the tower matched - any kind with LEVERS below (ACD too, 2026-10-22: its pools and slow moved)
const KIND = process.env.KIND || "sol";
const LEVERS = { sol: { focus: "SOL_PASS", refraction: "SOL_REFRACTION_DMG", breach: "SOL_SCORCH" }, acd: { spray: "ACD_SPRAY_MUL", corrosion: "ACD_CORROSION_DMG", contagion: "ACD_PUDDLE_HEAT" } };
const OTHERS = ["arc", "frz", "sol", "acd", "grv", "car", "ifr"].filter(k => k !== KIND), TRIOS = OTHERS.flatMap((a, i) => OTHERS.slice(i + 1).map(b => [KIND, a, b]));
const LEVER = LEVERS[KIND], AXES = Object.keys(LEVER);
const SPD = Number(process.env.SPD || 1), SEEDS = (process.env.SEEDS || "1").split(",").map(Number), FROM = Number(process.env.FROM || 24), TO = Number(process.env.TO || 120);

export default async function task({ trio, axis, seed, patch = "", spd = 1 }) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", rewind: false, threat: 220, core: ["temporal", "relay"], useCore: true, skills: { [KIND]: [axis, ...AXES.filter(a => a !== axis)] }, cheapSaver: true }, seed, 120, 0.02, `ENEMY_SPEED *= ${spd};\n${patch}`);
  p.runTo(121); const r = p.result(), ws = r.waveStats || {};
  let sum = 0, cnt = 0, lost = 0;
  for (let n = FROM; n <= TO; n++) { const w = ws[n]; if (!w) { if (n > r.wave) cnt++; continue; } lost += w.lost || 0; if (Number.isFinite(w.near)) { sum += Math.min(400, w.near); cnt++; } } // (a wave never reached: dead - scores 0)
  // THE MEASURE (2026-10-22): lives LOST in FROM..TO (a death: the lives it had left, plus the waves it never played at 1 each) - the
  // closest-approach margin did not track strength (the smart saver spends less when its towers are stronger: x3 SOL damage read WORSE)
  const dead = !r.won && r.wave < TO ? Math.max(0, r.lives) + (TO - r.wave) : 0;
  return { margin: -(lost + dead), won: r.won, wave: r.wave };
}
// mean margin per axis (patches: { axis: patch }) - one pool run
async function margins(patches) {
  const jobs = [];
  for (const axis of AXES) for (const trio of TRIOS) for (const seed of SEEDS) jobs.push({ trio, axis, seed, patch: patches[axis] || "", spd: SPD });
  const res = await runPool(new URL(import.meta.url), jobs, { quiet: true });
  return Object.fromEntries(AXES.map(axis => { const rs = res.filter((r, i) => jobs[i].axis === axis); return [axis, rs.reduce((a, r) => a + r.margin, 0) / rs.length]; }));
}
const mean = o => AXES.reduce((a, x) => a + o[x], 0) / AXES.length;
if (isMainThread && process.argv[1].endsWith("solmatch.mjs")) {
  const [mode, file] = process.argv.slice(2);
  if (mode === "measure") {
    const m = await margins({});
    fs.writeFileSync(file, JSON.stringify(m));
    console.log(`old ${KIND} margins (waves ${FROM}-${TO}, ${TRIOS.length} trios x ${SEEDS.length} seeds): ` + AXES.map(a => `${a} ${m[a].toFixed(1)}`).join("  "));
  } else if (mode === "fit") {
    const old = JSON.parse(fs.readFileSync(file, "utf8")), ROUNDS = Number(process.argv[4] || 6);
    // 1. the base damage x 2^m, m in [-3, 3], on the mean of the three axes - more damage, a bigger margin
    let lo = -3, hi = 3, best = null;
    for (let r = 0; r <= ROUNDS; r++) {
      const m = r === 0 ? 0 : (lo + hi) / 2, patch = `TOWERS["${KIND}"].dmg *= ${+(2 ** m).toPrecision(4)};`, got = await margins(Object.fromEntries(AXES.map(a => [a, patch])));
      if (!best || Math.abs(mean(got) - mean(old)) < Math.abs(mean(best.got) - mean(old))) best = { m, patch, got };
      if (r > 0) { if (mean(got) < mean(old)) lo = m; else hi = m; }
      console.error(`base round ${r}: x${(2 ** m).toFixed(3)} mean margin ${mean(got).toFixed(1)} (old ${mean(old).toFixed(1)})`);
    }
    // 2. each axis's lever table x 2^m (tiers I..IV), on the fitted base, the three in step
    const ax = Object.fromEntries(AXES.map(a => [a, { lo: -3, hi: 3, best: null }]));
    for (let r = 0; r <= ROUNDS; r++) {
      const patches = {};
      for (const a of AXES) { const c = ax[a]; c.m = r === 0 ? 0 : (c.lo + c.hi) / 2; patches[a] = `${best.patch}\nfor (let k = 1; k < ${LEVER[a]}.length; k++) ${LEVER[a]}[k] *= ${+(2 ** c.m).toPrecision(4)};`; }
      const got = await margins(patches);
      for (const a of AXES) { const c = ax[a]; if (!c.best || Math.abs(got[a] - old[a]) < Math.abs(c.best.got - old[a])) c.best = { m: c.m, got: got[a] }; if (r > 0) { if (got[a] < old[a]) c.lo = c.m; else c.hi = c.m; } }
      console.error(`axes round ${r}: ` + AXES.map(a => `${a} x${(2 ** ax[a].m).toFixed(3)} ${got[a].toFixed(1)} (old ${old[a].toFixed(1)})`).join("  "));
    }
    console.log(`${KIND} MATCH (waves ${FROM}-${TO}, ${TRIOS.length} trios x ${SEEDS.length} seeds): base damage x${(2 ** best.m).toFixed(4)}`);
    for (const a of AXES) console.log(`  ${a}: ${LEVER[a]}[1..6] x${(2 ** ax[a].best.m).toFixed(4)}  margin ${ax[a].best.got.toFixed(1)} vs old ${old[a].toFixed(1)}`);
  } else console.log("usage: node solmatch.mjs measure|fit <old.json> [rounds]");
}
