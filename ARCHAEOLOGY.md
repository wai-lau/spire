# THE SPIRE — ARCHAEOLOGY

Incidents, superseded designs, balance measurements and perf history: the "why it's like
this". The current design is in [ARCHITECTURE.md](ARCHITECTURE.md); **the top-level sections
below mirror its numbering** (§2 here = history of ARCHITECTURE §2, and so on; §0 is the
timeline; §12 the value snapshot at 4.4.2; §13 the battery log by date; sub-numbers are local to this file). Created 2026-10-14 when /spire became its own repo (`wai-lau/spire`,
submodule `apps/spire`); rewritten the same day when ARCHITECTURE.md became a current-state
design document, and condensed to tables on 2026-10-15 (the dated notes it carried moved here).
exec-fn's own ARCHAEOLOGY.md holds no /aspira history. Sources: this repo's
`git log` (about 1,330 commits at 5.1.32, 2026-10-01 first) and the dated owner-command log that
ARCHITECTURE.md used to be — **the verbatim old ARCHITECTURE.md is in git:
`git show f00d730:ARCHITECTURE.md`** (every entry below was condensed from it; go there for
the full wording). Values here are SUPERSEDED unless a line says "still". Owner quotes are
the owner's (Wai, she/her) words from the commit log.

Owner answers to the Leader's questions, newest first: [docs/answered-questions.md](docs/answered-questions.md).

## Sections (ARCHAEOLOGY)

The sections live one file each in `docs/archaeology/` (owner, 2026-11-10: "add a 500 line limit to every file, including docs, split architecture into cohesive docs"); a reference such as "§4.8" resolves through this index.

| § | topic | file |
|---|---|---|
| 0 | Timeline | [00-timeline.md](docs/archaeology/00-timeline.md) |
| 1 | Overview history | [01-overview.md](docs/archaeology/01-overview.md) |
| 2 | Board and geometry history | [02-board.md](docs/archaeology/02-board.md) |
| 3 | Economy and flow history | [03-economy.md](docs/archaeology/03-economy.md) |
| 4 | Towers history | [04-towers.md](docs/archaeology/04-towers.md) |
| 5 | Enemies, waves and bosses history | [05-enemies-waves-bosses.md](docs/archaeology/05-enemies-waves-bosses.md) |
| 6 | Damage model history | [06-damage.md](docs/archaeology/06-damage.md) |
| 7 | Interface history | [07-interface.md](docs/archaeology/07-interface.md) |
| 8 | Rendering, 3D, audio and performance history | [08-rendering-audio-perf.md](docs/archaeology/08-rendering-audio-perf.md) |
| 9 | Meta history | [09-meta.md](docs/archaeology/09-meta.md) |
| 10 | Tech history | [10-tech.md](docs/archaeology/10-tech.md) |
| 11 | Incidents and traps found the hard way | [11-incidents-traps.md](docs/archaeology/11-incidents-traps.md) |
| 12 | Snapshot: the tuned numbers at 4.4.2 (2026-10-15; 12.1-12.13) | [12-snapshot-4.4.2.md](docs/archaeology/12-snapshot-4.4.2.md) |
| 13 | Battery log (by date) | [13-battery-log.md](docs/archaeology/13-battery-log.md) |

### Subsections

- [04-towers.md](docs/archaeology/04-towers.md): 4.1 The first towers and trees (10-01..05); 4.2 Base stats over time; 4.3 The skill charts; 4.4 Tiers and the chart; 4.4-ter SOL's prism (2026-10-26 .. 2026-11-04); 4.4-quater SOL's band model, as ARCHITECTURE described it until 7.6.0; 4.5 Upgrading: UI history; 4.6 The counter matrix and role fits; 4.6b GRV and ATC: the numbers and how they got here (2026-10-15..16); 4.6b-bis GRV as ARCHITECTURE described it before the 2026-10-25 rework (kept there until 6.17.5); 4.4-bis ARC and FRZ lines ARCHITECTURE 4.4 carried until 6.17.9; 4.6c-bis CRR and IFR as ARCHITECTURE described them until 6.17.8; 4.6c-ter CRR as ARCHITECTURE described it until 7.5.0 (2026-11-04); 4.6d Trio scale, the rounds (2026-10-15..16); 4.7 The core and its powers; 4.8 Movement, 10-03 to 10-13; 4.9 Targeting and sizes
- [05-enemies-waves-bosses.md](docs/archaeology/05-enemies-waves-bosses.md): 5.x The boss order and table before the 2026-11-07 reorder, and the refit in progress (moved from ARCHITECTURE §5.4, 2026-11-08)
- [08-rendering-audio-perf.md](docs/archaeology/08-rendering-audio-perf.md): 8.1 3D in one day (10-09, four shapes); 8.2 Perf rounds; 8.3 3D frames, 10-09..14; 8.3b The iPhone lag round, 10-31 (7.0.14-7.0.28); 8.4 Audio history; 8.5 The look passes, 11-06 .. 11-09 (Visual)
- [09-meta.md](docs/archaeology/09-meta.md): 9.x The 7.0.0 release note (moved from ARCHITECTURE §9.4, 2026-11-08)
- [12-snapshot-4.4.2.md](docs/archaeology/12-snapshot-4.4.2.md): 12.1 Board and lanes; 12.2 Economy; 12.3 Tower base stats; 12.4 ARC; 12.5 FRZ; 12.6 SOL; 12.7 ACD; 12.8 Core powers; 12.9 Enemies and curves; 12.9-bis Late armor against raw hits (7.5.3, 2026-11-05); 12.10 Bosses; 12.10b IFR at 6.5.0 (2026-10-20, the axes redone); 12.11 Damage, slows, numbers; 12.12 Interface and rendering budgets; 12.13 Meta
- [13-battery-log.md](docs/archaeology/13-battery-log.md): 13.1 OLD marks targets (2026-10-23 and the 2026-10-29 morning) - superseded (was 12.x); 13.2 The 6.16.0 battery (2026-10-28; a6bc1c9, cc67188, 4e3461c) (was 12.y); 13.3 The 6.17.0 boss pass (2026-10-28; 909491b) (was 12.z); 13.4 Difficulty by player, measured (2026-10-28; snapshot 909491b) (was 12.w); 13.5 Dated notes moved out of ARCHITECTURE.md (2026-10-30, 6.18.37) (was 12.v); 13.6 Waves 1-12 and the ARC/CRR tier-0 cut (2026-10-30, 6.18.43; d83b9aa) (was 12.u); 13.7 The 7.1 pass (2026-11-01 .. 11-03; 012f378 .. 5b28eac) (was 12.t); 13.8 Levers measured and DROPPED, 2026-11-05 - do not re-run (was 12.s); 13.9 Look and demo numbers, 2026-11-07 (7.7.111 .. 7.7.115; Visual) (was 12.r); 13.10 The capstone mechanics' numbers (2026-11-07, live 7.7.121; Wai's picks 2026-11-06) (was 12.q); 13.11 The paths pass, 2026-11-07 .. 11-09 (Balance; numbers as Leader relayed them)
