// THE BEST UPGRADE SEQUENCE A TRIO (owner, 2026-10-24: "for each trio find the best upgrade sequence to maximize credits left
// after beating Death" / "use checkpoint and rewind" / "prune dead branches"): a BEAM search over the game, a wave at a time.
// Each beam state is a checkpoint (a player snapshot) at a wave's start. Its children for that wave:
//   smart - the smart saver's own wave (sim.mjs smartWave: save, powers, then 1, 2, 3... buys, alt axes, rewinds)
//   buy   - ONE explicit purchase (a tower x an open axis, one tier), then the wave played saving (no powers, no buys)
// A child that loses a life or the game is DEAD and pruned (only if every child of every state dies does the best lossy smart
// child go on, its lives lost counted). Children with the same build keep the richest; the beam keeps the BEAM richest.
// Score: won, then lives, then credits left after Death (wave WIN_WAVE pays nothing).
// usage: node trioplan.mjs [beam=3] [seed=1] [out.jsonl]   env KINDS (default all seven), TRIOS=arc+grv+car,..., ASPIRA_PATCH,
// ASPIRA_WEB, POOL_WORKERS
import fs from "node:fs";
import { isMainThread } from "node:worker_threads";
import { makePlayer } from "./sim.mjs";
import { runPool } from "./pool.mjs";

const ok = G => !G.over || !!G.won; // a WIN ends the game too (G.over): alive
const BEAM = Number(process.argv[2] || 3), SEED = Number(process.argv[3] || 1), OUT = process.argv[4] || "";
const WIN = Number(process.env.WIN || 120); // WIN<120: a short test run (credits at that wave)

const sigOf = G => G.towers.map(t => t.kind + ":" + JSON.stringify(t.skills || {})).sort().join("|");

export default async function task({ trio, seed, beam }) {
  const strat = { up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220, core: ["temporal", "relay"], useCore: true };
  const p = makePlayer(strat, seed, WIN, 0.02, process.env.ASPIRA_PATCH || ""), g = p.g;
  const t0 = Date.now();
  let states = [{ snap: p.snapshot(), hist: [], lost: 0 }], plays = 0, dead = 0, end = "";
  while (true) {
    const G0 = g.G; if (G0.over || G0.won || G0.wave > WIN) break;
    const w0 = G0.wave, kids = [], lossy = [];
    const keep = (st, lost) => {
      const G = g.G, k = { snap: p.snapshot(), hist: p.hist ? p.hist.slice() : [], lost, money: G.money, sig: sigOf(G), lives: G.lives, over: G.over };
      return k;
    };
    for (const st of states) {
      // smart child
      p.restore(st.snap); p.hist = st.hist.slice(); const lives0 = g.G.lives;
      p.runTo(w0 + 1); plays++;
      if (ok(g.G) && g.G.lives >= lives0) kids.push(keep(st, st.lost)); else { dead++; if (ok(g.G)) lossy.push(keep(st, st.lost + lives0 - g.G.lives)); }
      // buy children: each tower x each open axis, one tier
      p.restore(st.snap);
      const opts = [];
      for (const t of g.G.towers) {
        if (t.lvl >= g.maxLvl(t) || g.pendingChoice(t) !== "skill") continue;
        for (const id of g.run(`SKILL_TREES[${JSON.stringify(t.kind)}].map(a => a.id)`)) if (((t.skills || {})[id] || 0) < g.axisCap(t, id)) opts.push([t.id, id]);
      }
      for (const [tid, id] of opts) {
        p.restore(st.snap); p.hist = st.hist.concat([{ wave: w0, snap: st.snap }]).slice(-33); // the checkpoint rides in the history, so a later dead end can rewind past this buy (smartWave's deeper rewind)
        const t = g.G.towers.find(x => x.id === tid), had = (t.skills || {})[id] || 0;
        if (!g.upgrade(t, id) || ((t.skills || {})[id] || 0) === had) continue;
        p.S.buys.push({ w: w0, k: t.kind, id: t.id, a: id, to: had + 1, by: "plan" });
        p.S.powersOk = false; p.S.buysLeft = 0;
        p.playWaveN(w0); plays++;
        if (ok(g.G) && g.G.lives >= lives0) kids.push(keep(st, st.lost)); else dead++;
      }
    }
    let pool = kids.length ? kids : lossy.sort((a, b) => b.lives - a.lives || b.money - a.money).slice(0, 1);
    if (!pool.length) { end = "dead at " + w0; break; } // every branch lost the game
    const best = new Map(); for (const k of pool) { const o = best.get(k.sig); if (!o || k.money > o.money) best.set(k.sig, k); }
    states = [...best.values()].sort((a, b) => b.money - a.money).slice(0, beam);
    p.restore(states[0].snap);
  }
  const top = states[0]; p.restore(top.snap);
  const r = p.result();
  return { trio: trio.join("+"), seed, won: r.won, wave: r.wave, lives: r.lives, lost: top.lost, money: r.money, end, plays, dead, s: Math.round((Date.now() - t0) / 1000),
    buys: p.S.buys.map(b => `${b.w}:${b.k}.${b.a}${b.to ? b.to : ""}`), build: r.build, econ: p.S.econ };
}

if (isMainThread && process.argv[1].endsWith("trioplan.mjs")) {
  const ALL = (process.env.KINDS || "arc,frz,sol,acd,grv,car,ifr").split(",");
  let trios = [];
  if (process.env.TRIOS) trios = process.env.TRIOS.split(",").map(s => s.split("+"));
  else for (let a = 0; a < ALL.length; a++) for (let b = a + 1; b < ALL.length; b++) for (let c = b + 1; c < ALL.length; c++) trios.push([ALL[a], ALL[b], ALL[c]]);
  // STREAMED AND RESUMABLE (owner, 2026-10-27: "break it into smaller actionable chunks" - a 3 h run wrote nothing till its end): every
  // trio lands in OUT.pool as it finishes ({ args, res }, runPool), a re-run skips the trios already there; OUT itself (flat rows, held.py)
  // is written at the end as before. Chunk a run with TRIOS=... (battery.sh `plan:` stages)
  const res = await runPool(new URL(import.meta.url), trios.map(trio => ({ trio, seed: SEED, beam: BEAM })), { quiet: true, out: OUT ? OUT + ".pool" : null });
  if (OUT) fs.writeFileSync(OUT, res.map(r => JSON.stringify(r)).join("\n") + "\n");
  console.log(`BEST UPGRADE SEQUENCE A TRIO (beam ${BEAM}, seed ${SEED}): credits left after Death`);
  for (const r of res.sort((a, b) => b.won - a.won || b.money - a.money))
    console.log(`${r.trio.padEnd(13)} ${r.won ? "WON " : "lost"} w${r.wave} lives ${r.lives} credits ${String(r.money).padStart(8)}  ${r.buys.length} buys  ${r.plays} plays ${r.dead} pruned ${r.s}s ${r.end}`);
}
