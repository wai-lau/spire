// The upgrade DESCRIPTION GRAPH (owner, 2026-10-07): for each tower, each axis
// is a chain 0 -> I .. IV of the tower's ONE composed sentence (aspira-desc.js
// describeTower) with only that axis raised; each edge is the few words that change, which is
// exactly what the tower card shows in track changes (aspira-sliders.js
// wordDiff). This prints the chains with the changed words marked *like this*
// and, beside each node, the MECHANIC it describes (the numbers from the game
// files), so the wording can be checked against the change it names.
// Rebuild the doc after editing a sentence or a number:
//   node scripts/aspira-desc-graph.mjs > docs/spire-descriptions.md
import { makeGame } from "./aspira-sim/sim.mjs";

const g = makeGame(1);
const V = expr => g.run(expr);
const pct = x => Math.round(x * 100) + "%";
// what each tier of each axis DOES, from the game's tables (index 0 = no point on the axis)
const x = v => Math.round(v * 100) / 100; // x1.3333333 -> x1.33
const MECH = {
  arc: {
    conductivity: k => { const c = V("ARC_CONDUCTIVITY")[k], r = V("SKILL_MOVE").arc.conductivity[k][0]; return `${c.s} strike${c.s > 1 ? "s" : ""}, ${c.j} jump${c.j > 1 ? "s" : ""}, forking ${c.f} ways${c.v ? `, re-strikes ${c.v}x` : ""}, jumps reach x${x(c.r)}, range x${x(r)}`; },
    voltage: k => `forks ${V("VOLT_FORK")[k]} ways, each jump keeps ${pct(V("ARC_VOLTAGE_FALL")[k])} of the hit before it, range x${x(V("SKILL_MOVE").arc.voltage[k][0])}`,
    capacitance: k => { const b = V("ARC_CAPACITANCE")[k]; return b ? `${b.n} charge${b.n > 1 ? "s" : ""} a hit, each ${pct(b.frac)} of it; the next hit bursts them all, r${V("ARC_BURST_R")}, slowing ${pct(V("ARC_STAT_SLOW")[k])} for ${V("STAT_SLOW_T")}s, slide x${x(V("SKILL_MOVE").arc.capacitance[k][1])}` : "no charge"; },
  },
  frz: {
    temp: k => `aura slow ${pct(V("FRZ_TEMP_SLOW")[k])}, tick every ${V("FRZ_TEMP_TICK")[k]}s x(1 + ${V("FRZ_CHILL_K")} x slow), aura width x${x(V("SKILL_MOVE").frz.temp[k][0])}${V("FRZ_BRITTLE")[k] > 1 ? `, brittle: takes x${V("FRZ_BRITTLE")[k]} from every tower` : ""}`,
    rime: k => (V("FRZ_RIME")[k] ? `a pulse every ${V("FRZ_RIME_PERIOD")[k]}s leaves +${x(V("FRZ_RIME")[k] * 100)}% slow, permanent and stacking (full at ${pct(V("FRZ_RIME_FULL"))}, then spreads); full frost takes ${pct(V("FRZ_RIME_CRACK")[k])} of an armored enemy's armor; slide x${x(V("SKILL_MOVE").frz.rime[k][1])}` : "no pulses"),
    moons: k => (V("FRZ_MOON_COUNT")[k] ? `${V("FRZ_MOON_COUNT")[k]} moon${V("FRZ_MOON_COUNT")[k] > 1 ? "s" : ""} at ${pct(V("FRZ_MOON_BY")[k])} of the tower${V("FRZ_SUBMOON_N")[k] ? `, each with ${V("FRZ_SUBMOON_N")[k]} small moon${V("FRZ_SUBMOON_N")[k] > 1 ? "s" : ""}` : ""}` : "no moons"),
  },
  sol: {
    focus: k => `${V("SOL_BEAMS")[k]} beam${V("SOL_BEAMS")[k] > 1 ? "s" : ""} per shot, each a full hit, passing through ${V("SOL_PASS_N")[k] === Infinity ? "every enemy" : V("SOL_PASS_N")[k] + " more"} at ${pct(V("SOL_PASS")[k])}, range x${x(V("SKILL_MOVE").sol.focus[k][0])}`,
    refraction: k => `${V("SOL_REFRACTION")[k]} reflection${V("SOL_REFRACTION")[k] === 1 ? "" : "s"} in a chain, ${V("SOL_FAN_BY")[k]} chain${V("SOL_FAN_BY")[k] === 1 ? "" : "s"} off the first enemy, range x${x(V("SKILL_MOVE").sol.refraction[k][0])}`,
    breach: k => `every hit strips ${V("SOL_BREACH_ARMOR")[k]} armor for good${k ? `, scorch ${V("SOL_SCORCH_K")} of the hit` : ""}, crit x${V("SOL_CRIT_K")}, slide x${x(V("SKILL_MOVE").sol.breach[k][1])}`,
  },
  acd: {
    corrosion: k => (V("ACD_CORRODE")[k] ? `a tick strips ${pct(V("ACD_CORRODE")[k])} of its damage from armor, below zero; eaten armor drops goo (pull ${V("ACD_DRIP_PULL")[k]})` : "no armor strip"),
    spray: k => `${V("ACD_LINES")[k]} jet${V("ACD_LINES")[k] > 1 ? "s" : ""}, a jet carries ${pct(V("ACD_FLOW_CARRY")[k])} of its ramp to the next enemy, range x${x(V("SKILL_MOVE").acd.spray[k][0])}`,
    contagion: k => { const c = V("ACD_CONTAGION")[k]; return c ? `a pool every ${c.every}s per jet, lasting ${c.life}s, radius ${c.r}, at ${pct(V("ACD_POOL_HEAT"))} of the jet, slowing ${pct(V("ACD_POOL_SLOW")[k])}, slide x${x(V("SKILL_MOVE").acd.contagion[k][1])}` : "no pools"; },
  },
};
// the words that change from a to b, b's changed words marked *so* (the card's wordDiff, in text)
function mark(a, b) {
  const A = a.split(" "), B = b.split(" "), same = (x, y) => x.toLowerCase() === y.toLowerCase(); // a case change is no change (the card's wordDiff)
  const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = same(A[i], B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, ins = [];
  const flush = () => { if (ins.length) out.push("*" + ins.join(" ") + "*"); ins = []; };
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && same(A[i], B[j])) { flush(); out.push(B[j]); i++; j++; }
    else if (j < B.length && (i >= A.length || L[i][j + 1] >= L[i + 1][j])) ins.push(B[j++]);
    else i++;
  }
  flush();
  return out.join(" ");
}
const roman = ["0", "I", "II", "III", "IV", "V"];
let md = "# The Spire - upgrade descriptions, as a graph\n\nGenerated by `scripts/aspira-desc-graph.mjs` from `web/aspira-desc.js` (the tower's composed sentence, one axis raised at a time) and the game's balance tables. Each axis is a chain 0 -> I .. IV (IV = the capstone, one axis a tower); a child's changed words are marked *like this* - exactly what the tower card shows in track changes when that tier is pulled from the one before it. The mechanic column is what the words must stay true to.\n";
for (const kind of Object.keys(V("SKILL_TREES"))) {
  md += `\n## ${V(`TOWERS[${JSON.stringify(kind)}].name`)} (${kind.toUpperCase()})\n`;
  for (const ax of V(`SKILL_TREES[${JSON.stringify(kind)}]`)) {
    md += `\n### ${ax.name}\n\n| tier | sentence (changes from the tier before marked) | mechanic |\n|---|---|---|\n`;
    const chain = [0, 1, 2, 3, 4, 5].map(k => V(`describeTower(${JSON.stringify(kind)}, { ${ax.id}: ${k} })`));
    chain.forEach((sentence, k) => { md += `| ${roman[k]} | ${k ? mark(chain[k - 1], sentence) : sentence} | ${MECH[kind]?.[ax.id]?.(k) ?? "-"} |\n`; });
  }
}
process.stdout.write(md);
