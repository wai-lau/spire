// /spire - WHAT'S NEW (owner, 2026-10-14: "construct a changelog, clicking the version number should pause the game and show the
// changelog on a card ... only include changes that affect the player, like graphics and balance changes"). Newest first; one
// short line a change, in the player's words - a FACT, no reason or explanation (owner, 2026-10-14). Add to the top day (or start a new one) with every change a player would notice.
// THE VERSION (web/aspira-version.txt, major.minor.tiny): a new day here is the next minor (its v); every deploy after bumps tiny.
// each day's lines in three groups (owner, 2026-10-14: "split changelog balance section, into buff and nerfs, make UI/perf a
// smaller font size than balance"): bu = Buffs (good for the player), ne = Nerfs (bad for the player), u = Perf/UI
const CHANGELOG = [
  { v: "4.5", day: "Oct 15", u: [
    "Gravity: a black-hole look - its aura bands white-hot, yellow, coral, pink, plum and deep purple; its colour a magenta.",
    "Gravity: the sphere and its rings draw over damage numbers.",
    "Gravity: the nova explodes fully first, then the sphere and its aura appear.",
  ], bu: [
    "New tower: Gravity. A nova leaves a black sphere whose aura burns, slows and strips armor, growing with every hit; it radiates pellets. Strong against swarm and armor, weak to fast and shields. Axes: Void, Supernova, Radiation.",
  ] },
  { v: "4.4", day: "Oct 15", ne: [
    "Upgrades cost x1.6.",
    "A boss on two lanes pays its reward once (Strength and Temperance paid twice).",
    "Arc Voltage: hit x1.9 / x3.9 / x6.4 / x8.4 at purchases I-IV (was up to x69.9).",
    "Core powers: one at a time - the other waits until it ends.",
  ], bu: [
    "The Star (wave 12): x0.8 HP - any two towers can beat it.",
    "Waves 1-12: swarm enemies x0.8 HP.",
    "Arc Conductivity and Capacitance: each purchase also raises the hit (x1.4 / x2.0 / x2.5 / x2.9).",
    "Waves 1-24: a quarter as many enemies, each x4 HP and x4 credits, easing back by wave 36. Bosses unchanged.",
    "Armor waves: x1.5 enemies (was x2), each worth 1.33 credits (was 1).",
  ], u: [
    "Damage numbers over 1,000 read short: 1.7k, 17k, 1.2M.",
    "Changelog text smaller.",
    "A tower flashes for an upgrade only when its next buy is affordable.",
    "Using either core power slams the core down while it runs.",
    "Swarm enemies drawn 1.5x bigger, fast 0.9x, shield 0.8x.",
    "Tower card stats in sections, one a mechanic (e.g. Freeze Aura, Permafrost, Moons).",
    "Tower card: a stat an upgrade adds shows its new value alone (no \"— →\").",
    "Upgrades: four buys an axis, numbered I-IV; IV is the capstone. The old II-III and IV-V are one buy each, at both tiers' price.",
    "Build cards: 'good vs' follows the counter matrix - the type a tower is THE counter of, then the ones it helps against (Freeze no longer claims shields).",
  ] },
  { v: "4.3", day: "Oct 14", bu: [
    "Permafrost pulses twice as often, each half as strong.",
    "Auto-move glides 1.5x faster, and as fast as the game speed (10x glides 10x).",
    "Swarms: 20% fewer enemies.",
    "Acid Contagion: a kill in a pool leaves a new pool.",
    "Acid Corrosion: goo lasts 40 s (was 8).",
    "Swarms: half as many enemies, x2 credits each.",
    "Enemies: less HP through the mid-game.",
    "Late enemies: less HP.",
  ], ne: [
    "Swarm enemies vary more in speed (50-150%).",
    "Swarm waves: at least 12 enemies.",
    "Armor waves: twice as many enemies, each worth half the credits.",
    "Enemies speed up through the mid-game.",
    "Mid-game enemies: up to x1.5 HP.",
    "Late enemies: faster.",
    "Swarms: x1.15 HP; 2 lives per leak.",
    "Boss escorts give 20% of their HP to their boss.",
    "Interest: 2% (was 3%).",
    "+6 lives per 100,000 score now arrive when the wave's boss falls.",
    "Orbital Relay: 11.25 s (was 22.5); stays on its tower.",
    "Temporal Drive: ends when no enemies are left; can't be used on an empty board.",
  ], u: [
    "The tower card closes with an X beside the upgrade button.",
    "Permafrost's stat says what it adds: \"+11% slow, stacking\".",
    "Tower descriptions match what towers do: Arc Conductivity IV twin arcs, V three; Voltage VI 1.6x per jump; Sublimation VI deeply brittle.",
    "New tower card stats: Arc strikes and burst slow, Freeze Brittle, Frost armor and Shields, Sol Shields; Acid Armor shows % of damage (was -0).",
    "Permafrost's armor loss is a main stat: % of armor at full frost, and how much that is this wave.",
    "More tower card stats: Arc re-strikes and shields; Freeze full frost and cold bite; Sol shrapnel; Acid goo and pool spread.",
    "Tapping the empty bar beside the speed buttons closes the open window.",
    "Autosave: resume from the start of the last wave.",
    "Game speeds: 1x, 1.5x, 2x, 3x (keys 1-4).",
    "3D: faster, most of all on phones; resolution no longer drops.",
    "Acid effects: pools don't stack brightness; Spray V shows its jets; Contagion pools are dashed rings.",
    "Threat ring round the core when an enemy is close, joined to its triangles.",
    "Every lane turned to stay on screen longer.",
    "Powers won from a boss flash when the next wave starts, for 4 s.",
    "Pause button flashes while paused.",
    "Numbers and text: outline only, no glow.",
    "3D: beams are hidden where a tower covers them.",
    "Temporal Drive: no screen shake; the first ring goes out as the core lands.",
    "3D: movement range rings evenly dashed all round.",
    "Upgrade button always shows the cost.",
    "Boss text and power buttons no longer block dragging.",
    "Phone-screen limit: shown only where it blocks a tower, as three thin lines.",
    "3D: shapes below the floor fade out.",
    "Quality slider matches the width of the stats row.",
    "Version number opens this card.",
    "TOP PLAYERS shows the owner's games from Oct 14 on.",
    "TOP PLAYERS initials sit on their lines; the first letter no longer cut off.",
  ] },
  { v: "4.2", day: "Oct 13", bu: [
    "Acid Corrosion: goo strips more armor.",
  ], ne: [
    "Bosses: x1.4 HP; the Empress and Strength x3.5, Death x2.8.",
    "Solar Refraction: cone a third narrower.",
  ], u: [
    "Auto-move glides at half speed; using it marks the game (DQ), off TOP PLAYERS.",
    "Tower cards open from the home slot; an up arrow marks an affordable upgrade.",
    "Swarms spread over twice as many lanes.",
    "From wave 97, augmented enemies wear their augment's colour.",
    "A tower that can't stay put glides home.",
  ] },
  { v: "4.1", day: "Oct 12", bu: [
    "Movement leash x1.5.",
  ], ne: [
    "A boss every 12 waves; the game is won at wave 120.",
    "Enemies: x1.5 HP from wave 25.",
    "Tower ranges x0.75.",
    "Wave timers 20% shorter.",
  ], u: [
    "After a boss, the next wave waits for Challenge.",
    "The game holds while the boss sky turns over.",
    "3D is the default view.",
    "Red threat marks on the closest enemies.",
  ] },
  // the milestones before the changelog, read back from the history (2026-10-14)
  { v: "4.0", day: "Oct 11", bu: ["Tier VI capstones."], ne: ["Three towers a game; core powers cool down by wave."], u: ["Towers drag on a leash and coast.", "TOP PLAYERS."] },
  { v: "3.1", day: "Oct 10", u: ["Towers drag anywhere inside their leash."] },
  { v: "3.0", day: "Oct 9", ne: ["Every boss brings a fleet."], u: ["3D view: the board as a spire, dice enemies, prism towers."] },
  { v: "2.3", day: "Oct 8", bu: ["Capstones."], ne: ["Each boss has its own armor and shields."], u: ["Core powers as buttons."] },
  { v: "2.2", day: "Oct 7", bu: ["Bosses grant the core powers; Orbital Relay."], u: ["Upgrades by dragging the tower's chart."] },
  { v: "2.1", day: "Oct 6", bu: ["Core powers, including Temporal Drive; tower roles."], ne: ["Range rework: shorter ranges."], u: ["Build by tapping a slot."] },
  { v: "2.0", day: "Oct 5", bu: ["Skill charts: three upgrade axes per tower.", "Corner slots open as bosses fall."] },
  { v: "1.3", day: "Oct 4", ne: ["Tower ranges x0.75."] },
  { v: "1.2", day: "Oct 3", bu: ["Solar rework: Impale and bleed."] },
  { v: "1.1", day: "Oct 2", bu: ["Acid tower; upgrade trees for all four towers; six build slots."], ne: ["Ten tarot bosses."] },
  { v: "1.0", day: "Oct 1", u: ["The Spire: spiral tower defence on a star chart."] },
];
// the card: the game pauses while it is open and goes back as it was when it closes
let logWasPaused = null;
function openChangelog() {
  let card = $("asp-log");
  if (!card) {
    card = document.createElement("div");
    card.id = "asp-log"; card.className = "asp-deck asp-log";
    const list = (items, cls) => '<ul class="' + cls + '">' + items.map(i => "<li>" + i + "</li>").join("") + "</ul>"; // asp-log-ui: Perf/UI, a size smaller (aspira-changelog.css)
    const group = (name, items, cls) => (items && items.length ? "<h4>" + name + "</h4>" + list(items, cls) : "");
    // the Buffs / Nerfs / Perf/UI headings only where a version has more than one line (owner, 2026-10-14), and only over a group that has one
    const day = d => {
      const all = [...(d.bu || []), ...(d.ne || []), ...(d.u || [])], one = d.u && d.u.length ? "asp-log-ui" : "";
      return "<h3>" + d.v + " · " + d.day + "</h3>" + (all.length > 1 ? group("Buffs", d.bu, "") + group("Nerfs", d.ne, "") + group("Perf/UI", d.u, "asp-log-ui") : list(all, one));
    };
    card.innerHTML = '<h2>changes</h2><div class="asp-log-list">' + CHANGELOG.map(day).join("") + "</div>";
    button(card, "asp-primary", "close", closeChangelog);
    document.querySelector(".asp-board").appendChild(card);
  }
  if (!card.hidden && logWasPaused !== null) return;
  logWasPaused = ui.paused; ui.paused = true; card.hidden = false;
}
function closeChangelog() {
  const card = $("asp-log");
  if (card) card.hidden = true;
  if (logWasPaused !== null) { ui.paused = logWasPaused; logWasPaused = null; }
}
(() => {
  const ver = document.querySelector(".asp-ver");
  if (!ver) return;
  ver.setAttribute("role", "button"); ver.setAttribute("aria-label", "what's new"); ver.tabIndex = 0;
  ver.addEventListener("click", openChangelog);
  ver.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openChangelog(); } });
})();
