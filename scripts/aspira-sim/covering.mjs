// COVERING TEAMS ONLY (owner, 2026-10-29: "Ignore teams that don't cover every enemy type / pretend they don't exist for the purpose of
// sims (except for the duo test)"): a team covers when its towers together hold a check (a positive VS_MARKS entry) on all four types
// - the WINNABLE trio (owner, 2026-10-28). Read from the game files a run uses (ASPIRA_WEB), so a marks refresh moves the set with it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WEB = process.env.ASPIRA_WEB || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
export const KINDS = ["arc", "frz", "sol", "acd", "grv", "crr", "ifr"], TYPES = ["swarm", "fast", "shield", "armor"];
export function vsMarks() {
  const m = fs.readFileSync(path.join(WEB, "aspira-chooser.js"), "utf8").match(/const VS_MARKS = (\{.*?\}\s*\});/);
  if (!m) throw new Error("VS_MARKS not found in " + WEB);
  return Function("return " + m[1])();
}
// THE MARK TARGET's checks (mark-target.json, frozen - owner 2026-10-29): the covering set a SCREEN plays (players3b), so the same trios
// are played across builds - a VS_MARKS refresh swapped 8 trios in or out and every screen needed a new 90-min base (2026-11-06)
export function targetMarks() {
  const T = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "mark-target.json"), "utf8"));
  return Object.fromEntries(KINDS.map(k => [k, Object.fromEntries(TYPES.map((ty, i) => [ty, T[k][i]]))]));
}
export const covers = (team, marks = vsMarks()) => TYPES.every(ty => team.some(k => ((marks[k] || {})[ty] || 0) > 0));
// every team of `size` distinct kinds that covers (size 2: the 2-tower gates; the duo RULE keeps every pair - duo.mjs / duo0.mjs)
export function coveringTeams(size, marks = vsMarks()) {
  const out = [];
  const walk = (from, team) => { if (team.length === size) { if (covers(team, marks)) out.push(team); return; } for (let i = from; i < KINDS.length; i++) walk(i + 1, [...team, KINDS[i]]); };
  walk(0, []); return out;
}
if (process.argv[1] && process.argv[1].endsWith("covering.mjs")) for (const n of [2, 3]) console.log(n, coveringTeams(n).map(t => t.join("+")).join(","));
