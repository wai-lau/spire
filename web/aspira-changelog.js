// /spire - WHAT'S NEW (owner, 2026-10-14: "construct a changelog, clicking the version number should pause the game and show the
// changelog on a card ... only include changes that affect the player, like graphics and balance changes"). Newest first; one
// short line a change, in the player's words - a FACT, no reason or explanation (owner, 2026-10-14). Add to the top entry (a new one only at a battery's changes) with every change a player would notice.
// THE VERSION (web/aspira-version.txt, major.minor.patch): the next MINOR is a balance battery's changes - ONLY that, a new day is
// not one (owner, 2026-10-19: "every group of changes that is the result of a balance battery run should result in a new minor
// version" / "stop doing the new day new minor thing"; 5.1 became 5.1-5.8, one a battery, ARCHAEOLOGY.md 9); every other deploy
// bumps patch (semver; "patch", never "tiny" - owner, 2026-10-19). A new TOWER is the next MAJOR (owner, 2026-10-16: "adding grv and atc should be a new major version": their day,
// 4.5, became 5.0 and the next 4.6 5.1).
// each entry's lines in three groups (owner, 2026-10-14: "split changelog balance section, into buff and nerfs, make UI/perf a
// smaller font size than balance"): bu = Buffs (good for the player), ne = Nerfs (bad for the player), u = Perf/UI - SHOWN by subject since
// 2026-10-16 (logSubject: a tower, an enemy type ...), Buffs / Nerfs no longer headed; start a line "Subject: ..." to place it
const CHANGELOG = [
  { v: "6.1", day: "Oct 19", bu: [
    "Arc: Voltage and Capacitance hit far harder from the third purchase.",
    "Freeze: Rime rings bite much harder and Moons are stronger from the third purchase.",
    "Sol: Refraction hops hit 2.5 times harder from the third purchase.",
    "Acid: Contagion pools burn three times hotter from the third purchase.",
    "Carrier: Tether is far stronger and Hangar hits harder from the third purchase.",
  ], ne: [
    "Freeze: Temp's Brittle is a little weaker at the last two purchases.",
    "Carrier: Armament's shots are a little weaker at the last two purchases.",
  ], u: [
    "The flat 2D view is gone - THE SPIRE is 3D only; a browser without WebGL shows a notice.",
  ] },
  { v: "6.0", day: "Oct 18", bu: [
    "Gravity: every fire is three novas in quick succession, each landing where it hits the most enemies; the black hole then forms ahead of the target.",
    "Gravity: the late fire-rate boost comes from whichever path is deepest, and Void grows the nova's reach as Supernova does; Void's inner burn and Radiation's late pellets hit much harder.",
    "Orbital Relay: the tower acts as five instead of three, for 10 s.",
    "The Star: much less HP - any two towers beat it.",
  ], ne: [
    "No effect lasts more than 10 s: Acid pools last at most 5 s, goo 30 s, and a black hole is gone 10 s after it forms.",
    "Gravity: Supernova's nova damage is much lower from the second purchase (three novas a fire now).",
    "Sol: Breach shrapnel no longer deals damage - it breaches the enemies near the one that died instead; Breach crits hit 1.3x harder to make up for it.",
  ], u: [
    "Build cards: the checks and x's re-measured for the new balance.",
  ] },
  { v: "5.8", day: "Oct 18", bu: [
    "Core powers: Temporal Drive and Orbital Relay can run at the same time.",
    "Freeze: Rime rings bite - each ring that reaches an enemy hits it for 4 to 60 times a tick.",
    "Gravity: the nova fires 5.6 times as often at the third purchase and 8.5 times at the capstone; pellets and nova hit harder late; Void slows more.",
    "Sol: 17 beams at the third purchase and 25 at the capstone; Refraction, crits and Breach hit harder late.",
    "Carrier: Tether pulses, shots and Hangar hit harder late.",
    "Acid: Corrosion, Spray and pool burn hit harder late.",
  ], u: [
    "Build cards: the checks and x's against each enemy type re-measured against all six towers - Freeze and Sol now differ.",
    "Shields: an enemy's outer shield layers are spokes, as thick as its outline, from inside the die to just short of its last-layer polygon.",
    "Shield enemies are drawn smaller; their shields stay the same size.",
    "Auto-wait: its first two slow-downs start later - 4 s and 1.5 s from the core (was 6 s and 2 s).",
    "The end screen fits the screen: the leak list and the top players fill the space left and scroll inside themselves.",
    "The wave list names hybrid waves by both traits: swarm+shield, fast+armor.",
  ] },
  { v: "5.7", day: "Oct 18", bu: [
    "Arc: Conductivity gets more strikes, jumps and forks late and hits 1.5 to 3.5 times harder from the third purchase; Voltage x1.35 harder; Capacitance holds more, stronger charges.",
    "Acid: Contagion pools last longer, reach further, pulse faster and burn harder from the third purchase.",
    "Gravity: Void's slow, armor strip, inner burn and aura radius are stronger from the third purchase.",
    "Freeze: Moons - five moons with six moonlets each at the capstone (was four and four), moonlets hit harder; Rime pulses faster and harder.",
  ], u: [
    "The Carrier's short name is now CRR.",
    "Shield pops: the 0 always shows at full size, and the blue ring is gone.",
    "Damage numbers are sized by how big the hit is next to all your towers' damage a second, not next to the biggest hit so far.",
    "The boss health bar now ends inside the screen's edges.",
    "Boss lanes: on phones that hold the board still, the boss lane now fades in fully instead of freezing faint, and a brief gap no longer makes it vanish and fade in again.",
    "The Lovers walk in step - slow one and both slow - so they arrive together.",
    "An Ascendant's best wave counts the win: a loss no longer says 'your best' below it.",
    "Tap the core to fire Temporal Drive when it is ready (otherwise the tap opens the core's card).",
    "Orbital Relay back to x3 (was x5).",
    "The Carrier's description now explains focus fire: each shot hits harder for every other interceptor on the same enemy.",
    "Tapping a tower opens its upgrade card again (its home slot still works too).",
  ] },
  { v: "5.6", day: "Oct 17", bu: [
    "Smoother on phones: damage-number stamps reuse canvases of the same size instead of allocating new ones (the main cause of the late-wave hitches in the slow logs).",
    "Bosses: the Empress has 10% less health; the Chariot x2, the Lovers x2.5, Temperance x1.5, the Devil x2, Justice x2, Judgement x1.6 and Death x1.5 as much.",
    "Smoother late waves: shield rings are found by a formula instead of a loop, and damage-number stamps reuse their canvases instead of making new ones.",
    "Smoother late waves on desktop: the damage-number cache holds three times as many stamps, so numbers stop being redrawn from scratch.",
    "Gravity: the nova fires 3.6 times as often at the third purchase and 5.5 times at the capstone (was 3 and 4.6).",
    "Carrier: Tether pulses hit harder - 2, 3 and 4 times the shot at the first three purchases, 24 at the fourth, 40 at the capstone.",
  ], u: [
    "Lanes turn in finer steps to keep as much of each one on screen as possible.",
    "The build and upgrade cards no longer grey out the board behind them.",
    "Shields: an enemy's last layer loses one side a hit, down to a triangle, which is its last shield - the next hit leaves it unshielded.",
    "A tower's home slot shows only when an upgrade can be bought; the build spots sit 30 u closer to the core.",
  ] },
  { v: "5.5", day: "Oct 17", bu: [
    "Sol: Focus fires 14 beams at the third purchase and 21 at the capstone (was 8 and 12); Refraction, crits and Breach hit harder late.",
    "Gravity: the nova fires 3 times as often at the third purchase and 4.6 times at the capstone; nova, pellets and armor strip hit harder late.",
    "Carrier: interceptors reload faster and fire more volleys late (14 and 16 volleys, was 7 and 8); hits are stronger late.",
    "Acid: Corrosion, Spray and pool burn hit harder late.",
    "Freeze: Brittle x8 and x20, Temp ticks faster late.",
  ], u: [
    "Carrier: the Strafe hit (an interceptor ramming its target on arrival) is gone.",
    "A tower's upgrade card now opens only from its home slot (its origin), not by tapping the tower itself.",
    "The Carrier's short name is CAR again (was ATC).",
    "Carrier: each Hangar level sends one more interceptor at a time (2 at Bay, up to 7 with Full Wing; the Orbital Relay multiplies it by 5).",
    "Damage numbers keep their own colours on a boss's inverted sky.",
    "Shields (enemies and bosses): the last layer is drawn thicker, shrinks to a smaller polygon as it breaks instead of showing a gap, and only breaks once every outer layer is gone.",
    "Bosses: twice as fast (back to full speed) on a boss lane twice as long - the same time to reach the core, over a longer winding road.",
    "Auto-move's confirm now reads NO LEADERBOARD (tap again to confirm).",
    "Death gives no rewards: no credits, score, lives or interest from its wave, and the score's owed lives are not paid at the end.",
    "Enemies can't be targeted, hit, slowed or affected until they come onto the screen.",
    "The tower building spots sit 100 u further from the core.",
    "Auto-move starts off in every new game (a resumed game keeps its own setting).",
    "The Challenge button shows 1 s sooner after a boss and no longer dims as far while it pulses.",
    "Gravity: with the slower Supernova novas, each black hole lasts longer so as many are out at once to merge with, and the holes keep their old pellets, burn and armor strip.",
    "Gravity: Supernova's fire-rate gains are halved (x1.5 / x2 / x2.8 instead of x2 / x3 / x4.6) and each nova hits harder to keep the same damage.",
    "Gravity: black holes give off half as many radiation pellets, each hitting twice as hard.",
    "Gravity: the nova's ring is much thinner and grows brighter and whiter as it collapses into the centre.",
    "Orbital Relay: a relayed tower now acts as five, not three (and a relayed Carrier launches 5 interceptors at a time).",
    "Carrier: Launch is replaced by TETHER - once an interceptor fires at an enemy, a beam joins them that slows it and pulses damage (popping shields); more Tether, a stronger slow and pulse. Capstone (Anchor): the beam runs on to one more enemy nearby. Interceptors now fly and reload at a fixed pace, and the old pin slow needs Tether.",
  ] },
  { v: "5.4", day: "Oct 17", bu: [
    "Gravity: the fourth purchase and the capstone reach further (aura 190 and 215, nova 185 and 230) and slow more (0.35 and 0.4).",
    "Carrier: interceptors fly faster at the fourth purchase and the capstone (2200 and 2600).",
  ], u: [
    "Bosses: the Star has x1.8 health, the Empress x1.5, Strength x1.3, the Chariot x3, the Lovers x2, Temperance x2 and the Devil x1.5.",
    "Perf: on phones whose GPU stalls on uploads, the board is re-sent about once per wave instead of ~17 times (there, lanes simply light up and go dark, without fades).",
    "Perf: the next wave's lane labels are prepared ahead of the wave start instead of in its first frame.",
    "Perf: on phones whose GPU stalls on uploads, the board image is prepared off the frame and swapped in a frame later.",
    "Perf: on phones whose GPU stalls on uploads, a lane that empties mid-wave stays lit until the whole wave is done, instead of costing a redraw.",
    "Shields are drawn about 20 units further out from the enemy they protect.",
    "Damage numbers on a killing blow show the whole hit, not just the health that was left (Carrier, Acid pools, Gravity).",
    "Waves: the game now opens with a fast wave; the first swarm comes at wave 4 instead.",
    "Top players: every row fits on one line (shrunk to fit on a phone), and so does each build card's enemy checks and x's.",
  ] },
  { v: "5.3", day: "Oct 17", bu: [
    "Build cards: the check and x marks against each enemy type are refreshed (Gravity: better vs swarm, worse vs shield; Sol: worse vs shield).",
    "Sol: Focus fires 8 beams at the fourth purchase and 12 at the capstone (was 6 and 8).",
  ] },
  { v: "5.2", day: "Oct 17", bu: [
    "Acid: Corrosion, Spray and Contagion hit x9 harder at the fourth purchase and x36 at the capstone.",
    "Carrier: Armament hits x9 harder at the fourth purchase and x36 at the capstone; Hangar and Launch x3 and x6.",
    "Gravity: nova, pellets and armor strip x9 at the fourth purchase and x36 at the capstone.",
    "Freeze: Brittle x6.8 and x25, Rime x5.5 and x6, Temp ticks 3 and 6 times as often and slows 0.14 and 0.2 more (fourth purchase and capstone).",
  ] },
  { v: "5.1", day: "Oct 16", bu: [
    "Freeze: x1.11 damage.",
    "Sol: x0.85 damage.",
    "Acid: x1.49 damage.",
    "Acid: pools and corrosion drips hit enemies again (broken since 5.1.7).",
    "Carrier: x1.67 damage, at half the rate; an interceptor fires half as many volleys of 10 homing bolts, two at a time side by side (each volley twice the hit), a volley's bolts all at one enemy - if it dies the rest of the volley goes at the next one, and bolts already flying go on a little way; interceptors start firing on the way in, once within 200.",
    "Carrier: range 260 -> 160, movement 200 -> 240; interceptors reach about 1200 out, and what an interceptor circles is slowed the whole time.",
    "Carrier: interceptors x1.75 faster, launched 0.15s apart (was 0.2s), reloading twice as fast.",
    "Gravity: x0.81 damage.",
    "Gravity: black holes pull on each other by mass - a light one falls into a heavy one - and merge into one bigger hole once their centres touch, mass, size and radiation added.",
    "Gravity: a black hole's size is its mass - it shrinks all its life, and the bigger it is the faster it evaporates and radiates; at most 3x the base aura.",
    "Gravity: the aura strips armor harder the closer an enemy is to its centre (it already slowed harder there).",
    "Gravity: a nova that catches nothing still leaves a full-size hole; novas land ahead of their target, so it walks into the opening hole.",
  ], u: [
    "Carrier: interceptors fly smooth loops round their target, about 75 out and wobbling +-20%, steering round the core and towers; bolts reach 390.",
    "Carrier: interceptors half size, growing with Armament to full at VI; a brighter cobalt blue that keeps its colour during boss waves.",
    "Carrier: bolts are short streaks that stretch as they fly; one damage number for every three hits of an interceptor (the strafing pass included), their sum.",
    "Carrier: Hangar stores 25% / 50% / 75% / 100% of the interceptors (tiers I-IV) circling the carrier while there is nothing to hit.",
    "Carrier and Gravity: upgrade descriptions in plainer words.",
    "Carrier: its range only launches the wing - each interceptor then picks its target from everything within its own reach (960).",
    "Carrier: launch and shot sounds; tagline \"Carrier has arrived.\"",
    "Gravity: dark purple (Sol bright pink); the black centre grows logarithmically and the hole shrinks away to nothing.",
    "Gravity: every damage number it deals - nova and pellets - flies into its black hole.",
    "Gravity: the aura has its own sound; tagline \"Massive intervention.\"",
    "Gravity: touching black holes share one accretion disk, the dark of each over every ring.",
    "Gravity and Carrier: smoother with many pellets in the air - past ~80 a Gravity's pellets merge into fewer, harder ones (same damage on average).",
    "Threat marks are bright red, on a boss sky too.",
    "Perf: 3D view does less per-frame GPU setup work.",
    "Perf: damage numbers and floating texts in the 3D view draw a little faster.",
    "Perf: the 3D view skips compositing a full-screen layer that was hidden underneath another.",
    "Perf: the 3D view spends less CPU per frame on stars, tower charts and beams.",
    "Perf: 3D towers, the core and all numbers and text now draw on the same layer as the enemies - one less full-screen layer for the GPU (they are a touch softer).",
    "Perf: the 3D overlay is laid down in one pass instead of clear-then-draw.",
    "Perf: the lane brightening is done in the 3D shader.",
    "Perf: high and low quality draw the board's grid and lanes from one cached layer.",
    "Perf: the 3D view no longer copies its WebGL picture into the 2D overlay every frame.",
    "Perf: the 3D view no longer re-sends its moving layer to the GPU every frame while a GRV black hole is alive.",
    "Perf: the boss sky's spread no longer re-sends the moving layer to the GPU every frame.",
    "Perf: light cones in the 3D view cost the GPU about a quarter of what they did.",
    "Perf: the 3D bell shader does less per-pixel work.",
    "Perf: the 3D bell shader skips grid and texture work where it cannot show.",
    "Perf: wave starts no longer hitch (the lane turns are worked out ahead of time).",
    "Perf: the first tower and the first boss sky no longer hitch (the game warms up its drawing at load).",
    "If the game runs slowly it now drops straight from 3D to low quality (it used to pass through high).",
    "Gravity: black holes evaporate 2.5x as fast (by their real size, so a big merged hole no longer lingers), and the tower fires faster with bigger auras to make up for it.",
    "Gravity: black holes drift together and merge only when their centres meet, not as soon as they touch.",
    "Gravity: a black hole can grow three times bigger on screen.",
    "Fixed: the game froze as soon as a black hole appeared (5.1.82).",
    "Gravity: a black hole no longer grows on its own radiation - only the nova's hit and its burning centre feed it.",
    "Gravity: the nova hits twice as hard.",
    "Gravity: the inner aura is now the size of the black centre - it burns what it touches (feeding the hole) and slows the most.",
    "Damage numbers draw over Gravity's black holes and auras.",
    "Gravity: the black centre burns twice as hard, and shows one number a second per enemy (the sum) instead of a stream of small ones.",
    "Gravity: big black holes evaporate exponentially faster, and steeply - a merged giant burns off quickly.",
    "Gravity: its damage numbers (radiation and nova) fly off the enemy that was hit, like every other tower's.",
    "Fixed: movement-range rings no longer stay on after resuming a saved game.",
    "Orbital Relay: a relayed tower's hexagon is solid with a softly pulsing glow, and a thinner second hexagon outside it.",
    "Orbital Relay: while you pick its target, each tower flashes the same hexagon round its base (was a circle).",
    "Orbital Relay: its hexagon is whole again in 3D (its front edge was cut off).",
    "Orbital Relay: its hexagon sits just outside the tower's base, so it shows (it was hidden under the tower).",
    "Bosses feel heavier: every boss and its fleet move at half speed with twice the health.",
    "Damage numbers use each tower's build-card text colour (paler for Gravity and Carrier), with a black outline - Freeze's chill and Acid's pools too.",
    "ATC: its description says how many interceptors it can store in orbit, not a percentage.",
    "ATC: when a cleared field sends the next wave early, the carrier still readies the interceptors that skipped wait would have reloaded.",
    "Spire is 3D only now - the High and Low quality options are gone.",
    "Gravity: its aura strips armor faster (x2.5, was x1.5).",
    "Death has less health, so every team that can win can beat it.",
    "Build cards: the checks and x's are spaced apart.",
    "ATC: moving the carrier no longer leaves streaks from the interceptors orbiting it.",
    "Every tower now starts on Near targeting (Freeze was Fresh, Sol and Acid were Biggest).",
    "Orbital Relay: the glow traces the tower's own base hexagon on the floor instead of a circle - the tower hides the part behind it.",
    "ATC: launches only at enemies inside its range; once out, interceptors still chase anything within their long reach.",
    "Autosave: a checkpoint after every boss, once the field is clear - resume starts between waves, never mid-fight.",
    "Slow frames now lower the quality even if you picked it yourself (it tells you, and never raises it again).",
    "Build cards: each enemy symbol keeps its own colour - fast no longer took the tower's colour.",
    "All towers: damage numbers in the colour of the tower that dealt them (crits white), greying with the armor that blunted them.",
    "All towers: damage numbers fly away from where the hit came from - the tower, the bolt's or pellet's way, the enemy an arc jumped from, the pool or blast.",
    "All towers: the six tower colours sit evenly round the colour wheel, as the eye sees it - Arc a touch yellower, Acid greener, Freeze tealer, Carrier deeper blue, Gravity more purple, Sol coral-pink.",
    "Upgrade-ready chevrons keep the tower's colour during a boss wave.",
    "Core: Temporal Drive freezes swarms completely - their wander too; any slow slows their wander as well.",
    "Tower card: targeting priority sits at the bottom of the card on a wide screen.",
    "Auto-move: a tower weighs how long it takes to glide somewhere, and goes round the core instead of stopping behind it.",
    "Gravity: a thin ring pulses out to the edge of each black hole's aura, like Freeze's Permafrost, showing its reach.",
    "Lanes: a lit lane's glow fades out gradually as it reaches the core; the line itself runs on in.",
    "Build cards: what each tower is good and bad against shown as the enemy symbols with checks and x's - three of each, from the simulator's numbers.",
    "Tower cards: no \"Shields -1 / hit\" row where a hit just pops one shield, as every hit does.",
    "Wave list and cards: the swarm's cube shows as a square, not a hexagon.",
    "Carrier: a hairline trail follows each interceptor's path.",
    "Cards: build cards in two columns, in an order shuffled once and kept; Gravity and Carrier text paler, as readable as the rest.",
    "Top players: a version column - the game version each score was played on; Carrier teams can post again; JUU and SMD 6 lives less (the Lovers once paid their lives twice).",
    "Perf: late in the game the upcoming-wave list rebuilds about 9x faster, damage numbers no longer each make a new text image as they shrink, the 3D star field draws twice as fast, Gravity's pellets and Carrier's bolts find targets faster, and enemies in formation move more cheaply.",
    "Perf: less memory churn every step - enemy movement and Gravity / Carrier projectiles no longer make garbage (fewer GC hitches); low quality no longer draws Gravity's nova numbers (it already hid every other damage number).",
    "Battery: the sound engine sleeps while the tab is hidden or the game is muted.",
    "Sound: every sample levelled to the same loudness.",
    "Sound: each enemy type has its own death sound; Sol has a new attack sound.",
    "Sound: boss warnings, boss voices and build / upgrade voice lines about half as loud, nearer the rest.",
    "Changelog: grouped by tower, enemy type, bosses and core, in smaller type.",
  ] },
  { v: "5.0", day: "Oct 15", u: [
    "Gravity: nova damage numbers fly into the sphere.",
    "Carrier: interceptors fly a clothespin - straight out, loop their target firing, straight home.",
    "Carrier's short name is ATC.",
    "Carrier: interceptors are thin, long darts; each shot is light-blue bolts side by side, and Autopilot's pellets are light blue.",
    "Gravity: a black-hole look - its aura bands white-hot, yellow, coral, pink, plum and deep purple; its colour a magenta.",
    "Gravity: the sphere and its rings draw over damage numbers.",
    "Gravity: the nova explodes fully first, then the sphere and its aura appear.",
    "Gravity: the nova is a thin ring collapsing inward, faster and faster, purple paling; the sphere appears where it closes.",
    "Gravity: radiation pellets fly out in every direction, purple, and can miss.",
  ], ne: [
    "Enemies move three times as fast until they come onto the screen.",
    "Enemies grow 2% a wave faster than before from wave 80 (bosses unchanged).",
    "Arc: Capacitance holds fewer charges late (5 and 6, was 6 and 8) and Voltage hits 1.3 times harder late.",
    "Freeze: Brittle x4.2 and x10.6 late (was x8 and x20).",
    "Late trims to even out the axes: Acid Corrosion and Spray x0.9, Carrier Hangar and Tether x0.75, Freeze Brittle x0.65, Gravity nova hit x0.8 (fourth purchase and capstone).",
    "Arc: late tiers trimmed - Voltage and the spread hit lower, Conductivity forks and strikes and Capacitance charges fewer at the capstone.",
    "Gravity: an untaken Gravity tower is weaker (aura 45, slow 0.04, nova x0.8, pellets 0.1, burn x3); first purchase aura 80, slow 0.10, nova x2.",
    "Carrier: an untaken Carrier launches 3 interceptors at x0.6 the hit (first purchase 5 at x2).",
    "Freeze: late tiers eased from the last version - Brittle 5.5 and 13.8, Rime 0.30 and 0.44, Temp tick 0.13 and 0.07 s, slow 0.53 and 0.67.",
    "Sol: each beam breaks one shield charge - no more extra from Focus or Refraction.",
    "Gravity: the aura deals no damage.",
    "Carrier: a shot is three bolts, each a third of its hit (armor cuts each).",
    "Carrier: less ammo a sortie (8, to 16 at Autopilot; was 12 to 28).",
    "Carrier: after a kill an interceptor takes a new target only close by, else flies home.",
  ], bu: [
    "Gravity: the aura's size grows with the damage its nova dealt.",
    "Carrier: every axis raises the shot's hit - Armament the most (up to x15), Hangar and Launch up to x5.1 each.",
    "Carrier Hangar: focus fire - each wingmate looping the same target adds to every shot on it.",
    "Carrier Launch: a strafing pass - an interceptor rams its target as it arrives; also a shorter reload (1.5s, to 0.3s at Warp).",
    "Carrier: interceptors chase a target up to 3x the tower's reach, and send enough of themselves to kill it.",
    "Gravity: the aura strips armor 3x faster.",
    "Carrier: fires twice as fast.",
    "Carrier: interceptors fly 1.5x faster.",
    "Carrier: every shot slows its target (20%, double on fast enemies; never shielded ones).",
    "Gravity: the aura slows in two rings - its core far harder.",
    "New tower: Carrier. Launches interceptors one by one; each flies to an enemy, fires its shots and flies home to reload. Good vs fast and shields.",
    "Gravity: nova and aura x1.7 wider.",
    "Gravity: x3 radiation pellets.",
    "New tower: Gravity. A nova leaves a black sphere whose aura burns, slows and strips armor, growing with every hit; it radiates pellets. Strong against swarm and armor, weak to fast and shields. Axes: Void, Supernova, Radiation.",
  ] },
  { v: "4.4", day: "Oct 15", ne: [
    "Upgrades cost x1.6.",
    "A boss on two lanes pays its reward once (Strength and Temperance paid twice).",
    "Arc Voltage: hit x1.9 / x3.9 / x6.4 / x8.4 at purchases I-IV (was up to x69.9).",
    "Core powers: one at a time - the other waits until it ends.",
  ], bu: [
    "The Star (wave 12): x0.8 HP - any two towers can beat it.",
    "Waves 1-12: swarm enemies x0.8 HP.",
    "Arc Conductivity and Capacitance: each purchase also raises the hit (x1.4 / x2.0 / x2.5 / x2.9).",
    "Waves 1-24: a quarter as many enemies, each x4 HP and x4 credits, easing back by wave 36. Bosses unchanged.",
    "Armor waves: x1.5 enemies (was x2), each worth 1.33 credits (was 1).",
  ], u: [
    "Damage numbers over 1,000 read short: 1.7k, 17k, 1.2M.",
    "Changelog text smaller.",
    "A tower flashes for an upgrade only when its next buy is affordable.",
    "Using either core power slams the core down while it runs.",
    "Swarm enemies drawn 1.5x bigger, fast 0.9x, shield 0.8x.",
    "Tower card stats in sections, one a mechanic (e.g. Freeze Aura, Permafrost, Moons).",
    "Tower card: a stat an upgrade adds shows its new value alone (no \"— →\").",
    "Upgrades: four buys an axis, numbered I-IV; IV is the capstone. The old II-III and IV-V are one buy each, at both tiers' price.",
    "Build cards: 'good vs' follows the counter matrix - the type a tower is THE counter of, then the ones it helps against (Freeze no longer claims shields).",
  ] },
  { v: "4.3", day: "Oct 14", bu: [
    "Permafrost pulses twice as often, each half as strong.",
    "Auto-move glides 1.5x faster, and as fast as the game speed (10x glides 10x).",
    "Swarms: 20% fewer enemies.",
    "Acid Contagion: a kill in a pool leaves a new pool.",
    "Acid Corrosion: goo lasts 40 s (was 8).",
    "Swarms: half as many enemies, x2 credits each.",
    "Enemies: less HP through the mid-game.",
    "Late enemies: less HP.",
  ], ne: [
    "Swarm enemies vary more in speed (50-150%).",
    "Swarm waves: at least 12 enemies.",
    "Armor waves: twice as many enemies, each worth half the credits.",
    "Enemies speed up through the mid-game.",
    "Mid-game enemies: up to x1.5 HP.",
    "Late enemies: faster.",
    "Swarms: x1.15 HP; 2 lives per leak.",
    "Boss escorts give 20% of their HP to their boss.",
    "Interest: 2% (was 3%).",
    "+6 lives per 100,000 score now arrive when the wave's boss falls.",
    "Orbital Relay: 11.25 s (was 22.5); stays on its tower.",
    "Temporal Drive: ends when no enemies are left; can't be used on an empty board.",
  ], u: [
    "The tower card closes with an X beside the upgrade button.",
    "Permafrost's stat says what it adds: \"+11% slow, stacking\".",
    "Tower descriptions match what towers do: Arc Conductivity IV twin arcs, V three; Voltage VI 1.6x per jump; Sublimation VI deeply brittle.",
    "New tower card stats: Arc strikes and burst slow, Freeze Brittle, Frost armor and Shields, Sol Shields; Acid Armor shows % of damage (was -0).",
    "Permafrost's armor loss is a main stat: % of armor at full frost, and how much that is this wave.",
    "More tower card stats: Arc re-strikes and shields; Freeze full frost and cold bite; Sol shrapnel; Acid goo and pool spread.",
    "Tapping the empty bar beside the speed buttons closes the open window.",
    "Autosave: resume from the start of the last wave.",
    "Game speeds: 1x, 1.5x, 2x, 3x (keys 1-4).",
    "3D: faster, most of all on phones; resolution no longer drops.",
    "Acid effects: pools don't stack brightness; Spray V shows its jets; Contagion pools are dashed rings.",
    "Threat ring round the core when an enemy is close, joined to its triangles.",
    "Every lane turned to stay on screen longer.",
    "Powers won from a boss flash when the next wave starts, for 4 s.",
    "Pause button flashes while paused.",
    "Numbers and text: outline only, no glow.",
    "3D: beams are hidden where a tower covers them.",
    "Temporal Drive: no screen shake; the first ring goes out as the core lands.",
    "3D: movement range rings evenly dashed all round.",
    "Upgrade button always shows the cost.",
    "Boss text and power buttons no longer block dragging.",
    "Phone-screen limit: shown only where it blocks a tower, as three thin lines.",
    "3D: shapes below the floor fade out.",
    "Quality slider matches the width of the stats row.",
    "Version number opens this card.",
    "TOP PLAYERS shows the owner's games from Oct 14 on.",
    "TOP PLAYERS initials sit on their lines; the first letter no longer cut off.",
  ] },
  { v: "4.2", day: "Oct 13", bu: [
    "Acid Corrosion: goo strips more armor.",
  ], ne: [
    "Bosses: x1.4 HP; the Empress and Strength x3.5, Death x2.8.",
    "Solar Refraction: cone a third narrower.",
  ], u: [
    "Auto-move glides at half speed; using it marks the game (DQ), off TOP PLAYERS.",
    "Tower cards open from the home slot; an up arrow marks an affordable upgrade.",
    "Swarms spread over twice as many lanes.",
    "From wave 97, augmented enemies wear their augment's colour.",
    "A tower that can't stay put glides home.",
  ] },
  { v: "4.1", day: "Oct 12", bu: [
    "Movement leash x1.5.",
  ], ne: [
    "A boss every 12 waves; the game is won at wave 120.",
    "Enemies: x1.5 HP from wave 25.",
    "Tower ranges x0.75.",
    "Wave timers 20% shorter.",
  ], u: [
    "After a boss, the next wave waits for Challenge.",
    "The game holds while the boss sky turns over.",
    "3D is the default view.",
    "Red threat marks on the closest enemies.",
  ] },
  // the milestones before the changelog, read back from the history (2026-10-14)
  { v: "4.0", day: "Oct 11", bu: ["Tier VI capstones."], ne: ["Three towers a game; core powers cool down by wave."], u: ["Towers drag on a leash and coast.", "TOP PLAYERS."] },
  { v: "3.1", day: "Oct 10", u: ["Towers drag anywhere inside their leash."] },
  { v: "3.0", day: "Oct 9", ne: ["Every boss brings a fleet."], u: ["3D view: the board as a spire, dice enemies, prism towers."] },
  { v: "2.3", day: "Oct 8", bu: ["Capstones."], ne: ["Each boss has its own armor and shields."], u: ["Core powers as buttons."] },
  { v: "2.2", day: "Oct 7", bu: ["Bosses grant the core powers; Orbital Relay."], u: ["Upgrades by dragging the tower's chart."] },
  { v: "2.1", day: "Oct 6", bu: ["Core powers, including Temporal Drive; tower roles."], ne: ["Range rework: shorter ranges."], u: ["Build by tapping a slot."] },
  { v: "2.0", day: "Oct 5", bu: ["Skill charts: three upgrade axes per tower.", "Corner slots open as bosses fall."] },
  { v: "1.3", day: "Oct 4", ne: ["Tower ranges x0.75."] },
  { v: "1.2", day: "Oct 3", bu: ["Solar rework: Impale and bleed."] },
  { v: "1.1", day: "Oct 2", bu: ["Acid tower; upgrade trees for all four towers; six build slots."], ne: ["Ten tarot bosses."] },
  { v: "1.0", day: "Oct 1", u: ["The Spire: spiral tower defence on a star chart."] },
];
// what a line is ABOUT: its "Subject:" prefix if it names one, else the first subject it mentions, else Other (the order here is
// the order shown). Keep ONE line per change a day: merge a later tweak into the line it changes (owner, 2026-10-16: "Merge
// similar changes")
const LOG_SUBJECTS = [["All towers", /^all towers\b/i], ["Arc", /\barcs?\b/i], ["Freeze", /\bfreeze\b|\bfrz\b/i], ["Sol", /\bsol(ar)?\b/i], ["Acid", /\bacid\b|\bacd\b/i],
  ["Carrier", /\bcarriers?\b|\batc\b|\binterceptors?\b/i], ["Gravity", /\bgravity\b|\bgrv\b|\bblack holes?\b/i],
  ["Swarm", /\bswarms?\b/i], ["Fast", /\bfast\b/i], ["Armor", /\barmou?r(ed)?\b/i], ["Shield", /\bshield(s|ed)?\b/i],
  ["Bosses", /\bboss(es)?\b|\bstar\b|\bempress\b|\btarot\b/i], ["Core", /\bcore\b/i], ["Other", /$^/]];
