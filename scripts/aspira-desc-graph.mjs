// The upgrade DESCRIPTION GRAPH (owner, 2026-10-07): for each tower, each axis
// is a chain 0 -> I .. V of the tower's ONE composed sentence (aspira-desc.js
// describeTower) with only that axis raised; each edge is the few words that change, which is
// exactly what the tower card shows in track changes (aspira-sliders.js
// wordDiff). This prints the chains with the changed words marked *like this*
// and, beside each node, the MECHANIC it describes (the numbers from the game
// files), so the wording can be checked against the change it names.
// Rebuild the doc after editing a sentence or a number:
//   node scripts/aspira-desc-graph.mjs > docs/spire-descriptions.md
import { makeGame } from "./aspira-sim/sim.mjs";

const g = makeGame(1);
// live numbers (armor strips as a share of armor, wording rule 10) read at THIS wave - at wave 1 every strip sits at its 90% cap
const DOC_WAVE = 100;
g.run(`G.wave = ${DOC_WAVE}`);
const V = expr => g.run(expr);
const pct = x => Math.round(x * 100) + "%";
// what each tier of each axis DOES, from the game's tables (index 0 = no point on the axis)
const x = v => Math.round(v * 100) / 100; // x1.3333333 -> x1.33
const ST = (kind, ax, k) => V(`(() => { const sk = { ${ax}: ${k} }; return towerStats({ id: 99, kind: ${JSON.stringify(kind)}, x: CX, y: CY, lvl: 1 + towerLevel({ kind: ${JSON.stringify(kind)}, skills: sk }), skills: sk }, true); })()`);
const MECH = {
  arc: {
    conductivity: k => `each jump keeps ${pct(V("ARC_AMP_FALL")[k])} of the hit before it`, // Amperage (the ARC redesign, 2026-10-29)
    voltage: k => `${V("ARC_VOLT_JUMPS")[k]} jumps${k >= V("ARC_FORK_FROM") ? "" : ` (${V("ARC_VOLT_JUMPS")[k] + 1} enemies hit)`}, each reaching ${V("ARC_VOLT_REACH")[k]} u from the enemy before${k >= V("ARC_FORK_FROM") ? "; the strike forks once into two chains, nothing after" : ""}; a bolt never hits a unit twice`,
    capacitance: k => (V("ARC_RES_SLOW")[k] ? `every hit slows ${pct(V("ARC_RES_SLOW")[k])} for ${V("STAT_SLOW_T")}s (never a shielded enemy) and breaks ${pct(V("ARC_RES_STRIP")[k])} x the wave's armor reference` : "no slow, no armor break"), // Resistance
  },
  frz: {
    temp: k => `aura slow ${pct(V("FRZ_TEMP_SLOW")[k])}, tick every ${V("FRZ_TEMP_TICK")[k]}s ${k ? `x(1 + ${V("FRZ_CHILL_K")} x slow)` : `a flat nip, x${V("FRZ_NIP")} a tick`}${V("FRZ_BRITTLE")[k] > 1 ? `, brittle: takes x${V("FRZ_BRITTLE")[k]} from every tower` : ""}`,
    rime: k => (V("FRZ_RIME")[k] ? `a pulse every ${V("FRZ_RIME_PERIOD")[k]}s leaves +${x(V("FRZ_RIME")[k] * 100)}% slow, permanent and stacking (full at ${pct(V("FRZ_RIME_FULL"))}, then spreads)${V("FRZ_RIME_CRACK")[k] ? `; full frost takes ${pct(V("FRZ_RIME_CRACK")[k])} of an armored enemy's armor` : ""}` : "no pulses"),
    moons: k => (V("FRZ_MOON_COUNT")[k] ? `${V("FRZ_MOON_COUNT")[k]} moon${V("FRZ_MOON_COUNT")[k] > 1 ? "s" : ""} at ${pct(V("FRZ_MOON_BY")[k])} of the tower${V("FRZ_SUBMOON_N")[k] ? `, each with ${V("FRZ_SUBMOON_N")[k]} small moon${V("FRZ_SUBMOON_N")[k] > 1 ? "s" : ""}` : ""}` : "no moons"),
  },
  sol: {
    focus: k => (V("SOL_SCORCH_N")[k] ? `every hit burns ${pct(V("SOL_SCORCH_TOTAL"))} of itself over ${V("SOL_SCORCH_N")[k]} ticks, the rod one burn on every enemy it sweeps, one every ${V("SOL_SCORCH_Q")}s, stacking without cap` : "no burn") + ``,
    refraction: k => `every hit splits to the ${V("SOL_SPLIT")[k]} nearest enemies further down a band ${V("SOL_BAND_W")[k]} u either side of the aim (none: it flies on to the cone's wall, splits or mirrors there), each split (and wall bounce) carrying ${pct(V("SOL_HOP")[k])} of the hit before, ending under 5%`,
    breach: k => (V("SOL_BREACH_ARMOR")[k] ? `every hit strips ${pct(V("SOL_BREACH_ARMOR")[k])} of the armor left` : "no armor strip") + `, crit x${V("SOL_CRIT_K")}`,
  },
  acd: {
    corrosion: k => (V("ACD_CORRODE")[k] ? `a tick strips ${pct(V("ACD_CORRODE")[k])} of its damage from armor (a share of what is left); eaten armor drops goo (pull ${V("ACD_DRIP_PULL")[k]})` : "no armor strip"),
    spray: k => `${V("ACD_LINES")[k]} jet${V("ACD_LINES")[k] > 1 ? "s" : ""}, a jet carries ${pct(V("ACD_FLOW_CARRY")[k])} of its ramp to the next enemy`,
    contagion: k => { const c = V("ACD_CONTAGION")[k]; return c ? `a pool every ${c.every}s per jet, lasting ${c.life}s, radius ${c.r}, at ${pct(V("ACD_POOL_HEAT"))} of the jet, slowing ${pct(V("ACD_POOL_SLOW")[k])}` : "no pools"; },
  },
  // (GRV, CRR, IFR: read off the tower's stats at that tier - towerStats, one axis raised)
  grv: {
    void: k => { const s = ST("grv", "void", k); return `void starts at mass ${s.startM}, crush tick x${s.innerK} the hit${s.big ? ", heavier cap" : ""}`; },
    supernova: k => { const s = ST("grv", "supernova", k); return s.novaN ? `${s.novaN} novas before each void, rate x${x(s.rate / ST("grv", "supernova", 0).rate)}, each strips ${pct(s.strip)} of the armor left` : "no novas"; },
    radiation: k => { const s = ST("grv", "radiation", k); return (s.auraOn ? `aura x${s.accR} the void's radius, slow ${pct(s.slow)} (x2 inside${s.horizon ? ", all of it" : ""}), ` : "no aura, ") + `pellets ${x(s.pelletK)}x the hit, reach x${s.pelReach}, ${x(s.pellets)} a mass lost`; },
  },
  crr: {
    hangar: k => { const s = ST("crr", "hangar", k); return `${s.wing} interceptor${s.wing > 1 ? "s" : ""}, ${s.hold} held circling`; },
    launch: k => { const s = ST("crr", "launch", k); return s.tSlow ? `tether slow ${pct(s.tSlow)}, +${pct(s.tAmp)} damage taken, each tether its own${s.tChain ? ", chains to one more" : ""}` : "no tether"; },
    armament: k => { const s = ST("crr", "armament", k); return `${s.bolts} bolt${s.bolts > 1 ? "s" : ""} a volley, ${s.ammo} shots${s.autopilot ? ", autopilot" : ""}`; },
  },
  ifr: {
    meteor: k => { const s = ST("ifr", "meteor", k); return `1 meteor + a burst of ${s.fan}, ${s.store} stored in orbit, charge ${+s.chargeS.toFixed(2)}s`; },
    hellfire: k => { const s = ST("ifr", "hellfire", k); return s.fire ? `a fire, radius ${x(s.fireR)}, growth ${x(s.fireV)}` : "no fire"; },
    firaga: k => { const s = ST("ifr", "firaga", k); return s.flares ? `flares ${x(s.beamL)} long, ${x(s.beamW)} wide, burning ${x(s.burnS)}s at a tick every ${s.tickS}s${s.triple ? ", three at the impact" : ""}` : "no flares"; },
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
let md = "# The Spire - upgrade descriptions, as a graph\n\nLive numbers (armor strips) at wave " + DOC_WAVE + ". Generated by `scripts/aspira-desc-graph.mjs` from `web/aspira-desc.js` (the tower's composed sentence, one axis raised at a time) and the game's balance tables. Each axis is a chain 0 -> I .. V (V = the capstone, one axis a tower); a child's changed words are marked *like this* - exactly what the tower card shows in track changes when that tier is pulled from the one before it. The mechanic column is what the words must stay true to.\n";
for (const kind of Object.keys(V("SKILL_TREES"))) {
  md += `\n## ${V(`TOWERS[${JSON.stringify(kind)}].name`)} (${kind.toUpperCase()})\n`;
  for (const ax of V(`SKILL_TREES[${JSON.stringify(kind)}]`)) {
    md += `\n### ${ax.name}\n\n| tier | sentence (changes from the tier before marked) | mechanic |\n|---|---|---|\n`;
    const chain = [0, 1, 2, 3, 4, 5].map(k => V(`describeTower(${JSON.stringify(kind)}, { ${ax.id}: ${k} })`));
    chain.forEach((sentence, k) => { md += `| ${roman[k]} | ${k ? mark(chain[k - 1], sentence) : sentence} | ${MECH[kind]?.[ax.id]?.(k) ?? "-"} |\n`; });
  }
}
process.stdout.write(md);
