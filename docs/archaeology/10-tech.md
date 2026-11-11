## 10. Tech history

- **Simulator** born 10-02 (the overnight balance pass): speedups (a plan whose first seed scores below the best skips
  the rest; cached lane trig; `FACING` off; **snapshots** of G + the RNG so a plan resumes from its common prefix
  (`SNAP_CHECK` 29/29 matched); two worker threads; ~2.1 s a plan vs ~5 s), ghosts dropped at death (exact only once no
  arc launches from them), the `threat` strategy, `buildsearch.mjs`. The sweep of 10-07 (game files frozen at `abaa5465`):
  **without the core, 73 of 96 won** (death p10 33 / p50 100); **with the full core ladder, 0 of 192** with a cliff at
  wave 60; ARC Voltage and ACD Corrosion were duds; FRZ flat; core powers did not pay for themselves; FRZ in every subset
  that passes 70 (best without it 67); "late game is easy for a mixed build". Overnight 10-02: with flat defences late waves
  were pure dps and ARC spam won (63 alone vs 64 mixed), so armor and shields now keep pace with HP; dropping any one tower
  cost 3.5-10.5 waves; play style hardly mattered (appetite 20-80%, reserve 0-30 x wave, caps 12-30 all landed 66-74.5).
  10-09 first `trios.mjs`: **3 of 20 trios passed** (ARC+FRZ+SOL, FRZ+SOL+ACD, ARC+SOL+SOL); 10-10 the chart rework had
  dropped Corrosion's armor strip — restored (12/12 trio-style wins). 10-09 range x1.5 for three towers: three towers at
  x1.5 died ~28 waves earlier than six (curve.mjs). 10-11..14 the `waverep`/`countermx`/`swap`/`solo`/`stuck` batteries; 10-15 `buildlog.mjs` (every capstone choice
  of one trio, each purchase by wave) and `payoff.mjs` (each axis buy alone: gain, price, gain a credit; reads a buy
  as a power multiplier).
- **Game smoke (10-11)** "smoke tests for all basic features as commit hook": 17 checks -> 22 now; it exists because a
  trailing `//` comment swallowed `render()`'s else branch (blanked 2D and 3D's floor with no error).
- **File splits at the 500-line cap** (exec-fn's hook): `towers` -> `acid`, `skills` -> `frz`, `chart`, `stats`,
  `sliders`, `desc`, `game` -> `waves`, `floats`, `formations`, `ui` -> `chooser`, `wavelist`, `threat`, `draw` -> `lanes`,
  `effects`, `enemies`, `textcache`, `warp` -> `warplayers`, `fxgl`, `glctx`, `fog`, `solids`, `walls`, `bosses` -> `bossfleet`, `bosssky` (2026-11-09).
- **Dead code removed (2026-11-09, 7.12.31 .. 7.12.33; each proven by `fp.sh` IDENTICAL + the smoke):** ARC's Static charge
  (Capacitance's 10-07 charges that burst when the enemy was next hit or died: `ARC_CAPACITANCE`, `ARC_BURST_R`, `dischargeStatic`,
  `capQueue`, the damage and death hooks, the charge border) - dead since the 10-29 redesign set `st.charge` null; the old SOL
  shot's one-number-a-volley hold (`dmgBatch`); `entCtx`, `moonOrbit` (the moon ring went 11-08), `clampView`, the flat LOD die
  (`warpFlatDie`, unused since 10-12's "swarm should render in full 3d all the time"); six unread look constants (`SOL_TRACK_FLASH`,
  `BOSS_BAR_TRACK`, `DEMO_EDGE`, `ASC_SHOW`, `COIN_R`, `TOWER_CARD_H`); the CRT stack's `.cyber-*` CSS (the page has had `crt=False`
  since 10-09) and six `.asp-*` classes no element carried; two sim scripts (`latesearch.mjs`, `formvalue.mjs`, both on `buyCore`)
  moved to the gitignored `.archaeology/scripts/`. Unread constants in the balance files went to Balance to drop tower by tower.
- **Repo split (10-14):** `/aspira` lived in exec-fn's ARCHITECTURE.md §22 and `api/`, `web/`, `scripts/` until it moved to
  `wai-lau/spire` with history (`git filter-repo`); the parent consumes it as `apps/spire`.

