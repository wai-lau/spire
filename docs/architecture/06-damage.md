## 6. Damage model and statuses

`damage(e, amt, tower, quiet, crit, st)`, in order:

| # | Step | Rule |
|---|---|---|
| 1 | charges | this hit sets off any charge on `e` (ARC Capacitance) |
| 2 | **shield** | unless the hit ignores shields (`st.ignoreShield`), the shield takes the whole hit and pops `st.shieldPop` charges (a quiet hit bounces off); nothing else applies |
| 3 | bleed crit | wired (a non-SOL tower may crit a bleeding enemy for x `BLEED_CRIT_MUL`), but no skilled tower sets `st.bleedCrit` (SOL's Breach crit table is gone), so nothing bleeds crit-ably and the step is inert |
| 4 | marks | damage-taken x `shredMul` |
| 5 | **Fracture** | x while slowed |
| 6 | **armor** | THE CURVE: a hit loses `R / (R + ARMOR_K x hit)`, at most `ARMOR_CAP` (`armorTake`) - a hit as big as the armor loses half, smaller more, bigger less; armor never counts below 0; every type carries `ARMOR_ALL` of an armor unit's armor; frost removes a SHARE of it; armor is LATE-SCALED at spawn (`spawnEnemy`, x `scaleOf`) while tower hits stay raw and are scaled where they meet the enemy, so the curve reads hit x `escale(e)` against R: from wave 60 the same raw hit is a smaller and smaller share of the armor, and late the armor type sits at the cap for every hit whose scaled size is under R / 9 (about 2,500 raw by wave 110), while the LIGHT types' `ARMOR_ALL` share (swarm / fast 10%, shield 15%) now eats most of a small hit too: late, many small hits cost most against swarm, fast and shield (numbers: ARCHAEOLOGY §12.9-bis); EVERY hit, quiet ones too (the old flat bite, 10% floor, negative-armor bonus and minus-reference floor: ARCHAEOLOGY.md) |
| 7 | `bossHitCap` | Justice |
| 8 | floor | a **whole number, at least 1 if it landed** |

| Rule | Design |
|---|---|
| whole numbers | HP, armor and hits are integers; card numbers real values floored; flashes and widths scale by `VIS_DMG` |
| slows | PER SOURCE with a shape: `refresh` (times out) · `once` (permanent) · `stack` (every hit adds); sources combine **multiplicatively**, then the total is **shaped**: linear to `SLOW_KNEE`, easing toward `SLOW_CAP` without reaching it; a tower slow alone caps at `TOWER_SLOW_MAX` |
| fast | takes every slow double, shaped toward `fastSlowCap()` so a fully slowed fast enemy is no slower than any other |
| full stop | only Temporal Drive; shields block all slows; Strength takes 10% of any slow (2026-11-05) |
| armor loss | permanent, multiplied down, never below 0 |
| quiet hits | ticks, pools, splash: no flash; pool hits past `POOL_LOD` show one summed number an enemy |
| numbers | crits marigold; sized by the hit before armor - 14-30 px by (hit / half the damage a second)^0.7 (`DMG_PX_MIN`, `DMG_PX_SPAN`; owner, 2026-11-01: "narrow size band"; the history: ARCHAEOLOGY §12), a shield "0" half a full one, credit pop-ups their own 10-19 px - greyed by armor's share; a shield-soaked "0" in cyan; they hold, shrink and fly away from where the hit came from (`hitFrom` / `fromHit`: the tower, or a CRR bolt's interceptor); a GRV number flies INTO its void (`grvFloat`) (`DMG_FLY`) |

