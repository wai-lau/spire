## 11. Incidents and traps found the hard way

**Placement regression (10-02).** The price-doubling commit dropped `const b` from `placeTower` while `ring(..., b.color)`
still used it: every placement threw AFTER paying, placing mode never closed, the first tower never started wave 1.
ESLint's `no-undef` is off (these files share one global scope). The game smoke now covers it.

**The `//` mid-line comment, four times.** A `//` comment inside a line swallowed the rest of the line: 10-09 it commented out
the 3D slices' fade (found 10-14, `0607633`); 10-13 it commented out `gridCol`/`grid` in the bell shader so it failed to compile
and the 3D view went BLANK (`50bb95e`); 10-14 it ate `secs`, `frames`, `avgMs` from slow logs because of the version field's note
(`b4cd0d3`); 10-12 a sim comment swallowed a brace (`a417a78`); also `FLEET_TO_BOSS`'s transfer sat dead inside a comment from
10-11 to 10-14 and an inline comment swallowed the GL `blendFunc` call. A "lint-swallowed" check now flags it. Use `/* */` mid-line.

**A Spotter bug (10-06).** `towerStats`' old Spotter loop multiplied a tower's damage by any neighbour's `aura` — and a chart
FRZ's `aura` is its SLOW, so every tower inside a FRZ dealt ~a third (and the upgrade card showed FRZ 6 -> 2). The loop skips
chart towers; the simulator never saw it (its cached `towerStats` ran with `noAura`).

**Smaller ones.** A card's `Refract` row was swallowed by a `//` comment (10-06); mobile `mediump` blocky rings (highp where the
GPU has it, `6ad2f4a`); the boss sky flip flooded the 3D towers layer white (`9a95549`, `cc77beb`); a tower overlapping a
neighbour sat stuck 42 frames (now glides out 4x faster, `d2dd0fb`); the 3D core stole taps of towers behind it (`4b1feb0`); the
no-funds red stuck after one failed tap (class never removed; now a timer, not `animationend`); score lives were paid mid-wave
(`51ae3c7`); no enemy spawns with 0 HP (`547af47`, early swarms vanished — x0.225 HP left them at 0); the threat-ring script
loaded after draw code that called it (`729bcff`); `.asp-ov{display:flex}` beat the
UA `[hidden]` rule so the overlay never left; the iOS long-press magnifier / text selection cancelled the core's hold (hence the
prefixed `-webkit-user-select`); `Math.ceil` bounties made a cheap swarmer pay 1; the late-game
LAG from hundreds of pools each checking every enemy (bucketed `POOL_CELL`).

**An uncompiled shader shipped (10-31, 7.0.24 -> 7.0.26).** `96167c7` (GPU lanes groundwork, `LANE_GL` false) also changed
`WARP_FS` to splice `LANE_GLSL`; smoke 126/126 and fp IDENTICAL passed, but the smoke's GL is a stand-in that never compiles GLSL,
and the commit had not been through WebKit (it also swept another session's uncommitted powers-dock edit in `aspira.html` in -
commit by path after `git diff` on a shared file). It shipped in 7.0.25 (`c6ba93b`). 7.0.26 (`f98c1ab`) pulled the hunk till
WebKit had compiled it; it came back in 7.0.28 after a gated WebKit compile and picture check. Rule (ARCHITECTURE §11): a shader
edit ships only after a WebKit compile.

**Balance reversals worth remembering.** Wave-1 rule amended; ACD's ramp cap halved and RESTORED; "Lovers at 60% HP" reverted within
the hour; Moons' orbit "dont change moon orbits" reverted (meant all at the farthest); 4/5 moons -> 3; swarm lanes doubled twice;
Corrosion "eats armor again" (`b196869`); 10-13 goo strips 2x its drop (late armor leaks 14-21% -> 6-13%), then goo strength +60% a
tier (-> 1-6%); the cap on interest removed; the speed S-curve and HP hump (10-14); 10-14 ordinary enemies +0.3% faster a wave with HP
divided by the same, swarm bodies halved on the same lanes (x1.15 HP, x2 bounty, x2 leak).

