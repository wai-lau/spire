// /spire - THE DEMO SCENES' LAYOUTS (owner, 2026-11-03: "Yes at specific layout per tower, ensure that the demo shows off the upgrade (include
// damage numbers)"; "show moving enemies that get slowed to represent slow, use fast enemies and non-fast to demonstrate extra effect on fast";
// "Add a mechanism to ensure demo scenes are always up to date").
// THE REGISTRY: a layout for every tower's tier 0 (`base`) and for every axis (tiers I..V of it) - the smoke FAILS on a tower or axis with
// none, or a layout naming one that is gone (demo.mjs, the coverage gate). A layout is WHERE its enemies stand or walk, in shares of the
// tower's LIVE range (towerStats - never a number of its own), and `shows`: what the scene must visibly do, each checked by the smoke from
// the scene's tallies (demoShows) - so a mechanic change that stops a scene showing its effect cannot commit (ARCHITECTURE §11).
//   hits     the tower damages an enemy            many    2+ enemies take damage (chains, splits, splash, a wing)
//   strips   an armored enemy loses armor           pops    a shielded enemy loses a shield charge
//   slows    a walker loses 10%+ of its pace         fast    the fast walker loses a bigger share of its pace than the non-fast one (FAST_SLOW_MUL)
// Places: `clump` - a loose knot at `at` x range out; `fan` - spread across the range; `line` - a file away from the tower; `walk` -
// walkers along the lane stretch inside the range, staggered, looping
const DEMO_SOL_ROWS = 14; // SOL's rows a lane: twice the rest (owner, 2026-11-06: "also SOL demo needs more enemies" - Reflection V splits to 8)
const DEMO_LAYOUTS = {
  arc: {
    base: { place: "walk", types: ["swarm", "swarm", "armor", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    conductivity: { place: "walk", types: ["swarm", "swarm", "armor", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    voltage: { place: "walk", types: ["swarm", "swarm", "swarm", "armor", "swarm", "swarm", "swarm", "swarm"], shows: ["hits", "many"] },
    capacitance: { place: "walk", types: ["armor", "swarm", "armor", "swarm", "armor"], shows: ["hits", "many", "strips"] },
  },
  frz: {
    base: { place: "walk", types: ["fast", "swarm"], shows: ["hits", "slows", "fast"] },
    temp: { place: "walk", types: ["fast", "swarm", "armor"], shows: ["hits", "slows", "fast"] },
    rime: { place: "walk", types: ["fast", "swarm", "armor"], shows: ["hits", "slows", "fast"] },
    moons: { place: "walk", types: ["fast", "swarm", "swarm"], shows: ["hits", "slows", "fast"] },
  },
  sol: {
    base: { place: "walk", rows: DEMO_SOL_ROWS, types: ["swarm", "swarm", "swarm", "swarm", "swarm", "swarm", "swarm", "swarm"], shows: ["hits"] }, // (MORE ENEMIES, twice the count: owner, 2026-11-06 "also SOL demo needs more enemies") (a plain line: the beam holds one walker till it dies - Leader, 2026-11-04)
    focus: { place: "walk", rows: DEMO_SOL_ROWS, types: ["shield", "armor", "shield", "shield", "armor", "shield"], shows: ["hits", "slows", "pops"] }, // (shields: Scorch V's ticks pop them - owner, 2026-11-04 "more ticks vs shield"; "pops" since the tracking beam, 7.6.0 - the old shot left a tier-I shield whole)
    refraction: { place: "walk", rows: DEMO_SOL_ROWS, types: ["fast", "swarm", "fast", "swarm", "fast", "swarm", "fast", "swarm", "fast", "swarm"], shows: ["hits", "many"] }, // (TEN: Reflection V splits to 8 others - with 5 it showed 4 at most, and its pulse cleared them between flashes: owner, 2026-11-06 "in demo SOL reflected beam is not visible at refl 5") (spread fast: the splits reach what the first beam cannot - Leader, 2026-11-04)
    breach: { place: "walk", rows: DEMO_SOL_ROWS, types: ["armor", "armor", "armor", "armor", "armor", "armor", "armor", "armor"], shows: ["hits", "strips"] },
  },
  acd: {
    base: { place: "walk", types: ["swarm", "armor", "swarm"], shows: ["hits"] },
    corrosion: { place: "walk", types: ["armor", "armor", "swarm"], shows: ["hits", "strips"] },
    spray: { place: "walk", types: ["swarm", "swarm", "armor", "swarm", "swarm"], shows: ["hits", "many"] },
    contagion: { place: "walk", types: ["swarm", "armor", "swarm", "swarm"], shows: ["hits", "many"] },
  },
  grv: {
    base: { place: "walk", types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits"] }, // (tier 0's void holds one at a time)
    void: { place: "walk", types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits", "many"] },
    supernova: { place: "walk", dy: 0.2, types: ["armor", "swarm", "armor", "swarm", "shield"], shows: ["hits", "many", "strips"] },
    radiation: { place: "walk", types: ["fast", "armor"], shows: ["hits", "slows", "fast"] }, // (armor, not swarm: GRV slows small enemies harder)
  },
  crr: {
    base: { place: "walk", types: ["swarm", "shield", "armor", "swarm"], shows: ["hits", "pops"] },
    hangar: { place: "walk", types: ["swarm", "shield", "swarm", "armor", "swarm"], shows: ["hits", "many", "pops"] },
    launch: { place: "walk", types: ["fast", "swarm"], shows: ["hits", "slows"] }, // (no "fast": the bolt slow that also slowed the swarm is gone, 2026-11-04 - only the tethered are slowed)
    armament: { place: "walk", types: ["shield", "swarm", "shield", "armor", "swarm", "swarm"], shows: ["hits", "pops"] }, // (two more walkers: a wing twice the size, 2026-11-04, launches every interceptor)
  },
  ifr: {
    base: { place: "walk", types: ["swarm", "shield", "swarm", "shield", "swarm"], shows: ["hits", "pops"] },
    meteor: { place: "walk", types: ["swarm", "swarm", "swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits", "many", "pops"] }, // (a longer pack: the fan's shards fly straight, no homing - only what sits on their lines is hit, 2026-11-04)
    hellfire: { place: "walk", types: ["swarm", "shield", "swarm", "swarm", "shield", "swarm"], shows: ["hits", "many", "pops"] },
    firaga: { place: "walk", types: ["swarm", "shield", "swarm", "shield"], shows: ["hits", "pops"] },
  },
};
// the layout a card shows for tower `t` previewed as `pv`: the axis being bought (pv over t), else the tower's highest axis, else its tier 0
const DEMO_NUM_GAP = 1.6;
function demoLayoutKey(t, pv) {
  const axes = SKILL_TREES[t.kind] || [], up = pv ? axes.find(ax => skillOf(pv, ax.id) > skillOf(t, ax.id)) : null;
  const top = axes.reduce((b, ax) => (skillOf(pv || t, ax.id) > (b ? skillOf(pv || t, b.id) : 0) ? ax : b), null);
  return (up || top || { id: "base" }).id;
}
// the enemy list for a scene of `kind` (its stats `st`) on slot `cell`, from layout `L` - every spot in shares of the live range
// The scene's camera centres the tower (demoView3d). Walkers (owner, 2026-11-03: "have the enemies travel right to left to make use of the
// space"): two straight lanes of the scene's own, right to left, above and below the tower (below)
// WALKERS ONLY (owner, 2026-11-03: "how about no static enemies in the demos"): every scene's enemies walk two straight lanes of the scene's
// own, right to left across the whole box (owner: "have the enemies travel right to left ... have two lanes, one above and one below, this
// way, the enemies don't run into the tower"), DEMO_LANE_DY x the range above and below the tower. On a lane they walk as a PACK, the number
// gap apart (DEMO_NUM_GAP x the biggest damage number), so chains, splits, splash and pools still catch several and every number reads;
// a scene with a fast walker puts the fast on the upper lane and the rest on the lower (the same distance: a fair comparison), else the
// types alternate. Each lap starts at the right edge with its health full and its armor and shields back (demoFrame)
function demoPlace0(kind, st, cell, L) {
  const c = CELLS[cell], r = st.range || 120, T = L.types, n = T.length;
  const span = DEMO_BOX_AR - 2 * DEMO_TOWER_X, xr = r * (DEMO_BOX_AR - DEMO_TOWER_X) / span + DEMO_BOX_OVER, xl = r * DEMO_TOWER_X / span + DEMO_BOX_OVER, /* the box in world u under demoView3d's zoom (the range's far edge DEMO_TOWER_X box heights from the right edge) */ dy = (L.dy || DEMO_LANE_DY) * r, /* L.dy: a layout's own lane offset (Nova: nearer the middle, so Hypernova's flash has room - grvNovaFit) */ /* (60 u past each edge) */ pace = PATHS.slice(0, N_PATHS).reduce((a, P) => a + P.pace, 0) / N_PATHS;
  const lane = y => { const pts = []; for (let x = c.x + xr, s = 0; x >= c.x - xl - 1e-6; x -= 8, s += 8) pts.push({ x, y, s }); return { pts, len: pts[pts.length - 1].s, pace, rim: pts[pts.length - 1], demo: true }; };
  // THE LATTICE (owner, 2026-11-06: "each lane in demo should send units in a 3-wide lattice with random 50% empty"): each of the two lanes
  // is THREE parallel paths DEMO_LAT_W x the range apart (its slots: left / centre / right across it); rows come in along it D (the lane over
  // L.rows or DEMO_LAT_ROWS rows) apart (at least the number gap), each slot filled or empty at 50% by a seeded hash (row, slot, lane, the scene's seed - no Math.random);
  // a lane's types cycle the layout's (a fast scene: the fast on the upper lane, the rest below). It replaces the layouts' walker counts:
  // L.types is the MIX now, not the number. Rows enter at the right edge as the last moved D on (demoLatStep, aspira-demo.js)
  const w = DEMO_LAT_W * r, hasFast = T.includes("fast"), g = DEMO_NUM_GAP * (DMG_PX_MIN + DMG_PX_SPAN);
  const yc = dy - DEMO_LAT_IN * r, lanes = [c.y - yc, c.y + yc].flatMap(y0 => [-1, 0, 1].map(j => lane(y0 + j * w))); // (the lanes' centres a little in, so the outer slot stays in the box)
  const lt = [0, 1].map(ln => T.filter((type, i) => (hasFast ? (type === "fast") === (ln === 0) : i % 2 === ln)));
  const len = lanes[0].len, D = Math.max(g, (len - 2 * DEMO_BOX_OVER) / (L.rows || DEMO_LAT_ROWS)), lead = Math.max(DEMO_BOX_OVER, xr - 0.9 * r); // (the scene OPENS with each lane's lead row at the range's edge)
  const seed = demoHash(cell, kind.charCodeAt(0), kind.charCodeAt(1), kind.charCodeAt(2)) * 1e6 | 0, lat = { D, seed, types: lt, row: [0, 0], tk: [0, 0], at: [0, 0] }, list = [];
  for (let ln = 0; ln < 2; ln++) for (let s0 = lead; s0 >= DEMO_BOX_OVER - 1e-6; s0 -= D) list.push(...demoLatRow(lat, ln, s0 / len));
  list.lanes = lanes; list.lat = lat; return list;
}
const DEMO_LAT_W = 0.08, DEMO_LAT_IN = 0.04, DEMO_LAT_ROWS = 7; // the slots' spacing across a lane (x the range); about this many rows along a lane at once
const demoHash = (a, b, c, d) => { let h = Math.imul(a | 0, 0x9E3779B1) ^ Math.imul((b | 0) + 0x7F4A7C15, 0x85EBCA6B) ^ Math.imul((c | 0) + 0x165667B1, 0xC2B2AE35) ^ Math.imul((d | 0) + 0x27D4EB2F, 0x27D4EB2F); h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
function demoLatRow(lat, ln, at) { // one row on lane ln, `at` of the way along it: each of its 3 slots filled at 50%
  const T = lat.types[ln], out = [], row = lat.row[ln]++; if (!T.length) return out;
  for (let j = 0; j < 3; j++) if (demoHash(row, j, ln, lat.seed) < 0.5) out.push({ type: T[lat.tk[ln]++ % T.length], lane: ln * 3 + j, at });
  return out;
}
const DEMO_LANE_DY = 0.45;
function demoPlace(kind, st, cell, L) { return demoPlace0(kind, st, cell, L); }
// THE BOX in world terms (demoView3d): the range ellipse x DEMO_FIT high, DEMO_BOX_AR x that wide, centred on the tower; what an enemy needs
// round its spot - its die below, its die and the biggest number above, DEMO_EDGE to spare (smoke: "every walker inside the box")
const DEMO_EDGE = 6, demoNumRoom = () => DMG_PX_MIN + DMG_PX_SPAN;
// how far a walker's drawing reaches from its spot: its drawn size (DRAW_SIZE, DRAW_ALL), x1.75 for a die's corners, + a shield's ring
const demoReach = type => ENEMIES[type].size * (DRAW_SIZE[type] || 1) * DRAW_ALL * 1.75 + (type === "shield" ? 14 : 0);
function demoSpan(r) { const c = Math.cos(warpTilt()), hh = r * c * DEMO_FIT; return { c, hh, hw: hh * DEMO_BOX_AR }; }
// what a scene showed, from its tallies: the `shows` names it passed
function demoShows(S) {
  const E = S.T.map(t => ({ type: t.type, demo: t.demo, tally: t })), hit = E.filter(e => e.tally.dmg > 0), out = []; // (every walker the scene had, the killed too)
  if (hit.length) out.push("hits"); if (hit.length >= 2) out.push("many");
  if (E.some(e => e.demo.armor > 0 && e.tally.armor < e.demo.armor)) out.push("strips");
  if (E.some(e => e.demo.shield > 0 && e.tally.shield < e.demo.shield)) out.push("pops");
  const slow = E.filter(e => e.demo.walk && e.tally.slow > 0.1); if (slow.length) out.push("slows");
  // FAST: every slow hits a fast enemy FAST_SLOW_MUL x as hard (applySlow, aspira-game.js), shaped toward fastSlowCap(): the fast walker
  // loses MORE of its pace than the non-fast one, at least min(1.5, 0.75 x FAST_SLOW_MUL) x as much - or as much as one tower's slow can
  // take off a fast enemy at all, slowShape(TOWER_SLOW_MAX, fastSlowCap()) (a strong slow nears both caps: FRZ 0.73 vs 0.70)
  const share = f => Math.max(0, ...E.filter(e => e.demo.walk && f(e) && !(e.demo.shield > 0)).map(e => e.tally.slow));
  const fs = share(e => e.type === "fast"), bs = share(e => e.type !== "fast"), need = Math.min(1.5, 0.75 * FAST_SLOW_MUL);
  if (FAST_SLOW_MUL > 1 && bs > 0.05 && fs > bs && (fs >= need * bs || fs >= slowShape(TOWER_SLOW_MAX, fastSlowCap()) - 0.02)) out.push("fast");
  S.fastShare = [fs, bs]; // (what the smoke prints on a miss)
  return out;
}
