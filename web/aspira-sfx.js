// /aspira — sound effects, all synthesised with WebAudio (no audio files).
// The context is created on the first tap/key (browsers refuse audio before a
// gesture). Each sound has a minimum gap so a wall of rapid-fire towers is a
// texture, not a roar, and there is a hard cap on live voices.

let AC = null, master = null, outGain = null, noiseBuf = null, voices = 0, muted = false;
// volume slider (owner, 2026-10-02): 0..2, applied AFTER the limiter so it
// really scales what you hear; the default 1 is twice the old loudness
let volume = 1, sfxScale = 1; // sfxScale: every new voice's gain x this (the card's demo scene plays the tower's real sounds quieter - aspira-demo.js)
const VOL_BOOST = 2;
try {
  muted = localStorage.getItem("aspira.mute") === "1";
  const v = parseFloat(localStorage.getItem("aspira.vol"));
  if (v >= 0 && v <= 2) volume = v;
} catch (_e) {}
const lastAt = {};
const MAX_VOICES = 24;
// RARE SOUNDS FIRST AT THE CAP (owner, 2026-11-06: "less frequently played sounds should take priority over more frequently played sounds (in terms
// of SFX concurrent limit)"): each name's TRIGGER RATE, a count decaying with SFX_RATE_TAU; when a new sound finds the voices full, the live sound whose
// name triggers most often goes (a 15 ms fade, then stopped) to make room - but only for a sound rarer than it; else the new one is skipped. Nothing
// else changes: no extra voices, no gain or mix change below the cap
const SFX_RATE_TAU = 2.5, SFX_KILL_FADE = 0.015;
const sfxRate = {}, sfxRateAt = {}, sfxLive = new Set(); // sfxLive: { name, nodes: [[source, gain]], left }
let voicesDying = 0;
const sfxStat = { played: {}, skipped: {}, cut: {} }; // per name, since load (a test reads them)
function sfxBump(name, now) { const r = (sfxRate[name] || 0) * Math.exp(-(now - (sfxRateAt[name] ?? now)) / SFX_RATE_TAU); sfxRateAt[name] = now; return (sfxRate[name] = r + 1); }
const sfxRateNow = (name, now) => (sfxRate[name] || 0) * Math.exp(-(now - (sfxRateAt[name] ?? now)) / SFX_RATE_TAU);
function sfxEnd(node) { voices--; if (node.__dy) voicesDying--; }
// FIFO (owner, 2026-11-09, IFR: "maybe FIFO the sounds (up to 5 sounds instead of 3) alongside priority"): at SOUND_MAX copies a new one does
// not skip - the oldest copy of that name fades out (SFX_KILL_FADE) and the new one plays. Measured (TNsHit00, normalized, x 1/(1+n) a copy):
// 5 copies at 0.15-0.9 s apart peak 0.27-0.33 summed, under NORM_PEAK (0.9) - no further quieting
const SFX_FIFO = { ifr: true };
function sfxFifoCut(name, now) { for (const L of sfxLive) if (L.name === name && !L.cut) return sfxFade(L, now); }
function sfxFade(L, now) { // a live sound out: a SFX_KILL_FADE fade, then stopped (its voices freed as they end)
  L.cut = true; sfxLive.delete(L); sfxStat.cut[L.name] = (sfxStat.cut[L.name] || 0) + 1;
  for (const [src, g] of L.nodes) { if (src.__dy) continue; src.__dy = true; voicesDying++;
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now); g.gain.exponentialRampToValueAtTime(0.0001, now + SFX_KILL_FADE); src.stop(now + SFX_KILL_FADE); } catch (_e) { /* (already stopped) */ } }
}
// A DEMO'S SOUNDS END WITH IT (owner, 2026-11-09: "tower building demos should have sound also"): a sound started inside a demo scene (demoHeld,
// aspira-demo.js) carries that scene (L.scene); when the scene closes or is rebuilt, sfxCutScene fades out whatever of it still sounds
const sfxScene = () => (typeof demoHeld !== "undefined" && demoHeld ? demoHeld.S : null);
function sfxCutScene(S) { if (!S || !AC) return; const now = AC.currentTime; for (const L of [...sfxLive]) if (L.scene === S && !L.cut) sfxFade(L, now); }
function sfxMakeRoom(name, now) { // -> true when there is a voice for `name` (a commoner cut if need be)
  if (voices - voicesDying <= MAX_VOICES) return true;
  const mine = sfxRateNow(name, now);
  while (voices - voicesDying > MAX_VOICES) {
    let worst = null, wr = mine;
    for (const L of sfxLive) { if (L.cut) continue; const r = sfxRateNow(L.name, now); if (r > wr) { wr = r; worst = L; } }
    if (!worst) return false;
    sfxFade(worst, now);
  }
  return true;
}

