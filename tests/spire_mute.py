# TESTS ARE MUTED (owner, 2026-11-18: "mute any tests by default"): the spire browser tests launch their own WebKit (no --mute-audio there),
# so each context adds this before the game's scripts - every AudioContext plays through a zero gain, media starts muted. Same as exec-fn conftest.MUTE_JS
MUTE_JS = r"""(() => { /* tests are MUTED (owner, 2026-11-18: "mute any tests by default"): every AudioContext plays through a zero gain, media starts muted */
  const A = window.AudioContext || window.webkitAudioContext; if (A) { class M extends A { constructor(...a) { super(...a); const g = A.prototype.createGain.call(this); g.gain.value = 0; g.connect(Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "destination").get.call(this)); Object.defineProperty(this, "destination", { get: () => g }); } }
    window.AudioContext = M; if (window.webkitAudioContext) window.webkitAudioContext = M; }
  const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function (...a) { this.muted = true; return play.apply(this, a); };
})();"""
