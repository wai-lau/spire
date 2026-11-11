## 9. Meta

### 9.1 TOP PLAYERS (`spire_board.py`, `/api/spire/ascendants`; pillar 9)

| Rule | Design |
|---|---|
| who posts | a **win**: three letters, lives left, the team, the wave; a **loss from wave 11 on**: lives 0 |
| guards | `ASC_MAX` posts an IP an hour (in memory); auto-move, or a buy with free towers/upgrades on (their own two ASCENDANT boxes under the title, `aspira-ui.js`), bars the form client-side; honour otherwise. Entry validation (`clean_entry`): three-letter initials; `won` or a loss; lives 1..`MAX_LIVES` 100000 on a win (0..100000 on a loss); wave 11..1000 (`MIN_WAVE`, `MAX_WAVE`); a team of 1-5 ids, each one of the seven kinds (`TOWER_KINDS`: arc frz sol acd grv crr ifr), stored in that order |
| ranking | the Ascendants (wins, gold) by lives left; then everyone else (green) by wave, then lives; ties to the earlier; ONE MAJOR VERSION A PAGE (owner, 2026-11-09: "split the top players by major version, add chevrons to the left and the right of TOP PLAYERS"): the title reads "Top players · v7" between chevrons that page to the older / newer majors with rows (`ascMajor`: the version's first number, a row from before the version column by its date), this game's own by default; the GET returns the top `SHOW_MAX` OF EACH major (`shown`), so no old major is crowded out; ELEVEN rows tall, your row the sixth (owner, 2026-11-09: "for top players, show 11 rows, with player score in the middle if possible" - `ASC_ROWS`, the first / last eleven near the ends); rows render with `textContent` |
| **never lose an entry** | an append-only fsynced journal (`spire_ascendants.jsonl`) is written FIRST, then the board JSON rewritten atomically from journal + old board; a missing or corrupt board is REBUILT from the journal; a torn tail cannot swallow the next line; nothing is trimmed |
| the owner's games | hidden from guests before `OWNER_SHOWN_FROM` (2026-10-14; the `owner` flag + `spire_ascendants_owner.json`), shown after; `python spire_board.py mark-owner <keep...>` names the rest as the owner's without touching the journal |
| hidden games | `spire_ascendants_hidden.json`, `[ts, initials]` pairs: games off the board for EVERYONE, the owner included; `python spire_board.py hide <initials...>` hides every game so far under those initials (later ones still show); the journal keeps them |
| version | a post carries `ver` (the page's `.asp-ver`, kept when it is `N.N[.N]`); the board's faint last column. Rows from before 2026-10-16 got theirs through the corrections file: the version file at the post time, else that day's changelog version |
| corrections | `spire_ascendants_fix.json`, `[ts, initials, {field: value}]` rows applied by `visible()`; `python spire_board.py fix <ts> <initials> lives=<n>` |

### 9.2 Slow logs (`spire_perflog.py`, `aspira-perflog.js`)

Every 3 min of unpaused play a session posts a frame-time and audio summary (buckets,
worst frames, sim / draw / 3D / GL splits, GPU, quality, canvas pixels, text-stamp memory,
version + build). POST is guest tier and rate-limited; GET is owner-only. Files in
`data/spire-perflog/` (**survives deploys**, capped). Failures are swallowed: it must never
be in the game's way. Read a phone's cost from the GL split, not the frame average: `gpuSplit.why` names
what fell off the GPU batch (each one re-uploads the moving layer), `sync` compares hitches after an upload
frame with the rest, and `boardUp.byWhy` splits the board upload by reason (`bmpWait` is off the frame,
the others block in it; `fadeBox` the 2D fade layer's box, `labels` / `boss` the 3D board strips).
`slowWhy` reads the slow frames alone: `phase` the phase that took most of each (`ent` = `warpEntities`, timed inside
`warpDraw`; `glDraw` is the rest of it), `ms` their time summed by phase plus `rest` (the frame minus all our timed work:
browser, GPU process, GC) and, of it, the stamps made and fade layers built in them; `tags` counts the slow frames that
carry a mark: `board` / `fade` on the frame that redrew the board or built the fade layer, `board+1`, `board+2`, `fade+1`,
`fade+2` on the next two (so a stall in the GPU process after our work shows). `causes` is `[count, avg ms, max ms]`
for each text stamp made (`stamp`) and each fade layer build (`fadeBuild`). A `bmpWait` / `fadeWait` logs only when no paused,
idle, menu or over frame or tab hide fell inside the wait. Diagnose from normal-play logs (owner, 2026-10-31: "I dont want to
do the diag things"); the `?diag=` switches are for the dev box.

### 9.3 Saves

| Store | Holds |
|---|---|
| localStorage | `aspira.best` `{wave, ascended}` (older saves may still hold an unread `score`), `spire.autowait` / `automove`, `aspira.mute` / `vol` |
| IndexedDB (`aspira-autosave.js`) | the whole `G` as each wave starts, cleared when a game ends; on load **resume wave N** or **new game**, the card read from a small `meta` record so it comes up before a tower can be built (the run itself is read on resume) - the save is the board AT REST, stamped `skillScale` (`runClean`: towers back on their build slots, every transient state and the field dropped; the Challenge button up) (a resumed run may still sign TOP PLAYERS); **everything in `G` must be structured-cloneable** |
| server | nothing beyond §9.1-9.2; no accounts |

### 9.4 Version and changelog

`web/aspira-version.txt` is hand-kept semver `major.minor.patch` (owner, 2026-10-19: "patch", never "tiny"): **the next minor** is a balance
battery's changes and only that (a new day is not a minor); every other ship is a patch, once a ship, not once a commit; **a new tower is a new
major** (GRV and ATC made 4.5 into 5.0 and 4.6 into 5.1). The workflow that bumps it: CLAUDE.md "Shipping". `spire_build()` stamps the newest
file mtime; both go into the template and every slow log. The changelog card (`aspira-changelog.js`, tap the version) lists each minor's
player-visible changes as facts, grouped by SUBJECT (`logSubject`: a tower, an enemy type, the core ... read from a leading "Subject:" or the
first one a line names; Buffs and Nerfs are no longer headed, the lines keep their three kinds underneath, Perf/Visual smaller); sections Balance / Perf / Visual (owner, 2026-11-09: "for the changelog, rename UI to Visual / then group within visual/balance if warranted"), and within Balance and Visual a subject with 2+ lines gets its own small heading, its lines without the repeated lead: add a line with every
change a player would notice. The 7.0.0 release note and how 5.1 became 5.1-5.8: ARCHAEOLOGY §9.