function logSubject(line) {
  const head = (line.match(/^([^:]{1,40}):/) || [])[1];
  if (head) for (const [name, re] of LOG_SUBJECTS) if (re.test(head)) return name;
  let best = "Other", at = Infinity;
  for (const [name, re] of LOG_SUBJECTS) { const m = line.match(re); if (m && m.index < at) { at = m.index; best = name; } }
  return best;
}
// the card: the game pauses while it is open and goes back as it was when it closes
let logWasPaused = null;
function openChangelog() {
  let card = $("asp-log");
  if (!card) {
    card = document.createElement("div");
    card.id = "asp-log"; card.className = "asp-deck asp-log";
    // a day's lines GROUPED BY WHAT THEY CHANGE (owner, 2026-10-16: "group differently, all ATC changes go together, all swarm changes
    // go together / Drop the buff and nerf categories"): a tower, an enemy type, the bosses, the core, else Other - headings only
    // where a day has more than one line (owner, 2026-10-14). bu / ne / u still hold the lines; u (Perf/UI) lines stay a size smaller
    const day = d => {
      const all = [...(d.bu || []), ...(d.ne || []), ...(d.u || [])], ui = new Set(d.u || []);
      const li = (i, name) => "<li" + (ui.has(i) ? ' class="asp-log-ui"' : "") + ">" + (name ? i.replace(new RegExp("^" + name + ":\\s*"), "") : i) + "</li>"; // under its heading, a line's own "Subject:" is dropped
      if (all.length < 2) return "<h3>" + d.v + " · " + d.day + "</h3><ul>" + all.map(i => li(i)).join("") + "</ul>";
      const by = new Map(LOG_SUBJECTS.map(([name]) => [name, []]));
      for (const i of all) by.get(logSubject(i)).push(i);
      return "<h3>" + d.v + " · " + d.day + "</h3>" + [...by].filter(([, is]) => is.length).map(([name, is]) => "<h4>" + name + "</h4><ul>" + is.map(i => li(i, name)).join("") + "</ul>").join("");
    };
    card.innerHTML = '<h2>changes</h2><div class="asp-log-list">' + CHANGELOG.map(day).join("") + "</div>";
    button(card, "asp-primary", "close", closeChangelog);
    document.querySelector(".asp-board").appendChild(card);
  }
  if (!card.hidden && logWasPaused !== null) return;
  logWasPaused = ui.paused; ui.paused = true; card.hidden = false;
}
function closeChangelog() {
  const card = $("asp-log");
  if (card) card.hidden = true;
  if (logWasPaused !== null) { ui.paused = logWasPaused; logWasPaused = null; }
}
(() => {
  const ver = document.querySelector(".asp-ver");
  if (!ver) return;
  ver.setAttribute("role", "button"); ver.setAttribute("aria-label", "what's new"); ver.tabIndex = 0;
  ver.addEventListener("click", openChangelog);
  ver.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openChangelog(); } });
})();
