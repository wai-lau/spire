// /spire - WAVE CARD (owner, 2026-10-19: "clicking a wave on the wave indicator should open a card with wave stats - movespeed, time
// to core, armor, lane count, any metric that is relevant to the wave (do not show if 0 or N/A)"): a tap on a wave's row (its icons
// or its name - data-n, aspira-wavelist.js) opens a card of what that wave brings. The numbers are read off ONE sample enemy made by
// the game's own spawnEnemy and taken straight back out, the RNG held at its middle (a swarmer's average pace), so the card can never
// disagree with the game. Pauses like the changelog card. Loaded after aspira-wavelist.js.
let waveCardPaused = null;
function waveSample(n, w) {
  const pi = laneMap(n)[w.type] ?? 0, r0 = Math.random, id0 = G.id;
  Math.random = () => 0.5;
  try { spawnEnemy(w.type, n, pi, 0); } finally { Math.random = r0; }
  const e = G.enemies.pop(); G.id = id0;
  if (e && e.mate && e.mate.mate === e) delete e.mate.mate; // a two-boss wave: it found its live mate - unlink
  return { e, pi };
}
const WC_NUM = (v, whole) => (v >= 1000 ? dmgUnits(v) : whole ? String(Math.floor(v)) : String(Math.round(v * 10) / 10)); // whole: HP, shields, armor (the game rounds them down)
function waveStats(n, w) {
  const { e, pi } = waveSample(n, w), boss = w.type === "bonus";
  if (!e) return [];
  const hp = boss ? e.max : enemyHp(w.type, n), v = effSpeed(e), toCore = v > 0 ? (PATHS[pi].len - e.s) / v : 0;
  const rows = [
    ["units", w.count, 1], ["lanes", w.split, 1], ["HP each", hp, 1], ["HP in all", hp * w.count, 1],
    ["shields each", e.shield, 1], ["armor each", e.armor, 1], ["speed (u/s)", v], ["time to core (s)", toCore],
    ["credits each", e.bounty], ["credits in all", e.bounty * w.count],
  ];
  const out = rows.filter(([, x]) => Number.isFinite(x) && x > 0).map(([k, x, whole]) => [k, WC_NUM(x, whole)]);
  if (e.aug) out.push(["late trait", "carries some " + e.aug]); // the HYBRID late swarm / fast (aspira-game.js)
  return out;
}
function openWaveCard(n) {
  const w = WAVE_PLANS.get(n);
  if (!w) return;
  closeWaveCard();
  const card = document.createElement("div");
  card.id = "asp-wavecard"; card.className = "asp-deck asp-log asp-wavecard";
  const name = w.type === "bonus" ? arcanaOf(n).name : waveName(w.type, n);
  card.innerHTML = "<h2>wave " + n + " · " + name + "</h2><table class=\"asp-wavecard-t\">" +
    waveStats(n, w).map(([k, x]) => "<tr><td>" + k + "</td><td>" + x + "</td></tr>").join("") + "</table>";
  button(card, "asp-primary", "close", closeWaveCard);
  document.querySelector(".asp-board").appendChild(card);
  waveCardPaused = ui.paused; ui.paused = true;
}
function closeWaveCard() {
  const card = $("asp-wavecard");
  if (card) card.remove();
  if (waveCardPaused !== null) { ui.paused = waveCardPaused; waveCardPaused = null; }
}
(() => {
  const list = document.getElementById("asp-wavenote"); // ($ is defined later, in aspira-ui.js)
  if (!list) return;
  list.addEventListener("click", ev => { const el = ev.target && ev.target.closest && ev.target.closest("[data-n]"); if (el) openWaveCard(+el.dataset.n); });
})();
