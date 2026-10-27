// /aspira — sound effects, all synthesised with WebAudio (no audio files).
// The context is created on the first tap/key (browsers refuse audio before a
// gesture). Each sound has a minimum gap so a wall of rapid-fire towers is a
// texture, not a roar, and there is a hard cap on live voices.

let AC = null, master = null, outGain = null, noiseBuf = null, voices = 0, muted = false;
// volume slider (owner, 2026-10-02): 0..2, applied AFTER the limiter so it
// really scales what you hear; the default 1 is twice the old loudness
let volume = 1;
const VOL_BOOST = 2;
try {
  muted = localStorage.getItem("aspira.mute") === "1";
  const v = parseFloat(localStorage.getItem("aspira.vol"));
  if (v >= 0 && v <= 2) volume = v;
} catch (_e) {}
const lastAt = {};
const MAX_VOICES = 24;

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
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); // 8ms fade-in: no start click
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g).connect(master);
  voices++;
  // a synth sound is several nodes: it counts as one copy until its last ends
  const inst = curSound;
  if (inst) inst.nodes++;
  node.onended = () => { voices--; if (inst && --inst.nodes === 0) playing[inst.name]--; };
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
  car:     () => { tone({ type: "triangle", f0: 500, f1: 1400, dur: 0.09, vol: 0.05 }); },
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
const GAP = { arc: 0.07, kill: 0.04, frz: 0.1, leak: 0.5, carshot: 0.08, thud: 0.015 }; // (thud: the bar's pieces land 30 ms apart - the default 0.03 ate every other)

