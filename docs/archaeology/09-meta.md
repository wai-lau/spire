## 9. Meta history

- **7.0.0 released (10-30, 409accb; exec-fn fd0a082a).** "Can you also release what you have as 7.0 even if it's not completely ready?": the tier-redesign branch, 311 commits since 6.15.11 (tiers 0-V, the ARC rebuild drawn as chains, ACD pools, SOL band and Breach, FRZ without strip, CRR 3x bolts, the new formations, waves 1-12, the mark target), one 7.0 changelog entry, smoke 126/126, pytest 45 passed. Known open: ARC 0 +1 -3 +2 against its target +2 -2 -2 +2; the good model wins about 103/200 of the covering trios.
- **Ascendants / TOP PLAYERS (10-11).** "When a player beats a game let them save their initials" -> "shared board, honor
  system" -> "make sure we never lose it" (the first winner) -> journal-backed -> "for any wave after 10, allow user to post
  on the leaderboard", gold winners / green others, titled TOP PLAYERS; ASC_MAX 3 -> 6 posts / IP / hour; 10-12 the owner's
  games hidden from guests ("don't show results added by owner"), 10-13 `hide` ("remove wai ugh and boo"), auto-move
  disqualifies, 10-14 the owner's games show from that day. The board shows 10 rows and scrolls (10-12).
- **Slow logs (10-12).** "This is just my partner's Brave — can we make it so each session takes slowlogs and sends them back
  every 3 min of play": first to a temp folder (wiped by every deploy), then `data/spire-perflog` ("stop wiping old
  slowlogs", `0fa17d5`); gained 3D-pass splits (glMs, entMs) and canvas-memory counts.
- **Autosave (10-14).** "An iPhone that runs out of memory reloads the page, and a run at wave 62 or 120 was gone."
- **Version / changelog (10-14).** A stamp `vMMDD.HHMM` of the newest file mtime ("an older stamp on a phone means cached
  code") -> hand-kept `major.minor.tiny` (the third number renamed PATCH, semver, 10-19) + the build, clickable to the changelog card; 10-14 the card split into Buffs / Nerfs /
  Perf-UI groups (Perf-UI smaller) and the initials box stopped scrolling.
- **A minor per battery (10-19).** "Every group of changes that is the result of a balance battery run should result in a
  new minor version", then "stop doing the new day new minor thing" (a day is NOT a minor any more): the day 5.1 (10-16..18,
  patch 0-141) was split at each battery-result commit, 5.1.0-92 unchanged (first split 5.1-5.9 with a day minor 5.7, re-folded
  the same hour). Commit subjects and the slow logs keep the old numbers; the board's six affected rows were corrected through FIXES. The same
  day 6.0.1 (the 01:13 axis-balance battery) became 6.1.0 and 6.0.2-5 became 6.1.1-4 (no board row sat on a 6.0.x).

  | old 5.1.patch | new | battery-result commit |
  |---|---|---|
  | 0-92 | 5.1.0-92 (unchanged) | `b9327e5` trio scale (4.6.0), 16 of 20 trios |
  | 93 | 5.2.0 | `40fa8cf` late tiers steeper, 20 trios 3/3 |
  | 94-96 | 5.3.0-2 | `33c1462` Sol one shield charge a beam, 20 trios 3/3 |
  | 97-107 | 5.4.0-10 | `90b5cc0` difficulty band, 20/20 perfect, random 0/20 |
  | 108-113 | 5.5.0-5 | `514748b` late tiers evened per tower, 16 winnable 3/3 |
  | 114-125 | 5.6.0-11 | `310fe4d` ATC Tether pulses, 20/20 perfect, random 0/60 |
  | 126 | 5.7.0 | `3b7d5e8` axis balance, 16 winnable 3/3, random 0/60 |
  | 127-141 | 5.8.0-14 | `9129624` late balance, 20/20 perfect, random 1/60 |

- **Guest tier (10-02):** first owner-only and a nav entry, then guest ("aspira should be public, behind cloudflare"),
  landing-wheel section; the page moved to `/spire` 10-04 with `/aspira` a 301.

### 9.x The 7.0.0 release note (moved from ARCHITECTURE §9.4, 2026-11-08)

**7.0.0 (2026-10-30, 409accb)**: the tier redesign and the tower redesigns shipped as a MAJOR (owner: "can you also release what you have as 7.0 even if it's not completely ready?"); 7.0.x patches since. Known open at release: ARC measures 0 +1 -3 +2 against its target +2 -2 -2 +2 (swarm fast shield armor; the charge-up strike follows in a 7.0.x patch).

