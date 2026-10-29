// THE REFACTOR FINGERPRINT (scripts/aspira-sim/fp.sh): six fixed-seed trio games to wave 40, rewind off, every result field - a
// behaviour-preserving commit prints exactly what its parent prints. Run from the snapshot fp.sh unpacks (it plays THAT tree's web/)
import { makePlayer } from "./sim.mjs";
const TRIOS = [["arc", "frz", "sol"], ["acd", "grv", "crr"], ["ifr", "arc", "grv"]];
const out = [];
for (const trio of TRIOS) for (const seed of [1, 2]) {
  const p = makePlayer({ up: 0.5, maxTowers: 3, opening: trio, mix: Object.fromEntries(trio.map(k => [k, 1])), econ: "smart", threat: 220,
    core: ["temporal", "relay"], useCore: true, rewind: false }, seed, 40, 0.02, "");
  p.runTo(41); out.push({ trio: trio.join("+"), seed, r: p.result() });
}
console.log(JSON.stringify(out));
