# THE SPIRE - game design

Spiral tower defence at `wai-lau.net/spire`, phone first. The CURRENT design. Written against the code at 5.1.32 (2026-10-16);
the header, the pillars, §2.1, §4.1, §4.2 and the named constants re-checked at 6.18.36 (2026-10-30); §4.1 and §4.8 (the mark target,
COUNTERS) re-checked at 7.10.1 (2026-11-07); §4.5 (the seven towers), §4.6, §5.4 (the bosses) and §9.4 rewritten against the code at
7.12.6 (2026-11-08); every backticked name, every § pointer, every stated constant value and §11's view traps checked against the
code at 7.12.34 (2026-11-09). Other sections may lag the code: **the code holds the numbers.** The tuned values at
4.4.2 (its §12, with the later changes noted there), every superseded one, the measurements and the incidents behind the
traps are in **ARCHAEOLOGY.md** (same section numbers). The pre-rewrite text:
`git show f00d730:ARCHITECTURE.md`.

| Reading note | |
|---|---|
| "the owner" | Wai (she/her); a quoted owner rule is the reason for a design |
| `ARCHITECTURE.md §22` in code, the sim README, the parent's CLAUDE.md | this whole file (the game lived in exec-fn's §22 until 2026-10-14) |
| a bare `§N` in an exec-fn context | exec-fn's ARCHITECTURE.md (its §1e serves this app) |
| names | files and ids `aspira-*`; players see THE SPIRE; the title reads `the source`, `ascendant` after a win, or the boss's name |
| units | world units = the 1000 x 1000 chart; "s" = real seconds at 1x; "game s" follows the speed setting |

## Sections (ARCHITECTURE)

The sections live one file each in `docs/architecture/` (owner, 2026-11-10: "add a 500 line limit to every file, including docs, split architecture into cohesive docs"); a reference such as "§4.8" resolves through this index.

| § | topic | file |
|---|---|---|
| 1 | Overview and pillars | [01-overview.md](docs/architecture/01-overview.md) |
| 2 | Board | [02-board.md](docs/architecture/02-board.md) |
| 3 | Economy and flow | [03-economy.md](docs/architecture/03-economy.md) |
| 4.1-4.5 | Towers | [04-towers.md](docs/architecture/04-towers.md) |
| 4.6-4.11 | Towers (continued) | [04b-capstones-marks.md](docs/architecture/04b-capstones-marks.md) |
| 5 | Enemies and waves | [05-enemies-waves.md](docs/architecture/05-enemies-waves.md) |
| 6 | Damage model and statuses | [06-damage.md](docs/architecture/06-damage.md) |
| 7 | Interface | [07-interface.md](docs/architecture/07-interface.md) |
| 8 | Rendering, audio, performance | [08-rendering-audio-perf.md](docs/architecture/08-rendering-audio-perf.md) |
| 9 | Meta | [09-meta.md](docs/architecture/09-meta.md) |
| 10 | Tech | [10-tech.md](docs/architecture/10-tech.md) |
| 11 | Traps (every one load-bearing; the stories: ARCHAEOLOGY §11) | [11-traps.md](docs/architecture/11-traps.md) |

### Subsections

- [02-board.md](docs/architecture/02-board.md): 2.1 Geometry (fixed, never random); 2.2 The play box (pillar 1); 2.3 Shields as segments
- [04-towers.md](docs/architecture/04-towers.md): 4.1 The seven kinds; 4.2 The chart (pillar 4); 4.3 The stat curve, tier 0 and tier I (`web/aspira-curve.js`, `web/aspira-tier01.js`); 4.4 Moving (pillar 3); 4.5 The towers, one by one
- [04b-capstones-marks.md](docs/architecture/04b-capstones-marks.md): 4.6 The capstones (tier V, one axis a tower); 4.7 Rules every axis obeys; 4.8 The mark target (pillar 6); 4.9 Trio scale and the designed deaths; 4.10 The core and its two powers; 4.11 Dormant code (kept on purpose; nothing reaches it)
- [05-enemies-waves.md](docs/architecture/05-enemies-waves.md): 5.1 Types (dice); 5.1b The suits (design, 2026-10-16); 5.2 Scaling (the curves); 5.3 Spawning and formations; 5.4 Bosses; 5.5 The boss sky; 5.6 The four sections (difficulty design, owner 2026-10-22)
- [07-interface.md](docs/architecture/07-interface.md): 7.1 Layout (phone first, 430x932); 7.2 Gestures and keys; 7.3 The tower card (pillar 5); 7.4 Wave list, HUD, end screens
- [08-rendering-audio-perf.md](docs/architecture/08-rendering-audio-perf.md): 8.1 The view (pillar 7); 8.2 The 3D pipeline; 8.3 Draw order and other visuals; 8.4 Audio
- [09-meta.md](docs/architecture/09-meta.md): 9.1 TOP PLAYERS (`spire_board.py`, `/api/spire/ascendants`; pillar 9); 9.2 Slow logs (`spire_perflog.py`, `aspira-perflog.js`); 9.3 Saves; 9.4 Version and changelog
- [10-tech.md](docs/architecture/10-tech.md): 10.1 Files and load order; 10.2 exec-fn integration; 10.3 Tests and the smoke; 10.4 Simulator and balance tooling (`scripts/aspira-sim/`, README there); 10.5 Standing owner rules
