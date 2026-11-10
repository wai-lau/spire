// /spire - THE BACKGROUND STARS ON THE GPU (the GPU program, owner 2026-11-09: "yes, put as much stuff on the GPU if it can improve
// performance"). In 3D the ~1100 stars were drawStars' 2D work every frame: ~440 arcs into STAR_LEVELS paths, ~44 fills (a wave-110
// board's 2D ops, 2026-11-09: 882 of 7,255 a frame). Here they are ONE instanced draw of screen-space discs on the bell's own canvas,
// right after the bell's triangles - before the boss sky's flip (warpFlip) and before the entity layer, so they sit where they sat: over
// the board, under everything the entity canvas draws. ROUND ON SCREEN, never stretched with the floor (owner, 2026-10-09: "stars in bg
// should not get distorted"): each is a disc of its own radius in canvas px at its projected spot (warpStar), sized by the perspective
// there. Same twinkle, same STAR_LEVELS alpha steps, same white fading into Ember (starRed) as drawStars, which the 2D view still uses
// (glStarsOn false: no WebGL, no instancing, or the 2D view). Loaded after aspira-warp.js.
const glStars = { prog: null, buf: null, inst: new Float32Array(4 * 2048), loc: null, broken: false, n: 0 };
const GLSTARS_VS = `
attribute vec2 corner; attribute vec4 st; /* st: centre (px, y down), radius (px), alpha */
uniform vec2 S; varying vec2 loc; varying float rad, al;
void main() {
  float ext = st.z + 1.0; loc = corner * ext; rad = st.z; al = st.w;
  vec2 p = st.xy + loc;
  gl_Position = vec4(p.x / S.x * 2.0 - 1.0, 1.0 - p.y / S.y * 2.0, 0.0, 1.0);
}`;
const GLSTARS_FS = `
precision mediump float;
varying vec2 loc; varying float rad, al; uniform vec3 white, glow; uniform float red;
void main() {
  float cov = clamp(rad - length(loc) + 0.5, 0.0, 1.0); /* a canvas arc's edge: a pixel of coverage */
  float a1 = al * (1.0 - red) * cov, a2 = al * red * cov; /* drawStars: white at a x (1 - red), then Ember at a x red over it */
  vec3 c = glow * a2 + white * a1 * (1.0 - a2); float a = a2 + a1 * (1.0 - a2);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(c, a);
}`;
const glStarsOn = () => !glStars.broken && typeof warp !== "undefined" && !!warp.gl && warp.inFrame === true && typeof q3d === "function" && q3d();
function glStarsInit(gl) {
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const ext = gl.getExtension("ANGLE_instanced_arrays"), pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, GLSTARS_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GLSTARS_FS)); gl.linkProgram(pr);
  if (!ext || !gl.getProgramParameter(pr, gl.LINK_STATUS)) { glStars.broken = true; return false; } // (the 2D stars: drawStars)
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  Object.assign(glStars, { gl, ext, prog: pr, quad, buf: gl.createBuffer(), loc: { corner: gl.getAttribLocation(pr, "corner"), st: gl.getAttribLocation(pr, "st"), S: gl.getUniformLocation(pr, "S"), white: gl.getUniformLocation(pr, "white"), glow: gl.getUniformLocation(pr, "glow"), red: gl.getUniformLocation(pr, "red") } });
  return true;
}
// warpDraw, after the bell's triangles: gather this frame's stars exactly as drawStars places and twinkles them, then one draw
function glStarsDraw(gl, W, H) {
  if (glStars.broken || (glStars.gl !== gl && !glStarsInit(gl))) return;
  const now = performance.now() / 1000; let D = glStars.inst, n = 0;
  STARS.forEach((st, i) => {
    const P = warpStar(st.x, st.y, i);
    if (!(P.k > 0) || P.x < -4 || P.y < -4 || P.x > W + 4 || P.y > H + 4) return;
    const rate = 0.6 + ((i * 0.618) % 1) * 1.8, ph = (i * 2.399) % 6.283, tw = 0.5 + 0.5 * Math.sin(now * rate + ph), a = Math.min(1, 0.25 + st.m * 0.3) * (0.35 + 0.65 * tw);
    if ((n + 1) * 4 > D.length) { const g = new Float32Array(D.length * 2); g.set(D); D = glStars.inst = g; }
    D[n * 4] = P.x; D[n * 4 + 1] = P.y; D[n * 4 + 2] = st.m * (0.85 + 0.15 * tw) * P.k; D[n * 4 + 3] = Math.round(a * STAR_LEVELS) / STAR_LEVELS; n++;
  });
  glStars.n = n; if (!n) return;
  const { ext, loc } = glStars, w = typeof fxGlRgb === "function" ? fxGlRgb(COL.white) : [1, 1, 1], gw = typeof fxGlRgb === "function" ? fxGlRgb(COL.glow) : [1, 0.3, 0.2];
  gl.useProgram(glStars.prog); gl.uniform2f(loc.S, W, H); gl.uniform3f(loc.white, w[0], w[1], w[2]); gl.uniform3f(loc.glow, gw[0], gw[1], gw[2]); gl.uniform1f(loc.red, starRed());
  gl.bindBuffer(gl.ARRAY_BUFFER, glStars.quad); gl.enableVertexAttribArray(loc.corner); gl.vertexAttribPointer(loc.corner, 2, gl.FLOAT, false, 0, 0); ext.vertexAttribDivisorANGLE(loc.corner, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, glStars.buf); gl.bufferData(gl.ARRAY_BUFFER, D.subarray(0, n * 4), gl.STREAM_DRAW);
  gl.enableVertexAttribArray(loc.st); gl.vertexAttribPointer(loc.st, 4, gl.FLOAT, false, 0, 0); ext.vertexAttribDivisorANGLE(loc.st, 1);
  ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, n);
  ext.vertexAttribDivisorANGLE(loc.st, 0); gl.disableVertexAttribArray(loc.st); gl.disableVertexAttribArray(loc.corner); // (the bell's program reuses attribute slots)
}