function audioUnlock() {
  if (AC) { if (AC.state === "suspended" && !muted && !document.hidden) { AC.resume(); audioSlept = false; } return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = 0.22;
    // a limiter after the mix: with towers firing many times a second, stacked
    // sounds used to sum past full scale and clip into audible zaps/crackle
    const limiter = AC.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = 0.003; limiter.release.value = 0.15;
    outGain = AC.createGain();
    outGain.gain.value = volume * VOL_BOOST;
    master.connect(limiter).connect(outGain).connect(AC.destination);
    loadSamples();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audioSleep(); // (made while muted: asleep at once)
  } catch (_e) { AC = null; }
}
document.addEventListener("pointerdown", audioUnlock);
document.addEventListener("keydown", audioUnlock);
// the audio SLEEPS while nothing can be heard (battery, 2026-10-16): the tab hidden, or muted - a running context keeps the audio
// thread (and a phone's audio hardware) awake, the limiter working on silence. Woken when neither holds, or by the next tap
// (audioUnlock: iOS may refuse a resume outside a gesture); sfx() plays nothing while asleep, as it plays nothing muted
let audioSlept = false;
function audioSleep() {
  if (!AC) return;
  const sleep = document.hidden || muted;
  if (sleep && AC.state === "running") { AC.suspend(); audioSlept = true; } else if (!sleep && audioSlept && AC.state === "suspended") { AC.resume(); audioSlept = false; }
}
document.addEventListener("visibilitychange", audioSleep);

function setMuted(m) {
  muted = m; audioSleep();
  try { localStorage.setItem("aspira.mute", m ? "1" : "0"); } catch (_e) {}
}
function setVolume(v) {
  volume = v;
  if (outGain) outGain.gain.setTargetAtTime(v * VOL_BOOST, AC.currentTime, 0.02);
  try { localStorage.setItem("aspira.vol", String(v)); } catch (_e) {}
}

function envelope(node, t0, dur, vol) {
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * sfxScale), t0 + 0.008); // 8ms fade-in: no start click
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g).connect(master);
  voices++;
  // a synth sound is several nodes: it counts as one copy until its last ends
  const inst = curSound;
  if (inst) { inst.nodes++; inst.live.nodes.push([node, g]); }
  node.onended = () => { sfxEnd(node); if (inst && --inst.nodes === 0) { playing[inst.name]--; sfxLive.delete(inst.live); } };
}

function tone({ type = "sine", f0, f1 = f0, dur = 0.1, vol = 0.3, delay = 0 }) {
  const t0 = AC.currentTime + delay, o = AC.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  envelope(o, t0, dur, vol);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.1, vol = 0.3, freq = 2000, q = 1, delay = 0 }) {
  const t0 = AC.currentTime + delay, src = AC.createBufferSource(), f = AC.createBiquadFilter();
  src.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  src.connect(f);
  envelope(f, t0, dur, vol);
  src.onended = f.onended;
  src.start(t0); src.stop(t0 + dur + 0.02);
}

const notes = (fs, step, opts) => fs.forEach((f, i) => tone({ f0: f, delay: i * step, ...opts }));

