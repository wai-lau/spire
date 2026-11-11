## 3. Economy and flow history

- **Start money:** 100 -> a 10,000 playtest start (`PLAY_MONEY`, 10-02) -> 120.
- **Waves:** a "send wave" button with an early bonus (3 credits per second skipped), a 15 s
  countdown only while the field was clear, then auto-send, then a fixed `WAVE_TIMER`: 10 -> 13 ->
  16 s (10-02, "thin the field"), halved to 8, 20% shorter to 6.4 (10-12). The send button and the
  Tab key went with the early bonus. An "every-8th-wave bonus" (credits / interest / lives) was cut.
  The first four waves were fixed (swarm, shield, armor, fast) from the start; the 1-5 type mix died.
  After a boss: no wait -> wait for the sky -> the Challenge button (10-12), delayed 2 s (10-13).
  The boss holds the timer (10-02) and a boss wave never rides it (10-09).
- **Interest:** 3% base, +1% from bonuses; paid on money at the moment of sending; payout capped at
  4 x the wave, then 20 x the wave, then uncapped (10-12 "no interest cap pls"); base cut to 2% on
  10-14 ("balance the money": at 3% uncapped, 97% of a run's money was interest, ~350k banked by
  wave 91). The boss drop was +10 lives or +5% interest, then +12 / +1%, now +6 / +1%. The star
  once dropped score or credits. Credits flew as "+N" pop-ups until 10-09 (now dots).
- **Tower prices:** all 40; x2 per tower standing (10-02), x1.5 (10-04). Sell returned 70%
  (-> 95%, 10-13). The first upgrade was 5.9 x build price, halved to 2.95.
- **Upgrade ladder:** `SKILL_STEP_COST` 2 / 3.5 / 5.5 / 8 / 10.5 / 13 (a full six-point chart 42.5
  build prices), 2.5 / 4 / 7 / 11 / 16 / 22 (10-06 "more expensive and more powerful": 62.5), nine
  points ~6,980c (10-07), fifteen ~27,820c, sixteen with the capstone ~39,460c.
- **Core price ladder (10-06..07):** `CORE_COST` 1000 .. 5000 a level, 27k in all (76.5k before it was
  flattened). Measured 10-07: 0 of 192 scripted games won while saving for it, the same players won
  76% without it — the "cliff at wave 60" was the core's price. Hence the free core (§4).
- **Bounty:** `BOUNTY_KNEE` 60 -> 30, late slope 0.2 -> 0.1, `BOUNTY_MUL` 1 -> 1.25 -> 0.7
  ("way too much money in the game", 10-12); swarm bounty 0.18 -> 0.09 -> 0.18 -> 0.36 as its count
  halved. The interest payout cap and the "money run phase 7" (a spender was tight late, only a saver
  loose) are why the curve is what it is.
- **Speeds:** 1x/2x/3x -> 0.5x added -> 10x for testing -> 1/4x -> `BASE_SPEED` 2 (1x was the old 2x)
  and back to 1; now 1 / 1.5 / 2 / 3 (10x owner-only), keys 1-4. Auto-wait: 8 s / 3 s then 6 / 2 / 1;
  stages 1x / 1/2x / 1/4x then shares of the chosen speed; auto-SPEED (3x when no enemy near)
  existed 10-09..12 and was removed.
- **Score:** shown in the HUD until 10-05 ("no one cares about score"); extra lives at 50,000 then
  every 100,000 were paid mid-wave until 10-14.
- **Time:** the sim ran at a hidden 3x at "1x" until it was rescaled so 1x is real time (every rate
  x3, every duration /3).

**Auto-wait, gone (2026-10-22).** The checkbox slowed the whole GAME to x0.125 when an enemy was 0.5 s from the core. The owner made
it always on but enemies-only ("instead of slowing down the game, slow down the enemies only", "only enemies within the auto-wait
distance slow down"): ENEMY WAIT, per enemy, x0.125 inside 0.5 s at its own pace. The sims then found the game unloseable (138 of 140
trio games won, no life lost through wave 96, the speed probe saturating at x4), and the owner replaced it with the lanes' CORE TWIST
(the same 3.5 s, as path) - "gradually increase the twist of the lane so that the enemies take the same amount of time".

