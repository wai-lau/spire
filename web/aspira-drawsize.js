// /spire - how big things are DRAWN, apart from their game size (split from aspira-defs.js, 2026-10-21). Loaded right after
// aspira-defs.js, in the page and the simulator (spawnEnemy sets e.drawJit). ARCHITECTURE.md 8.3
// how big each type is DRAWN, over its size (owner, 2026-10-15: "1.5x the visual size of swarm enemies", "0.9x the size of
// fast", "0.8x the size of shield units") - the look only: hits, drips and formation spacing still read ENEMIES[type].size
// SHIELD_BODY: a shield unit's BODY smaller again, its shield rings where they were (owner, 2026-10-18: "visually, shield enemies should be
// smaller (keep shield size same)") - the rings sit off size / SHIELD_BODY (shieldBase)
const SHIELD_BODY = { shield: 0.75 };
const DRAW_SIZE = { swarm: 1.5, fast: 0.9, shield: 0.8 * SHIELD_BODY.shield };
// EVERY enemy drawn 20% smaller (owner, 2026-10-21: "visually, make all enemies, towers, and core 20% smaller"), and a
// swarmer's drawn size jitter narrowed (same day: "double the size of the smallest ones, *.8 largest, squeeze everything
// else in between"): its 50-300% roll (spawnEnemy's jit, which still sets its HP and hit size) DRAWS at 100-240%, linear
// between - e.drawJit is drawn / rolled
const DRAW_ALL = 0.8, SWARM_JIT_LO = 0.5, SWARM_JIT_HI = 3, SWARM_DRAW_LO = 2 * SWARM_JIT_LO, SWARM_DRAW_HI = 0.8 * SWARM_JIT_HI;
const swarmDrawJit = j => (SWARM_DRAW_LO + (j - SWARM_JIT_LO) / (SWARM_JIT_HI - SWARM_JIT_LO) * (SWARM_DRAW_HI - SWARM_DRAW_LO)) / j;
// towers and the core DRAWN 20% smaller the same way: their hit, click and drag areas (TOWER_K, CORE_R) stay
const TOWER_DRAW_K = 0.8, CORE_DRAW_K = 0.8;
const drawSizeK = e => (DRAW_SIZE[e.type] || 1) * (e.drawJit || 1) * DRAW_ALL;
// shields DRAWN 35% smaller and 20% fainter (owner, 2026-10-21: "reduce shield opacity by 20% / reduce shield size by 35%")
const SHIELD_DRAW_K = 0.65, SHIELD_DRAW_A = 0.8;
const shieldBase = (e, size) => (size / (SHIELD_BODY[e.type] || 1) + SHIELD_OUT) * SHIELD_DRAW_K; // the shield's inner radius round a body drawn at size