const SFX = {
  arc:     () => { noise({ dur: 0.08, vol: 0.2, freq: 3200, q: 2 }); tone({ type: "sawtooth", f0: 600, f1: 1800, dur: 0.07, vol: 0.06 }); },
  // RPR fires a LASER (owner: no bass): a fast falling zap, a brighter buzz
  // under it, a high crack and a faint echo - nothing below ~350Hz
  sol:     () => {
    tone({ f0: 600, f1: 90, dur: 0.32, vol: 0.24 });
    tone({ type: "square", f0: 420, f1: 110, dur: 0.24, vol: 0.05 });
    noise({ dur: 0.07, vol: 0.12, freq: 1400, q: 1.2 });
    tone({ f0: 600, f1: 90, dur: 0.32, vol: 0.06, delay: 0.12 });
  },
  frz:     () => tone({ f0: 900, f1: 480, dur: 0.18, vol: 0.1 }),
  // the GRV nova (2026-10-15): a deep thump that swells, a bright crack on top - a star going off
  // CRR (2026-10-15): an interceptor launching - a short rising whine
  crr:     () => { tone({ type: "triangle", f0: 500, f1: 1400, dur: 0.09, vol: 0.05 }); },
  // an interceptor's SHOT (2026-10-16), once a shot's stream of bolts starts - a short falling zap
  carshot: () => tone({ type: "square", f0: 1800, f1: 900, dur: 0.04, vol: 0.03 }),
  // IFR (2026-10-19): a ball leaving - a low thump; the ring - a crackle
  ifr:     () => { tone({ type: "sine", f0: 160, f1: 60, dur: 0.14, vol: 0.14 }); noise({ dur: 0.05, vol: 0.06, freq: 900, q: 1 }); },
  ifrblast: () => { noise({ dur: 0.12, vol: 0.14, freq: 2200, q: 0.8 }); tone({ type: "sawtooth", f0: 300, f1: 90, dur: 0.1, vol: 0.05 }); },
  // the GRV aura opening, once the nova has collapsed (2026-10-16) - a low swell
  grvaura: () => tone({ type: "sine", f0: 55, f1: 90, dur: 0.35, vol: 0.14 }),
  grv:     () => { tone({ type: "sine", f0: 70, f1: 140, dur: 0.3, vol: 0.22 }); noise({ dur: 0.12, vol: 0.12, freq: 2200, q: 1.5 }); },
  kill:    () => tone({ type: "triangle", f0: 520, f1: 1040, dur: 0.07, vol: 0.16 }),
  // a piece of the boss's HP bar slamming home (owner, 2026-10-27: "play a thud sound, pitched to area of segment"): a low sine
  // dropping fast with a knock of noise on top - the pitch and the loudness from the piece's area (aspira-bossbar.js barThud)
  thud:    (f = 100, vol = 0.25) => { tone({ type: "sine", f0: f * 1.5, f1: f * 0.5, dur: 0.26, vol }); tone({ type: "triangle", f0: f * 2, f1: f * 0.7, dur: 0.1, vol: vol * 0.2 }); noise({ dur: 0.025, vol: vol * 0.35, freq: f * 5, q: 0.8 }); }, // BASS (owner, 2026-10-27: "much more bass-y"): the sine body long and low, a faint triangle an octave up so a phone's speaker, with nothing under ~150 Hz, still hears the knock
  // the core is hit: a SHUTDOWN (owner) - a click, then the power sliding
  // away, everything falling to nothing like a machine switching off
  leak:    () => {
    noise({ dur: 0.03, vol: 0.14, freq: 1800, q: 1 });
    tone({ type: "square", f0: 520, f1: 30, dur: 0.75, vol: 0.09 });
    tone({ f0: 260, f1: 22, dur: 0.85, vol: 0.22 });
  },
  wave:    () => notes([440, 554, 659], 0.07, { type: "triangle", dur: 0.12, vol: 0.18 }),
  build:   () => tone({ type: "square", f0: 300, f1: 600, dur: 0.06, vol: 0.12 }),
  up:      () => notes([523, 784, 1046], 0.06, { type: "triangle", dur: 0.1, vol: 0.18 }),
  sell:    () => notes([523, 330], 0.06, { type: "triangle", dur: 0.1, vol: 0.15 }),
  life:    () => notes([659, 880, 1318], 0.08, { dur: 0.16, vol: 0.18 }),
  over:    () => notes([392, 330, 262, 196], 0.18, { type: "triangle", dur: 0.32, vol: 0.25 }),
  // the CORE'S ABILITIES (owner, 2026-10-06: never the "upgrade complete" sound):
  // time stop a long falling freeze-sweep, Empower a rising charge, Fortify a
  // two-note lock-in
  powertemporal:    () => { tone({ f0: 1400, f1: 120, dur: 0.7, vol: 0.18 }); noise({ dur: 0.4, vol: 0.08, freq: 4000, q: 1.5 }); },
  powerrelay: () => notes([330, 494], 0.09, { type: "square", dur: 0.12, vol: 0.12 }),
};
// minimum seconds between two plays of the same sound
const GAP = { arc: 0.07, kill: 0.04, frz: 0.1, leak: 0.5, carshot: 0.08, thud: 0.015, slam: 0.015 }; // (thud: the bar's pieces land 30 ms apart - the default 0.03 ate every other)

