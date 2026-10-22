// THE ASCENDANTS (owner, 2026-10-11: "when a player beats a game let them save their initials in the Ascendants"):
// one SHARED board on the server (/api/spire/ascendants, routes_aspira.py + spire_board.py), on the HONOUR SYSTEM - the
// game runs in the browser, so nothing can be proven. TOP PLAYERS (owner, 2026-10-11): a win, or any game past wave
// ASC_MIN_WAVE - 1, may post three letters, arcade style; the board ranks the Ascendants (wins, GOLD rows) first, then
// everyone else by the wave reached (GREEN rows), tower names in their own colours. A game over before that shows the
// board alone. UI only; winGame / gameOver (aspira-game.js) call in.
const ASC_URL = "/api/spire/ascendants", ASC_SHOW = 10, ASC_MIN_WAVE = 11;
const ASC_TITLE = '<p class="asp-asc-title">Top players</p>';
function ascBox() {
  let el = $("asp-asc");
  if (!el) { el = document.createElement("div"); el.id = "asp-asc"; $("asp-ov-title").before(el); } // ABOVE the title, where the leaks were (owner, 2026-10-19: "swap location of scores and waves"; was below Play again, 2026-10-11)
  return el;
}
const ascTeam = () => [...new Set(G.towers.filter(t => !t.isCore).map(t => t.kind))];
const ascDate = ts => new Date(ts * 1000).toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" });
const ascWon = e => e.won !== false; // (rows from before `won` existed were all wins)
function ascTeamCell(td, team) {
  (team || []).forEach((k, i) => {
    if (i) td.append(" ");
    const s = document.createElement("span");
    s.className = "asp-asc-k"; s.dataset.kind = k; s.textContent = (TOWERS[k] && TOWERS[k].ab) || "?";
    td.append(s);
  });
}
// YOUR ROW BEFORE YOU SIGN IT (owner, 2026-10-22: "for the input of the initials, load scoreboard scrolled to center their score, highlight
// their row / and have the underscore and enter glyph appear where the initials are"): the entry form sits IN the board, in a highlighted row
// at the rank this game would take (wins by lives, then the rest by wave - the server's order), the board scrolled to centre it
let ascForm = null;
function ascPendingAt(entries, e) {
  const key = x => (ascWon(x) ? [1, x.lives] : [0, x.wave]);
  const [w, v] = key(e);
  const i = entries.findIndex(x => { const [xw, xv] = key(x); return xw < w || (xw === w && xv < v); });
  return i < 0 ? entries.length : i;
}
function ascBoard(entries, mine, pending = null) {
  const board = $("asp-asc-board");
  if (!board) return;
  board.textContent = "";
  if (pending) { entries = entries.slice(); entries.splice(ascPendingAt(entries, pending), 0, pending); }
  if (!entries.length) { board.textContent = "No one on the board yet."; return; }
  const table = document.createElement("table");
  table.className = "asp-asc-table";
  // EVERY entry, but only ASC_SHOW rows tall - the rest a scroll away (owner, 2026-10-12: "show only top 10 players, but allow
  // the leaderboard to be scrollable"); your own row scrolled into view
  for (const e of entries) {
    const tr = table.insertRow();
    tr.className = (ascWon(e) ? "asp-asc-gold" : "asp-asc-green") + (e === pending ? " asp-asc-mine asp-asc-pending" : mine && e.ts === mine.ts && e.initials === mine.initials ? " asp-asc-mine" : "");
    const ic = tr.insertCell(); if (e === pending && ascForm) ic.append(ascForm); else ic.textContent = e.initials;
    ascTeamCell(tr.insertCell(), e.team);
    tr.insertCell().textContent = ascWon(e) ? e.lives + " lives" : "wave " + e.wave;
    tr.insertCell().textContent = ascDate(e.ts);
    const v = tr.insertCell(); v.className = "asp-asc-ver"; v.textContent = e.ver ? "v" + e.ver : ""; // the VERSION it was played on (owner, 2026-10-16: "add a col for the version the scores were achieved")
  }
  board.append(table);
  fitOneLine(table, Math.min(document.documentElement.clientWidth - 24, $("asp-asc").parentElement.clientWidth || 1e9)); // every row on ONE line, the table shrunk to fit (aspira-chooser.js)
  const rows = table.rows;
  board.style.maxHeight = ""; /* the board takes the end screen's spare height and scrolls inside it (aspira-endstats.css; owner, 2026-10-18 - was ASC_SHOW rows tall) */
  const me = table.querySelector(".asp-asc-mine");
  if (me) board.scrollTop = Math.max(0, me.offsetTop - rows[0].offsetTop - (board.clientHeight - me.offsetHeight) / 2); // CENTRED on your row
  if (pending && ascForm) { const inp = $("asp-asc-in"); if (inp && !inp.disabled) try { inp.focus({ preventScroll: true }); } catch (_e) { /* (an old browser: no options) */ } }
}
async function ascLoad(pending = null) {
  try { const r = await fetch(ASC_URL); if (r.ok) ascBoard((await r.json()).entries || [], null, pending); } catch (_e) { ascBoard([], null, pending); }
}
async function ascSend(ev) {
  if (autoBarred()) { if (ev) ev.preventDefault(); return; } // (autoBarred, below)
  ev.preventDefault();
  const input = $("asp-asc-in"), note = $("asp-asc-note"), initials = input.value.toUpperCase();
  if (!/^[A-Z]{3}$/.test(initials)) { note.textContent = "Three letters."; return; }
  input.disabled = true;
  try {
    const verEl = document.querySelector(".asp-ver span"), won = !!G.won, body = { initials, lives: Math.max(0, G.lives), team: ascTeam(), won, wave: won ? WIN_WAVE : G.wave, ver: verEl ? verEl.textContent.trim() : "" }; // ver: the version played (owner, 2026-10-16)
    const r = await fetch(ASC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status === 429 ? "Too many posts - try later." : "Could not save.");
    const res = await r.json();
    if (ascForm) ascForm.remove(); ascForm = null; note.textContent = initials + (won ? " has ascended." : " is on the board.");
    ascBoard(res.entries || [], res.entry);
  } catch (e) { note.textContent = e.message; input.disabled = false; }
}
// the entry form: a win, or a game over past wave 10
// AUTO-MOVE BARS THE BOARD (owner, 2026-10-13: "any amount of auto-move disqualifies you from leaderboard"; it was over a minute):
// any real time with it on this game (G.autoMoveS, aspira-ui.js) - the board shows, the entry form does not
const autoBarred = () => (G.autoMoveS || 0) > 0 || !!G.autoBuy; /* + any buy made while auto-move was on (owner, 2026-10-20) */
function showAscend() {
  const box = ascBox(), won = !!G.won;
  box.hidden = false;
  if (autoBarred()) { box.innerHTML = ASC_TITLE + '<p id="asp-asc-note">move-hax or cred-hax was used - this game stays off the board.</p><div id="asp-asc-board"></div>'; ascLoad(); return; }
  box.innerHTML = ASC_TITLE + '<form id="asp-asc-form"><input id="asp-asc-in" class="' + (won ? "asp-asc-gold" : "asp-asc-green") + '" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AAA" aria-label="your initials">' +
    '<button class="asp-primary" type="submit"' + (won ? ">ascend" : ' aria-label="post">\u21B5') + '</button></form><p id="asp-asc-note">' +
    (won ? "Leave your initials among the Ascendants." : "Wave " + G.wave + " - leave your initials on the board.") + '</p><div id="asp-asc-board"></div>';
  ascForm = $("asp-asc-form"); // (here till the board loads; then ascBoard moves it into YOUR row - and here it stays if the board cannot load)
  const input = $("asp-asc-in");
  input.oninput = () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3); };
  ascForm.onsubmit = ascSend;
  const verEl = document.querySelector(".asp-ver span");
  ascLoad({ initials: "", team: ascTeam(), lives: Math.max(0, G.lives), won, wave: won ? WIN_WAVE : G.wave, ts: Date.now() / 1000, ver: verEl ? verEl.textContent.trim() : "" });
}
function hideAscend() { const el = $("asp-asc"); if (el) el.hidden = true; }
// a game over: the entry form past wave 10, else the board alone (owner, 2026-10-11: "on any game over screen show leaderboard")
function showAscendants() {
  if (G.wave >= ASC_MIN_WAVE) { showAscend(); return; }
  const box = ascBox();
  box.hidden = false;
  box.innerHTML = ASC_TITLE + '<div id="asp-asc-board"></div>';
  ascLoad();
}

