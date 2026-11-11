## 6. Damage model history

**Armor, until 2026-10-28:** a flat bite off every hit (`trunc(armor - frost)`), never below 10% of the hit; strips subtracted, past
zero, and NEGATIVE armor was a flat bonus on every later hit from every tower, floored at minus the wave's armor reference
(`armorRefOf`; 10-22 "boss armor floor to everything"). The owner found it an on/off ("I didn't like how it was an on/off") and it
hid most of SOL's and ACD's late damage: every scorch / burn tick took up to the wave's armor (~640 at wave 111) as a bonus - ~77k a
Focus-IV scorch stack on a ~650 hit. The armor rework (2026-10-28) made armor a curve (`armorTake`), strips multiply
(`shredArmor`), every type armored (`ARMOR_ALL` swarm/fast 0.1, shield 0.15), and SOL's / ACD's td curve x12 / x3.5 to replace
the bonus (late rows at 13 points, 111-119, swarm/fast/shield/armor % leaked: SOL 20/55/11/70 -> 99/100/100/100 bare -> 34/100/71/80;
ACD 0/1/6/0 -> 95/100/94/95 -> 46/44/31/19); fast HP x0.8 in section 4 (fast beat 4 towers). A "shredded takes extra" mechanic
was proposed and refused.

Slows: ONE at a time (strongest wins) -> logarithmic stack across towers (`1 + 0.5 ln n`) -> per-source
multiplicative with debuff SHAPES (10-05) -> shaped (`SLOW_KNEE` / `SLOW_CAP`, 10-11, "waves don't take as
long to kill"). Fast's slow cap 0.9 -> 0.99 -> 0.96 -> 0.88 -> derived from its speed (0.84 at 1.91x; 10-12, after
fast enemies "froze in place" under stacked slows); a slow can never fully stop an enemy (`f902400`). A shield
once held off only hits, not slows; 10-12 "shielded units cannot be slowed while they have shields". Armor: a flat
bite, floor 10%, 12% a wave -> power curves; "SOL ignores armor" until 10-07; reductions permanent and
negative-able (10-03); quiet hits skipped armor until 10-12 ("allow negative armor to apply to everything").
Damage numbers: every hit shows (10-06), culled by size at `DMG_MAX` 120, sized by the pre-armor hit, grey by
the share armor took (10-09), flying away from the tower (`DMG_FLY` 30 -> 90). Credit for debuff-added damage goes
to the debuffer (10-12). Crits were a CRIT label, then a pink number, then marigold (the `orange` token; current).

**The armor floor (2026-10-22).** Bosses alone floored at minus their wave's armor (2026-10-13); the owner, seeing a Corrosion VI jet strip
~53k armor a second, tried a floor for all, reverted it ("actually no floor"), then kept it ("boss armor floor to everything").