// returns whatever the sound returns (a stop() handle for long sounds), or null
// Optional SAMPLES (owner, 2026-10-02: Brood War sounds) replace a synth
// sound when present. They live in this repo's data/aspira-sfx/ - never committed
// (data/ is gitignored; the repo is public) and served to the page's own
// guest tier through /aspira-sfx/ - listed in its index.json as { "<sound name>": "file" | ["file", ...],
// "_gain": 0.5 } (several files = one picked at random each time). Missing
// folder, index or file: that sound stays synthesised.
const SAMPLE_DIR = "/aspira-sfx/", SAMPLES = {}; // guest-tier route (routes_aspira.py)
let sampleMap = null, sampleGain = 0.5;
// a sample index.json written before an id rename (2026-10-06; car -> crr 2026-10-29) names sounds by the OLD ids
// (chain / slower / reaper / acid, build.reaper, powerfortify ...): read them as the new ones
const LEGACY_SFX = {"chain": "arc", "slower": "frz", "reaper": "sol", "acid": "acd", "powerfortify": "powerrelay", "powerempower": "powerrelay", "powerovercharge": "powerrelay", "powertime": "powertemporal", "car": "crr" /* the carrier's id since 2026-10-29: its launch, build and upgrade samples (car, build.car, up.car) played the synth or the generic sound till 2026-11-03 */};
const sfxKey = k => k.split(".").map(p => LEGACY_SFX[p] || p).join(".");
// SAMPLES TRADED BETWEEN EVENTS (owner, 2026-11-07: "Swap sound effect of shield pop/death and arc attack"): each pair's FILES trade places as the map
// loads; the events keep their own names - so their volume, gap, voice cap and rarity (sfxBump) are theirs as before. A shield pop has no sound of
// its own (shieldBreak); the shield enemy's death is "kill.shield"
const SFX_SAMPLE_SWAP = [["arc", "kill.shield"]];
// THE OWNER'S PICKS OF 2026-11-09, in code so the droplet's index.json is unchanged (only the samples go up): "Shield death sound: TSCDth00.wav";
// "pabDth00.wav death sound for armor"; "current armor death sound, use it for the boss hp tile slam"; "pcaDth01.wav boss death sound"; "clicking
// things should play the BUTTON.WAV sound"; "PError.wav for invalid commands like when you don't have enough money"; "PRescue.wav after beating
// the game"; "replace SOL firing sound with TBaYam02.wav" (solSfx). ARC keeps the shield's old sample (the 11-07 swap, above)
const SFX_FILES = { "kill.shield": "Sound/Terran/SCV/TSCDth00.wav", "kill.armor": "Sound/Protoss/Arbiter/pabDth00.wav", slam: "Sound/Bullet/TTaFir00.wav",
  bossdeath: "Sound/Protoss/Carrier/pcaDth01.wav", click: "Sound/Misc/BUTTON.WAV", error: "Sound/Misc/PError.wav", win: "Sound/Misc/PRescue.wav", solshot: "Sound/Terran/Battle/TBaYam02.wav" };