// THE ASCENDANT BOXES (moved from aspira-ui.js, 2026-10-21): built once by autoWaitBox, drawn by updateAutoWait
function ascBoxes() {
  // the ASCENDANT-only boxes sit UNDER THE TITLE (owner, 2026-10-21: "move those checkboxes under ASCENDANT"), one each
  const asc = document.createElement("div");
  asc.className = "asp-row asp-autowait asp-ascboxes";
  document.querySelector(".asp-buildcol").append(asc); // (the title is the column's last child)
  // AUTO-MOVE (autoGlide, aspira-positioning.js) and FREE builds (freeBuild, aspira-defs.js): turning either ON takes a second
  // tap within SELL_ARM_MS - it disqualifies the game (owner, 2026-10-13: "require confirmation to activate"); off is one tap
  const armBox = (id, on, flip) => {
    const b = button(asc, "asp-check", "", () => {
      if (!on() && !b.dataset.armed) { b.dataset.armed = "1"; setTimeout(() => { delete b.dataset.armed; }, SELL_ARM_MS); return; }
      delete b.dataset.armed; flip();
    }, id);
    b.setAttribute("role", "checkbox");
  };
  armBox("asp-automove", () => autoMove, () => { autoMove = !autoMove; G.autoMove = autoMove; }); // (this game only: aspira-positioning.js)
  armBox("asp-freebuild", () => freeMode, () => { freeMode = !freeMode; G.freeMode = freeMode; });
}
// one ASCENDANT box: (DQ) beside it once used this game; armed, "really? (DQ)" (owner, 2026-10-22: "after first tap show really? (DQ)"; was "NO LEADERBOARD (tap again to confirm)", 2026-10-17)
function ascCheck(id, on, label, used) {
  const b = $(id), h = (on ? ICON_CHECKED : ICON_UNCHECKED) + "<span>" + (b.dataset.armed ? "really?" : label) + "</span>" +
    (used || b.dataset.armed ? '<span class="asp-amt">(DQ)</span>' : "");
  b.hidden = !best.ascended; // ASCENDANTS only (owner, 2026-10-13: "non-ascendants do not get that checkbox")
  if (b.dataset.html !== h) { b.dataset.html = h; b.innerHTML = h; b.setAttribute("aria-checked", String(on)); }
}
