// /spire smoke HARNESS (split from smoke.mjs, tier redesign 2026-10-24): boot the page's scripts into a node vm, register
// checks, report. smoke.mjs and tiers.mjs both register here; smoke.mjs reports once all are in.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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

const results = [];
function check(name, fn) {
  try { const why = fn(); results.push([name, why ? "FAIL: " + why : "ok"]); } catch (e) { results.push([name, "FAIL: " + (e.stack || e).toString().split("\n").slice(0, 3).join(" | ")]); }
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
export { ROOT, TEMPLATE, SCRIPTS, boot, results, check, drawn, calls, frames, report };