// returns whatever the sound returns (a stop() handle for long sounds), or null
// Optional SAMPLES (owner, 2026-10-02: Brood War sounds) replace a synth
// sound when present. They live in this repo's data/aspira-sfx/ - never committed
// (data/ is gitignored; the repo is public) and served to the page's own
// guest tier through /aspira-sfx/ - listed in its index.json as { "<sound name>": "file" | ["file", ...],
// "_gain": 0.5 } (several files = one picked at random each time). Missing
// folder, index or file: that sound stays synthesised.
const SAMPLE_DIR = "/aspira-sfx/", SAMPLES = {}; // guest-tier route (routes_aspira.py)
let sampleMap = null, sampleGain = 0.5;
// a sample index.json written before the 2026-10-06 id rename names sounds by the OLD ids
// (chain / slower / reaper / acid, build.reaper, powerfortify ...): read them as the new ones
const LEGACY_SFX = {"chain": "arc", "slower": "frz", "reaper": "sol", "acid": "acd", "powerfortify": "powerrelay", "powerempower": "powerrelay", "powerovercharge": "powerrelay", "powertime": "powertemporal"};
const sfxKey = k => k.split(".").map(p => LEGACY_SFX[p] || p).join(".");
const migrateSfx = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [sfxKey(k), v]));
fetch(SAMPLE_DIR + "index.json").then(r => (r.ok ? r.json() : null)).then(m => {
  if (!m) return;
  sampleMap = migrateSfx(m);
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
    for (const f of [].concat(files)) {
      const clip = typeof f === "string" ? { file: f } : f;
      fetch(SAMPLE_DIR + clip.file).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(clip.file))))
        .then(b => AC.decodeAudioData(b)).then(buf => { const start = clip.start || 0, end = clip.end || buf.duration; SAMPLES[name].push({ buf, start, end, norm: sampleNorm(buf, start, end) }); })
        .catch(() => {});
    }
  }
}
// VOLUME NORMALIZATION (owner, 2026-10-16: "add some kind of volume normalization"): each clip is measured once, decoded - its
// LOUDEST 50ms window's RMS - and scaled to NORM_TARGET, within NORM_CLAMP (a near-silent clip is not blown up). The Brood War
// set spans 0.20 (BUZZ) .. 0.50 (PPwrDown), about 8 dB; 0.37 is its median, so the mix as a whole stays where it was
const NORM_TARGET = 0.37, NORM_CLAMP = [0.5, 2], NORM_WIN = 0.05;
function sampleNorm(buf, start, end) {
  const x = buf.getChannelData(0), sr = buf.sampleRate, a = Math.floor(start * sr), b = Math.min(x.length, Math.ceil(end * sr)), win = Math.max(1, Math.floor(sr * NORM_WIN));
  let loud = 0;
  for (let i = a; i < b; i += win >> 1) { let s = 0; const j = Math.min(b, i + win); for (let k = i; k < j; k++) s += x[k] * x[k]; loud = Math.max(loud, Math.sqrt(s / Math.max(1, j - i))); }
  return loud > 0 ? Math.max(NORM_CLAMP[0], Math.min(NORM_CLAMP[1], NORM_TARGET / loud)) : 1;
}
// Each TOWER's sound plays at most 3 copies at once (owner, 2026-10-02),
// sample or synth alike: playing[name] counts live copies and a 4th is
// skipped. A sample copy is also quieter by how many are already sounding.
const SOUND_MAX = { arc: 3, frz: 3, sol: 3, acd: 3, grv: 3, grvaura: 3, car: 3, carshot: 3, ifr: 3, ifrblast: 3 }, playing = {};
let curSound = null; // the synth sound being built, so envelope() can count it
// LOUDNESS (owner, 2026-10-02): the bosses' warnings and voices and every
// upgrade/build sound stand well above the towers' shots - about 10 dB
// (TOWER_GAIN 0.6 vs LOUD_GAIN 2)
const TOWER_GAIN = 0.6, LOUD_GAIN = 1; /* 2 -> 1 (owner, 2026-10-16: "some audio (like the boss intro sounds and the carrier sounds) sound much louder than others"): the voice lines and build / upgrade / boss cues sat 10-15 dB over the towers' shots (measured: -11..-15 vs -23 dB), now 4-8 */
const LOUD = /^(bosswarn|bossvoice|coreup|up|build|thud)/; // (thud: in the LOUD class for the game-speed exemption - every landing sounds)
// per-sound trims (owner): the ship explosion on every kill was too loud
const SOUND_GAIN = { kill: 0.4 };
const gainFor = name => (LOUD.test(name) ? LOUD_GAIN : SOUND_MAX[name] ? TOWER_GAIN : 1) * (SOUND_GAIN[name] ?? SOUND_GAIN[name.split(".")[0]] ?? 1); // ("kill.fast" trimmed as "kill")
function playSample(name, at = 0) {
  const list = SAMPLES[name], n = playing[name] || 0;
  const src = AC.createBufferSource(), g = AC.createGain(), clip = list[Math.floor(Math.random() * list.length)];
  src.buffer = clip.buf;
  g.gain.value = sampleGain * (clip.norm || 1) * gainFor(name) / (SOUND_MAX[name] ? 1 + n : 1);
  src.connect(g).connect(master);
  voices++; playing[name] = n + 1;
  src.onended = () => { voices--; playing[name]--; };
  src.start(AC.currentTime + at, clip.start, clip.end - clip.start);
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
// how many times faster than 1x the game runs now (aspira-ui.js's speed; 1 in the simulator)
const soundCredit = {};
const gameSpeedX = () => (typeof ui !== "undefined" && typeof SPEED_MULT !== "undefined" && typeof speedX === "function" ? speedX() : 1);
function sfx(name, ...args) {
  const sample = SAMPLES[name] && SAMPLES[name].length;
  if (muted || !AC || AC.state !== "running" || voices > MAX_VOICES || !(SFX[name] || sample)) return null;
  const now = AC.currentTime;
  if (now - (lastAt[name] ?? -1) < (GAP[name] ?? GAP[name.split(".")[0]] ?? 0.03)) return null;
  if (SOUND_MAX[name] && (playing[name] || 0) >= SOUND_MAX[name]) return null;
  // sounds keep their 1x DENSITY whatever the game speed (owner): at k x only
  // about 1 in k triggers of a name plays; loud cues (bosses, upgrades) always do
  if (!LOUD.test(name)) {
    const k = gameSpeedX();
    if (k > 1) { soundCredit[name] = (soundCredit[name] || 0) + 1 / k; if (soundCredit[name] < 1) return null; soundCredit[name] -= 1; }
  }
  lastAt[name] = now;
  if (sample) return playSample(name);
  const inst = { name, nodes: 0 };
  curSound = inst;
  let h;
  try { h = SFX[name](...args); } finally { curSound = null; }
  if (inst.nodes) playing[name] = (playing[name] || 0) + 1;
  return h || null;
}