const swapSfxSamples = m => { for (const [a, b] of SFX_SAMPLE_SWAP) { const A = m[a], B = m[b]; if (B === undefined) delete m[a]; else m[a] = B; if (A === undefined) delete m[b]; else m[b] = A; } return m; };
const migrateSfx = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [sfxKey(k), v]));
fetch(SAMPLE_DIR + "index.json").then(r => (r.ok ? r.json() : null)).then(m => {
  if (!m) return;
  sampleMap = Object.assign(swapSfxSamples(migrateSfx(m)), SFX_FILES); // (SFX_FILES last: the owner's 2026-11-09 picks over the index)
  if (typeof m._gain === "number") sampleGain = m._gain;
  loadSamples();
}).catch(() => {});
function loadSamples() {
  if (!sampleMap || !AC) return;
  for (const [name, files] of Object.entries(sampleMap)) {
    if (name.startsWith("_") || SAMPLES[name]) continue;
    SAMPLES[name] = [];
    // an entry is a file, or { file, start, end } to play only a slice of it
    // (seconds), e.g. just the double beep at the head of an advisor line
    for (const f of sfxClips(name, files)) {
      const clip = typeof f === "string" ? { file: f } : f;
      fetch(SAMPLE_DIR + clip.file).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(clip.file))))
        .then(b => AC.decodeAudioData(b)).then(buf => { const start = clip.start || 0, end = clip.end || buf.duration; SAMPLES[name].push({ buf, start, end, fade: !!clip.fade, norm: sampleNorm(buf, start, end), pk: samplePeak(buf, start, end) }); })
        .catch(() => {});
    }
  }
}
// A LONG CLIP CUT INTO SLICES (owner, 2026-11-07: "take samples from the long IFR sound instead of using the full sound every time"): an event
// whose index entry is ONE plain file plays these [start, end] s of it instead, one a play in turn (sliceNext), each with a short fade in and
// out (SLICE_FADE). In code, so the droplet's index.json is unchanged. IFR's TNsHit00.wav (3.6 s, one fire roar): five 0.44-0.46 s slices,
// each starting just before a rise of its loudness (0.10, 0.72, 1.16, 1.52, 1.80 s)
// (IFR's five slices went back to the whole clip - owner, 2026-11-09: "restore IFR sfx to just play full sound instead of segment, maybe FIFO the
// sounds (up to 5 sounds instead of 3) alongside priority"; the slicing stays for any later clip)
const SFX_SLICES = {}, SLICE_FADE = [0.008, 0.06], sliceNext = {};
const sfxClips = (name, files) => (SFX_SLICES[name] && typeof files === "string" ? SFX_SLICES[name].map(([start, end]) => ({ file: files, start, end, fade: true })) : [].concat(files));
// VOLUME NORMALIZATION (owner, 2026-10-16: "add some kind of volume normalization"; 2026-11-07: "make sure all the sounds are similar"): each
// clip is measured once, decoded - the RMS of its MAIN HIT, its loudest NORM_WIN (150 ms) window - and scaled to NORM_TARGET, within
// NORM_CLAMP; at play a voice's gain is held so its PEAK out stays under NORM_PEAK (playSample - no single voice clips). 0.333 keeps the towers' attack
// median where the 50 ms rule had it (-20 dBFS out); the classes over it (gainFor) are the deliberate differences
const NORM_TARGET = 0.333, NORM_CLAMP = [0.25, 4], NORM_WIN = 0.15, NORM_PEAK = 0.9;
function samplePeak(buf, start, end) { const x = buf.getChannelData(0), sr = buf.sampleRate; let pk = 0; for (let i = Math.floor(start * sr), b = Math.min(x.length, Math.ceil(end * sr)); i < b; i++) { const v = Math.abs(x[i]); if (v > pk) pk = v; } return pk; }
function sampleNorm(buf, start, end) {
  const x = buf.getChannelData(0), sr = buf.sampleRate, a = Math.floor(start * sr), b = Math.min(x.length, Math.ceil(end * sr)), win = Math.max(1, Math.floor(sr * NORM_WIN));
  let loud = 0;
  for (let i = a; i < b; i += win >> 1) { let s = 0; const j = Math.min(b, i + win); for (let k = i; k < j; k++) s += x[k] * x[k]; loud = Math.max(loud, Math.sqrt(s / Math.max(1, j - i))); }
  return loud > 0 ? Math.max(NORM_CLAMP[0], Math.min(NORM_CLAMP[1], NORM_TARGET / loud)) : 1;
}
// Each TOWER's sound plays at most 3 copies at once (owner, 2026-10-02; IFR 5, oldest out first - SFX_FIFO),
// sample or synth alike: playing[name] counts live copies and a 4th is
// skipped. A sample copy is also quieter by how many are already sounding.
const SOUND_MAX = { arc: 3, frz: 3, sol: 3, acd: 3, grv: 3, grvaura: 3, crr: 3, carshot: 3, ifr: 5 /* the whole 3.6 s roar, FIFO (SFX_FIFO; owner, 2026-11-09) */, ifrblast: 3, solshot: 3, slam: 3 /* the boss bar's pieces slamming home (BLASTCAN, owner 2026-10-27: "use the rules for sound overlap cap") */ }, playing = {};
let curSound = null; // the synth sound being built, so envelope() can count it
// LOUDNESS (owner, 2026-10-02): the bosses' warnings and voices and every
// upgrade/build sound stand well above the towers' shots - about 10 dB
// (TOWER_GAIN 0.6 vs LOUD_GAIN 2)
const TOWER_GAIN = 0.6, LOUD_GAIN = 1; /* 2 -> 1 (owner, 2026-10-16: "some audio (like the boss intro sounds and the carrier sounds) sound much louder than others"): the voice lines and build / upgrade / boss cues sat 10-15 dB over the towers' shots (measured: -11..-15 vs -23 dB), now 4-8 */
const LOUD = /^(bosswarn|bossvoice|bossdeath|coreup|up|build|thud|click|error|win)/; /* (click, error, win, bossdeath: every one plays at any game speed - owner, 2026-11-09) */ // (thud: in the LOUD class for the game-speed exemption - every landing sounds)
// per-sound trims (owner): the ship explosion on every kill was too loud
// SOL x2 (owner, 2026-11-07: "play SOL sound effect much louder so it matches the others"): measured, ONE clip is already level - after the
// loudness normalization every tower attack's loudest 150 ms sits at -20 dBFS (SOL's shot -20.2, the others' median -20.0); what is quieter
// is the DENSITY: SOL fires one voice a tower every 1.58 s, the others stack up to SOUND_MAX copies (1 + 1/2 + 1/3 = 1.83x, +5 dB). x2 =
// +6 dB, its peak -11.7 -> -5.7 dBFS on one voice: no clipping, no limiter needed (a GainNode above 1 is fine)
const SOUND_GAIN = { kill: 0.4, sol: 2, solshot: 2 };
const gainFor = name => (LOUD.test(name) ? LOUD_GAIN : SOUND_MAX[name] ? TOWER_GAIN : 1) * (SOUND_GAIN[name] ?? SOUND_GAIN[name.split(".")[0]] ?? 1); // ("kill.fast" trimmed as "kill")
let sfxOpt = null; // { gain, rate } for the next playSample only (swarmKillSfx, arcChainSfx)
function playSample(name, at = 0, off = 0) { // off: s into the clip to start from (SOL's shot, solSfx)
  const list = SAMPLES[name], n = playing[name] || 0;
  const src = AC.createBufferSource(), g = AC.createGain(), clip = SFX_SLICES[name] && list[0].fade ? list[(sliceNext[name] = ((sliceNext[name] ?? -1) + 1) % list.length)] : list[Math.floor(Math.random() * list.length)];
  src.buffer = clip.buf;
  g.gain.value = Math.min(sfxScale * sampleGain * (clip.norm || 1) * gainFor(name), clip.pk > 0 ? NORM_PEAK / clip.pk : Infinity) / (SOUND_MAX[name] ? 1 + n : 1);
  if (sfxOpt) { g.gain.value *= sfxOpt.gain ?? 1; if (sfxOpt.rate) src.playbackRate.value = sfxOpt.rate; sfxOpt = null; }
  src.connect(g).connect(master);
  voices++; playing[name] = n + 1; const L = { name, nodes: [[src, g]], scene: sfxScene() }; sfxLive.add(L);
  src.onended = () => { sfxEnd(src); playing[name]--; sfxLive.delete(L); };
  const t0 = AC.currentTime + at, dur = Math.max(0.01, clip.end - clip.start - off);
  if (clip.fade) { const v = g.gain.value; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + SLICE_FADE[0]); g.gain.setValueAtTime(v, t0 + Math.max(SLICE_FADE[0], dur - SLICE_FADE[1])); g.gain.linearRampToValueAtTime(0, t0 + dur); }
  src.start(t0, clip.start + off, dur); src.__g = g;
  return src;
}
// samples played back to back (owner: the boss warning - a double beep, then
// the voice); missing ones are skipped, and a sequence never overlaps itself
const bossVoice = id => (SAMPLES["bossvoice." + id] && SAMPLES["bossvoice." + id].length ? "bossvoice." + id : "bossvoice");
function sfxSeq(names) {
  if (muted || !AC || AC.state !== "running") return;
  let at = 0;
  for (const name of names) {
    const list = SAMPLES[name];
    if (!list || !list.length) continue;
    playSample(name, at);
    at += list[0].end - list[0].start + 0.1;
  }
}

