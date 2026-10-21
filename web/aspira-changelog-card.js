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
    // each entry in THREE SECTIONS (owner, 2026-10-21: "For the changelog, split each section into Balance Perf and UI"; grouped by
    // subject 2026-10-16 .. 21): Balance / Perf / UI headings, each section's lines in LOG_SUBJECTS order (stable) so one tower's sit
    // together, the "Subject:" lead in bold; Perf and UI a size smaller (asp-log-ui)
    const SECTIONS = [["Balance", "b"], ["Perf", "p"], ["UI", "u"]];
    const rank = new Map(LOG_SUBJECTS.map(([name], k) => [name, k]));
    const li = (i, small) => { const m = i.match(/^([^:]{1,40}):\s*(.*)$/); return "<li" + (small ? ' class="asp-log-ui"' : "") + ">" + (m ? "<b>" + m[1] + ":</b> " + m[2] : i) + "</li>"; };
    const day = d => "<h3>" + d.v + " · " + d.day + "</h3>" + SECTIONS.map(([name, k]) => {
      const is = (d[k] || []).map((i, n) => [i, n]).sort((a, b) => (rank.get(logSubject(a[0])) - rank.get(logSubject(b[0]))) || a[1] - b[1]).map(x => x[0]);
      return is.length ? "<h4>" + name + "</h4><ul>" + is.map(i => li(i, k !== "b")).join("") + "</ul>" : "";
    }).join("");
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
