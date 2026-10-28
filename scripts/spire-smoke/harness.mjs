// /spire smoke HARNESS (split from smoke.mjs, tier redesign 2026-10-24): boot the page's scripts into a node vm, register
// checks, report. smoke.mjs and tiers.mjs both register here; smoke.mjs reports once all are in.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { makeDom } from "./dom.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "api/templates/aspira.html"), "utf8");
const SCRIPTS = [...TEMPLATE.matchAll(/src="\/(aspira[^"?]*\.js)/g)].map(m => m[1]);

function boot(store = {}, view = { w: 390, h: 844 }) { // portrait by default: the lanes turn with the box only from Task 3 on
  const dom = makeDom(TEMPLATE, store, view);
  const ctx = vm.createContext(dom.globals);
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(path.join(ROOT, "web", f), "utf8"), ctx, { filename: f });
  return { ctx, dom, run: src => vm.runInContext(src, ctx) };
}

// the IFR checks' helpers (smoke.mjs and ifr.mjs each define them in their own page env, 2026-10-28)
function ifrHelpers(run) {
// an enemy held still on lane 0 at about `dist` u from tower t (its lane point nearest that distance); shield / hp settable after
// the IFR checks below test the fire, the fan and the flares: since the tier redesign (2026-10-24) a tier 0 IFR has none of them, so
// each buys tier I of every axis it left at 0 (ifrAll, after its own upgrades)
  run(`function ifrAll(t, axes = ["meteor", "hellfire", "firaga"]) { for (const ax of axes) if (!skillOf(t, ax)) upgradeTower(t, ax, true); return t; }`);
  run(`function ifrNear(type, t, dist) {
  spawnEnemy(type, 30, 0, 0); const e = G.enemies[G.enemies.length - 1]; let bs = entryS(0), bd = Infinity;
  for (let s = entryS(0); s < PATHS[0].len; s += 4) { const p = pathAt(0, s, 0), d = Math.abs(Math.hypot(p.x - t.x, p.y - t.y) - dist); if (d < bd) { bd = d; bs = s; } }
  const p = pathAt(0, bs, 0); e.s = bs; e.x = p.x; e.y = p.y; e.stunT = 1e9; e.seen = true; e.hp = e.max = 1e6; e.armor = 0; e.shield = 0; return e;
}`);
}

const results = [];
function check(name, fn) {
  try { const why = fn(); results.push([name, why ? "FAIL: " + why : "ok"]); } catch (e) { results.push([name, "FAIL: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | ")]); }
}
// A PERF CHECK'S TIME on a busy box (2026-10-28: two false failures in a day under a balance pool, each passing alone): the fastest of n
// runs of src on the HOST clock; still over the limit while the 1-min load is above the core count, it waits 2 s and measures once more.
// note: the load, for the failure line
function perfMin(run, src, limit, n = 30) {
  const one = () => { let ms = Infinity; for (let i = 0; i < n; i++) { const t0 = performance.now(); run(src); ms = Math.min(ms, performance.now() - t0); } return ms; };
  let ms = one(), again = false; const load = os.loadavg()[0], cores = os.cpus().length;
  if (ms >= limit && load > cores) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000); ms = Math.min(ms, one()); again = true; }
  return { ms, note: " (load " + load.toFixed(1) + " on " + cores + " cores" + (again ? ", measured again" : "") + ")" };
}
// draw calls on EVERY canvas during fn (3D: the board texture, the moving layer, #asp-ent)
function drawn(env, fn) {
  for (const r of env.dom.recs) { r.n = 0; r.ops = {}; }
  fn();
  return { n: env.dom.recs.reduce((a, r) => a + r.n, 0) };
}
// how often each named game function ran during fn (they are vm globals, so they can be wrapped)
function calls(env, names, fn) {
  const seen = Object.fromEntries(names.map(n => [n, 0])), orig = {};
  for (const n of names) {
    orig[n] = env.ctx[n];
    if (typeof orig[n] !== "function") throw new Error(n + " is not a function");
    env.ctx[n] = function (...a) { seen[n]++; return orig[n].apply(this, a); };
  }
  try { fn(); } finally { for (const n of names) env.ctx[n] = orig[n]; }
  return seen;
}
const frames = (env, n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) env.dom.tick(dt); };

function report() {
  const bad = results.filter(r => r[1] !== "ok");
  for (const [n, r] of results) console.log((r === "ok" ? "  ok    " : "  FAIL  ") + n + (r === "ok" ? "" : "\n          " + r.slice(6)));
  console.log(bad.length ? `\nspire smoke: ${bad.length} of ${results.length} FAILED` : `\nspire smoke: all ${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
}
export { ROOT, TEMPLATE, SCRIPTS, boot, results, check, drawn, calls, frames, report, ifrHelpers, perfMin };
