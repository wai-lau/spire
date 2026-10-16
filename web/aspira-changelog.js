// /spire - WHAT'S NEW (owner, 2026-10-14: "construct a changelog, clicking the version number should pause the game and show the
// changelog on a card ... only include changes that affect the player, like graphics and balance changes"). Newest first; one
// short line a change, in the player's words - a FACT, no reason or explanation (owner, 2026-10-14). Add to the top day (or start a new one) with every change a player would notice.
// THE VERSION (web/aspira-version.txt, major.minor.tiny): a new day here is the next minor (its v); every deploy after bumps tiny.
// A new TOWER is the next MAJOR (owner, 2026-10-16: "adding grv and atc should be a new major version": their day, 4.5, became 5.0
// and the next 4.6 5.1).
// each day's lines in three groups (owner, 2026-10-14: "split changelog balance section, into buff and nerfs, make UI/perf a
// smaller font size than balance"): bu = Buffs (good for the player), ne = Nerfs (bad for the player), u = Perf/UI - SHOWN by subject since
// 2026-10-16 (logSubject: a tower, an enemy type ...), Buffs / Nerfs no longer headed; start a line "Subject: ..." to place it
const CHANGELOG = [
  { v: "5.1", day: "Oct 16", bu: [
    "Freeze: x1.11 damage.",
    "Sol: x0.85 damage.",
    "Acid: x1.49 damage.",
    "Acid: pools and corrosion drips hit enemies again (broken since 5.1.7).",
    "Carrier: x1.67 damage, at half the rate; each shot is 5 homing bolts streamed from under the interceptor - a bolt whose target dies flies on.",
    "Carrier: range 260 -> 130, movement 200 -> 240; interceptors chase up to 960 away.",
    "Carrier: interceptors x1.75 faster, launched 0.15s apart (was 0.2s), reloading twice as fast.",
    "Gravity: x0.81 damage.",
    "Gravity: black holes pull on each other by mass - a light one falls into a heavy one - and merge into one bigger hole once their centres touch, mass, size and radiation added.",
    "Gravity: a black hole's size is its mass - it shrinks all its life, and the bigger it is the faster it evaporates and radiates; at most 3x the base aura.",
    "Gravity: a nova that catches nothing still leaves a full-size hole; novas aim a little ahead of their target.",
  ], u: [
    "Carrier: interceptors fly smooth loops round their target, about 100 out and wobbling +-20%, steering round the core and towers.",
    "Carrier: interceptors half size, growing with Armament to full at VI; a brighter cobalt blue that keeps its colour during boss waves.",
    "Carrier: bolts are short streaks that stretch as they fly; one damage number for every two hits of an interceptor.",
    "Carrier: launch and shot sounds; tagline \"Carrier has arrived.\"",
    "Gravity: dark purple (Sol bright pink); the black centre grows logarithmically and the hole shrinks away to nothing.",
    "Gravity: the aura has its own sound; tagline \"Massive intervention.\"",
    "Gravity: touching black holes share one accretion disk, the dark of each over every ring.",
    "Gravity and Carrier: smoother with many pellets in the air - past ~80 a Gravity's pellets merge into fewer, harder ones (same damage on average).",
    "All towers: damage numbers fly away from where the hit came from - the tower, the bolt's or pellet's way, the enemy an arc jumped from, the pool or blast.",
    "All towers: the six tower colours sit evenly round the colour wheel, as the eye sees it - Arc a touch yellower, Acid greener, Freeze tealer, Carrier deeper blue, Gravity more purple, Sol coral-pink.",
    "Upgrade-ready chevrons keep the tower's colour during a boss wave.",
    "Lanes: a lit lane's glow fades out gradually as it reaches the core; the line itself runs on in.",
    "Cards: build cards in two columns, in an order shuffled once and kept; Gravity and Carrier text paler, as readable as the rest.",
    "Top players: a version column - the game version each score was played on; Carrier teams can post again; JUU and SMD 6 lives less (the Lovers once paid their lives twice).",
    "Perf: late in the game the upcoming-wave list rebuilds about 9x faster, damage numbers no longer each make a new text image as they shrink, the 3D star field draws twice as fast, Gravity's pellets and Carrier's bolts find targets faster, and enemies in formation move more cheaply.",
    "Sound: every sample levelled to the same loudness.",
    "Changelog: grouped by tower, enemy type, bosses and core.",
  ] },
  { v: "5.0", day: "Oct 15", u: [
    "Gravity: nova damage numbers fly into the sphere.",
    "Carrier: interceptors fly a clothespin - straight out, loop their target firing, straight home.",
    "Carrier's short name is ATC.",
    "Carrier: interceptors are thin, long darts; each shot is light-blue bolts side by side, and Autopilot's pellets are light blue.",
    "Gravity: a black-hole look - its aura bands white-hot, yellow, coral, pink, plum and deep purple; its colour a magenta.",
    "Gravity: the sphere and its rings draw over damage numbers.",
    "Gravity: the nova explodes fully first, then the sphere and its aura appear.",
    "Gravity: the nova is a thin ring collapsing inward, faster and faster, purple paling; the sphere appears where it closes.",
    "Gravity: radiation pellets fly out in every direction, purple, and can miss.",
  ], ne: [
    "Gravity: the aura deals no damage.",
    "Carrier: a shot is three bolts, each a third of its hit (armor cuts each).",
    "Carrier: less ammo a sortie (8, to 16 at Autopilot; was 12 to 28).",
    "Carrier: after a kill an interceptor takes a new target only close by, else flies home.",
  ], bu: [
    "Gravity: the aura's size grows with the damage its nova dealt.",
    "Carrier: every axis raises the shot's hit - Armament the most (up to x15), Hangar and Launch up to x5.1 each.",
    "Carrier Hangar: focus fire - each wingmate looping the same target adds to every shot on it.",
    "Carrier Launch: a strafing pass - an interceptor rams its target as it arrives; also a shorter reload (1.5s, to 0.3s at Warp).",
    "Carrier: interceptors chase a target up to 3x the tower's reach, and send enough of themselves to kill it.",
    "Gravity: the aura strips armor 3x faster.",
    "Carrier: fires twice as fast.",
    "Carrier: interceptors fly 1.5x faster.",
    "Carrier: every shot slows its target (20%, double on fast enemies; never shielded ones).",
    "Gravity: the aura slows in two rings - its core far harder.",
    "New tower: Carrier. Launches interceptors one by one; each flies to an enemy, fires its shots and flies home to reload. Good vs fast and shields.",
    "Gravity: nova and aura x1.7 wider.",
    "Gravity: x3 radiation pellets.",
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
// what a line is ABOUT: its "Subject:" prefix if it names one, else the first subject it mentions, else Other (the order here is
// the order shown). Keep ONE line per change a day: merge a later tweak into the line it changes (owner, 2026-10-16: "Merge
// similar changes")
const LOG_SUBJECTS = [["All towers", /^all towers\b/i], ["Arc", /\barcs?\b/i], ["Freeze", /\bfreeze\b|\bfrz\b/i], ["Sol", /\bsol(ar)?\b/i], ["Acid", /\bacid\b|\bacd\b/i],
  ["Carrier", /\bcarriers?\b|\batc\b|\binterceptors?\b/i], ["Gravity", /\bgravity\b|\bgrv\b|\bblack holes?\b/i],
  ["Swarm", /\bswarms?\b/i], ["Fast", /\bfast\b/i], ["Armor", /\barmou?r(ed)?\b/i], ["Shield", /\bshield(s|ed)?\b/i],
  ["Bosses", /\bboss(es)?\b|\bstar\b|\bempress\b|\btarot\b/i], ["Core", /\bcore\b/i], ["Other", /$^/]];
function logSubject(line) {
  const head = (line.match(/^([^:]{1,40}):/) || [])[1];
  if (head) for (const [name, re] of LOG_SUBJECTS) if (re.test(head)) return name;
  let best = "Other", at = Infinity;
  for (const [name, re] of LOG_SUBJECTS) { const m = line.match(re); if (m && m.index < at) { at = m.index; best = name; } }
  return best;
}
// the card: the game pauses while it is open and goes back as it was when it closes
let logWasPaused = null;
function openChangelog() {
  let card = $("asp-log");
  if (!card) {
    card = document.createElement("div");
    card.id = "asp-log"; card.className = "asp-deck asp-log";
    // a day's lines GROUPED BY WHAT THEY CHANGE (owner, 2026-10-16: "group differently, all ATC changes go together, all swarm changes
    // go together / Drop the buff and nerf categories"): a tower, an enemy type, the bosses, the core, else Other - headings only
    // where a day has more than one line (owner, 2026-10-14). bu / ne / u still hold the lines; u (Perf/UI) lines stay a size smaller
    const day = d => {
      const all = [...(d.bu || []), ...(d.ne || []), ...(d.u || [])], ui = new Set(d.u || []);
      const li = (i, name) => "<li" + (ui.has(i) ? ' class="asp-log-ui"' : "") + ">" + (name ? i.replace(new RegExp("^" + name + ":\\s*"), "") : i) + "</li>"; // under its heading, a line's own "Subject:" is dropped
      if (all.length < 2) return "<h3>" + d.v + " · " + d.day + "</h3><ul>" + all.map(i => li(i)).join("") + "</ul>";
      const by = new Map(LOG_SUBJECTS.map(([name]) => [name, []]));
      for (const i of all) by.get(logSubject(i)).push(i);
      return "<h3>" + d.v + " · " + d.day + "</h3>" + [...by].filter(([, is]) => is.length).map(([name, is]) => "<h4>" + name + "</h4><ul>" + is.map(i => li(i, name)).join("") + "</ul>").join("");
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