// a per-TOWER variant of a sound when one is mapped (owner: each tower's own
// build/upgrade sample, index.json keys like "build.reaper"), else the shared one
function sfxFor(name, kind) {
  const k = name + "." + kind;
  return SAMPLES[k] && SAMPLES[k].length ? sfx(k) : sfx(name);
}
// SOL's SHOT (owner, 2026-11-07: "use this sound for the SOL attacks, line up the shooting part with the beam, and the buildup to the charging";
// "if it loses the target stop the sound instead of playing the whole sound"): the "sol" sample's build-up plays while SOL charges its next pulse
// and its shot lands on the pulse - the clip starts SOL_SHOT_AT (its shot's onset, measured on PabCag00.wav) of real time before it, partway in
// when less is left (a new lock's SOL_AIM, a fast fire rate, a fast game). ONE voice a tower (solVoice): the next charge cuts the last one's
// tail; a lock lost or switched before its shot stops it at once over SOL_SHOT_FADE. Called from stepSolTrack (none in the simulator: no AC)
// THE YAMATO FIRES (owner, 2026-11-09: "replace SOL firing sound with TBaYam02.wav" / "keep the charge part of the previous effect, then fire the
// yamato"): the "sol" clip plays its build-up only - faded out over SOL_SHOT_FADE at its own shot - and "solshot" (TBaYam02) lands on the pulse;
// without a "solshot" sample the old whole clip plays. The charge line (aspira-effects.js) keeps spanning the build-up
const SOL_SHOT_AT = 0.62, SOL_SHOT_FADE = 0.025, solVoice = new WeakMap();
function solVoiceStop(t, v) {
  solVoice.delete(t); if (!v || !AC) return;
  const n = AC.currentTime;
  for (const src of [v.src, v.bang]) { if (!src) continue; const g = src.__g.gain;
    try { g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0, n + SOL_SHOT_FADE); src.stop(n + SOL_SHOT_FADE + 0.01); } catch (err) { /* already stopped */ } }
}
function solSfx(t, e, cd) { // each SOL step: e its lock (null: none), cd the game s to its next pulse
  if (!AC) return;
  const v = solVoice.get(t), now = AC.currentTime, pre = v && now < v.shot;
  if (v && pre && v.e !== e) { solVoiceStop(t, v); return; } // lost or switched before the shot: stop, never play out
  if (!e || (v && pre) || muted || AC.state !== "running" || !(SAMPLES.sol && SAMPLES.sol.length)) return;
  const real = Math.max(0, cd) / gameSpeedX();
  if (real > SOL_SHOT_AT || (v && now < v.shot + 0.05)) return; // not yet in reach of the shot / the last shot just landed
  if (v) solVoiceStop(t, v);
  if ((playing.sol || 0) >= SOUND_MAX.sol) return;
  sfxBump("sol", now); if (!sfxMakeRoom("sol", now)) return;
  const src = playSample("sol", 0, SOL_SHOT_AT - real), yam = SAMPLES.solshot && SAMPLES.solshot.length;
  let bang = null;
  if (yam) { const g = src.__g.gain, v0 = g.value, at = now + real; try { g.setValueAtTime(v0, Math.max(now, at - SOL_SHOT_FADE)); g.linearRampToValueAtTime(0, at); src.stop(at + 0.01); } catch (err) { /* (a stopped source) */ } bang = playSample("solshot", real); }
  solVoice.set(t, { src, bang, e, shot: now + real });
}
// how many times faster than 1x the game runs now (aspira-ui.js's speed; 1 in the simulator)
const soundCredit = {};
const gameSpeedX = () => (typeof ui !== "undefined" && typeof SPEED_MULT !== "undefined" && typeof speedX === "function" ? speedX() : 1);
function sfx(name, ...args) {
  const sample = SAMPLES[name] && SAMPLES[name].length;
  if (muted || !AC || AC.state !== "running" || !(SFX[name] || sample)) return null;
  const now = AC.currentTime; sfxBump(name, now);
  if (now - (lastAt[name] ?? -1) < (GAP[name] ?? GAP[name.split(".")[0]] ?? 0.03)) return null;
  if (SOUND_MAX[name] && (playing[name] || 0) >= SOUND_MAX[name] && !SFX_FIFO[name]) return null;
  // sounds keep their 1x DENSITY whatever the game speed (owner): at k x only
  // about 1 in k triggers of a name plays; loud cues (bosses, upgrades) always do
  if (!LOUD.test(name)) {
    const k = gameSpeedX();
    if (k > 1) { soundCredit[name] = (soundCredit[name] || 0) + 1 / k; if (soundCredit[name] < 1) return null; soundCredit[name] -= 1; }
  }
  if (!sfxMakeRoom(name, now)) { sfxStat.skipped[name] = (sfxStat.skipped[name] || 0) + 1; return null; }
  if (SFX_FIFO[name] && (playing[name] || 0) >= SOUND_MAX[name]) sfxFifoCut(name, now); // the OLDEST copy makes way (after the rare-first check: a cut copy frees no voice for a rarer sound)
  lastAt[name] = now; sfxStat.played[name] = (sfxStat.played[name] || 0) + 1;
  if (sample) return playSample(name);
  const inst = { name, nodes: 0, live: { name, nodes: [], scene: sfxScene() } }; sfxLive.add(inst.live);
  curSound = inst;
  let h;
  try { h = SFX[name](...args); } finally { curSound = null; }
  if (inst.nodes) playing[name] = (playing[name] || 0) + 1; else sfxLive.delete(inst.live);
  return h || null;
}
// SWARM DEATHS BY SIZE (owner, 2026-11-09: "Swarm death sound should change in pitch and loudness depending on swarm unit size (use biggest if
// multiple die at the same time)"): the deaths of one game step make ONE sound, set by the biggest swarmer (e.drawJit, its drawn size): bigger is
// louder and lower - gain x size^0.5, pitch x size^-0.35, each clamped. Through sfx, so the rarity rule and the game-speed thinning stay
let swarmKillMax = 0;
function swarmKillSfx(e) {
  if (typeof AC === "undefined" || !AC) return;
  const was = swarmKillMax; swarmKillMax = Math.max(swarmKillMax, e.drawJit || 1); if (was) return;
  Promise.resolve().then(() => { const k = swarmKillMax; swarmKillMax = 0; sfxOpt = { gain: Math.min(1.8, Math.max(0.55, k ** 0.5)), rate: Math.min(1.35, Math.max(0.7, k ** -0.35)) }; if (!sfxFor("kill", "swarm")) sfxOpt = null; });
}
// ARC's CHAIN SOUNDS (owner, 2026-11-09: "for arc, chains should also play the attack sound, but relative to amount of damage carried over (cap
// vol 80% of initial beam). One sound per chain level, not one per enemy struck!"): each hop DEPTH of a strike plays the ARC sample once, at the
// strike's volume x its share of the strike's damage (arcFall^depth), at most ARC_CHAIN_VOL; a step ARC_CHAIN_GAP s after the level before
const ARC_CHAIN_VOL = 0.8, ARC_CHAIN_GAP = 0.05;
function arcChainSfx(share, depth) {
  if (muted || !AC || AC.state !== "running" || !(SAMPLES.arc && SAMPLES.arc.length) || (playing.arc || 0) >= 2 * SOUND_MAX.arc) return;
  const now = AC.currentTime; sfxBump("arc", now); if (!sfxMakeRoom("arc", now)) return;
  sfxOpt = { gain: Math.min(ARC_CHAIN_VOL, share) }; playSample("arc", depth * ARC_CHAIN_GAP);
}
// EVERY CLICK (owner, 2026-11-09: "clicking things should play the BUTTON.WAV sound"): a button, a card or a checkbox anywhere in the game -
// but not a BUILD card (owner, 2026-11-13: "remove button sound when building towers, tower building already has a sound"): a card in the
// build chooser (.asp-building) plays the tower's build sound (placeTower), or the error sound when it costs too much (noFunds)
if (typeof document !== "undefined") document.addEventListener("click", ev => { const b = ev.target && ev.target.closest && ev.target.closest("button, .asp-card, [role=checkbox]"); if (b && b.closest("#asp") && !b.closest(".asp-building .asp-card")) sfx("click"); }, true);
