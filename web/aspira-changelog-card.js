// /spire - the WHAT'S NEW card (split from aspira-changelog.js at the 500-line cap, 2026-10-20): CHANGELOG's lines grouped by
// subject on a card, opened from the version number. Loaded right after aspira-changelog.js (same global scope)
// what a line is ABOUT: its "Subject:" prefix if it names one, else the first subject it mentions, else Other (the order here is
// the order shown). Keep ONE line per change a day: merge a later tweak into the line it changes (owner, 2026-10-16: "Merge
// similar changes")
const LOG_SUBJECTS = [["All towers", /^all towers\b/i], ["Arc", /\barcs?\b/i], ["Freeze", /\bfreeze\b|\bfrz\b/i], ["Sol", /\bsol(ar)?\b/i], ["Acid", /\bacid\b|\bacd\b/i],
  ["Carrier", /\bcarriers?\b|\batc\b|\bcrr\b|\binterceptors?\b/i], ["Gravity", /\bgravity\b|\bgrv\b|\bblack holes?\b/i],
  ["Ifrit", /\bifrit\b|\bifr\b|\bhellfire\b|\bfiraga\b|\bblk magic\b|\bmeteor\b/i], // its own heading (owner, 2026-10-19: it fell under Other)
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
