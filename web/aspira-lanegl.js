// /aspira - THE LIT LANES ON THE GPU, in 3D (perf, 2026-10-31 - Wai: "Fix the lag!!"; a 7.0.23 iPhone log: 72 frames over 50 ms in 170 s,
// nearly all the lane fade layer's upload, 44 ms on average, and the board's, 26 ms, each time a lane lit or went out). A lane's SHAPE never
// changes - only its brightness, colour and turn (u.ang) - and both its masks are rings round the core, which a turn leaves alone. So each
// of the twelve paths' DISTANCE FIELDS (world units to its line, lit2d's points, and to its glow, glow2d's) is built ONCE, on the CPU, a path
// a frame, into one atlas texture (12 MB), never sent again; the bell's shader (WARP_FS, aspira-warp.js) turns each lit lane's pixel back by its
// angle, reads the distance and lays the same profiles strokeSoft strokes (aspira-lanes.js): each level of a group (one colour, kind and
// brightness) a union of its lanes - the nearest lane's distance - at the level's alpha, the glow under the line, both masked as laneMask
// and laneCoreFade mask them. Every frame, from litLanes(): a lane lights the frame its wave is sent and goes out the frame its last
// enemy dies, and fades in smoothly - no board redraw, no fade layer, no upload. The 2D view keeps the 2D lanes. LANE_GL false: the old way
let LANE_GL = true;
const LGL_T = 512, LGL_RT = R0 + 6, LGL_DMAX = 76, LGL_LMAX = 26 /* 66 / 16 until LANE_PLAIN_W 4 (2026-11-07): a non-boss glow's half width 72, its line's 24 */, LGL_N = 16; // T: a path's tile, texels a side, over +-RT world units round the core; DMAX: the glow's farthest distance kept (a boss glow's half width + AA), LMAX the line's (a boss line's); N: lanes a frame
// A TILE A PATH, 4 x 3 in the atlas: R the line's SIGNED distance (+-LMAX: which side of its nearest segment), G its plain distance (0..LMAX), B the glow's
// (0..DMAX). A plain distance read between texels is too far by up to half a texel at the line itself (its V does not interpolate) - the line came out
// beaded (WebKit, 2026-10-31); the signed one interpolates straight through 0 there, but jumps where two turns of the spiral are as near - so the line's
// distance is the larger of |signed| and plain less 0.75 texel: the signed one at the line, the plain one between turns
const lgl = { tex: null, gl: null, built: 0, ready: false, buf: null };
// the profiles as GLSL: each level's alpha onto the layer (premultiplied), its coverage from the distance - one board pixel of antialiasing
const lglLevels = (prof, wk, aSrc, d, dst) => prof.map(([w, la]) => `{ float a = min(1.0, ${aSrc} * ${la.toFixed(4)}) * clamp((${(w / 2).toFixed(4)} * ${wk} - ${d}) * laneK + 0.5, 0.0, 1.0); ${dst} = ${dst} * (1.0 - a) + vec4(col, 1.0) * a; }`).join("\n    ");
const AUR_GLOW = 2.2, AUR_WIDE = 0.8, AUR_CURTAIN = 0.35; // the aurora: its glow's alpha x, its distance x (under 1: wider)
const LANE_GLSL = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define LHP highp
#else
#define LHP mediump
#endif
uniform LHP vec4 laneA[${LGL_N}]; uniform vec4 laneB[${LGL_N}], laneC[${LGL_N}]; uniform float laneN, laneK; uniform LHP float laneTime; uniform LHP vec2 laneSh; uniform sampler2D laneT;
varying LHP vec2 lw;
vec4 laneG, laneL;
void laneFlush(float dG, float dL, vec4 b, vec4 c, LHP vec2 p) { // one group: b = colour + group, c = glow alpha, line alpha, boss; p: the pixel (world, round the core)
  vec3 col = b.rgb;
  if (c.z < 0.5 && (dL < ${(LGL_LMAX - 1).toFixed(1)} || dG < ${(LGL_DMAX - 1).toFixed(1)})) { // AN AURORA (its maths only near a lit lane) (owner, 2026-11-06: "how hard would it be to just visually make the non boss lanes look like auroras?" - "1", on the floor):
    // shimmer bands drifting along the spiral (radius + angle), the glow's edge waving (its distance offset by slow waves), a gentle pulse, a faint
    // ray texture across - all smooth, in the lane's own colour (lightness only, a touch toward white at the bright bands; no hue shift)
    LHP float ang = atan(p.y, p.x), rr = length(p), t = laneTime;
    float sh = 0.5 + 0.5 * sin(rr * 0.045 - t * 0.7 + 1.7 * sin(ang * 2.0 + t * 0.25));
    float wob = 6.0 * sin(rr * 0.031 + t * 0.9 + ang * 3.0) + 3.0 * sin(rr * 0.077 - t * 1.3 + ang);
    float ray = 0.9 + 0.1 * sin(ang * 90.0 + rr * 0.02 + t * 0.4);
    col = mix(col * (0.78 + 0.44 * sh), vec3(1.0), 0.12 * sh);
    dG = max(0.0, dG * ${AUR_WIDE.toFixed(2)} + wob * (0.4 + 0.6 * sh)); // (the curtain a little wider: its distance x AUR_WIDE)
    c.x = min(1.0, c.x * ${AUR_GLOW.toFixed(2)} * (0.85 + 0.15 * sin(t * 1.1 + b.w * 1.7)) * (0.6 + 0.8 * sh) * ray); c.y *= 0.75 + 0.35 * sh; // (the glow brighter than a plain lit lane's: AUR_GLOW)
  }
  if (c.z > 0.5) {
    ${lglLevels(LIT_GLOW_SOFT, BOSS_LANE_W.toFixed(4), "c.x", "dG", "laneG")}
    ${lglLevels(BOSS_LINE_SOFT, "1.0", "c.y", "dL", "laneL")}
  } else {
    ${lglLevels(LIT_GLOW_SOFT, LANE_PLAIN_W.toFixed(4), "c.x", "dG", "laneG")}
    ${lglLevels(LIT_LINE_SOFT, LANE_PLAIN_W.toFixed(4), "c.y", "dL", "laneL")} /* x LANE_PLAIN_W (4 since 2026-11-07): the glow's 72 u half width inside LGL_DMAX, the line's 24 inside LGL_LMAX */
    if (dL < ${(LGL_LMAX - 1).toFixed(1)}) { // THE CURTAIN along the whole lane: the line's own distance field (LGL_LMAX u either side), a smooth (1 - d)^2 fade across, waving and
      // shimmering like the glow above - on the line's layer, which runs the lane's length (the glow's is masked to the core's surround)
      LHP float ang = atan(p.y, p.x), rr = length(p), t = laneTime;
      float sh = 0.5 + 0.5 * sin(rr * 0.045 - t * 0.7 + 1.7 * sin(ang * 2.0 + t * 0.25)), wob = 3.0 * sin(rr * 0.031 + t * 0.9 + ang * 3.0);
      float a = c.y * ${AUR_CURTAIN.toFixed(2)} * (0.35 + 0.9 * sh) * pow(max(0.0, 1.0 - max(0.0, dL + wob) / ${(LGL_LMAX - 2).toFixed(1)}), 2.0);
      laneL = laneL * (1.0 - a) + vec4(col, 1.0) * a;
    }
  }
}
void lanes() { // laneG, laneL: the lit lanes' glow and line, premultiplied, masked
  laneG = vec4(0.0); laneL = vec4(0.0);
  if (laneN < 0.5) return;
  LHP vec2 p = lw + laneSh; float r = length(p);
  if (r > ${R0.toFixed(1)}) return; // (both masks are nothing past R0)
  float dG = 1e3, dL = 1e3, grp = -1.0; vec4 b = vec4(0.0), c = vec4(0.0);
  for (int i = 0; i < ${LGL_N}; i++) {
    if (float(i) >= laneN) break;
    if (laneB[i].w != grp) { if (grp >= 0.0) laneFlush(dG, dL, b, c, p); grp = laneB[i].w; dG = 1e3; dL = 1e3; b = laneB[i]; c = laneC[i]; }
    LHP vec4 A = laneA[i]; LHP vec2 q = vec2(A.x * p.x + A.y * p.y, A.x * p.y - A.y * p.x); // turned back by the lane's angle
    LHP vec2 t = clamp(q / ${(2 * LGL_RT).toFixed(1)} + 0.5, ${(0.5 / LGL_T).toFixed(6)}, ${(1 - 0.5 / LGL_T).toFixed(6)});
    vec4 s = texture2D(laneT, A.zw + t * vec2(0.25, ${(1 / 3).toFixed(6)}));
    dL = min(dL, max(abs(s.r * 2.0 - 1.0) * ${LGL_LMAX.toFixed(1)}, s.g * ${LGL_LMAX.toFixed(1)} - ${(0.75 * 2 * LGL_RT / LGL_T).toFixed(4)})); dG = min(dG, s.b * ${LGL_DMAX.toFixed(1)});
  }
  if (grp >= 0.0) laneFlush(dG, dL, b, c, p);
  float gm = pow(max(0.0, 1.0 - r / ${GLOW_FADE_R.toFixed(1)}), ${GLOW_FALLOFF.toFixed(1)}), ce = ${(LANE_END_IN * CORE_R).toFixed(3)}, co = ${(LANE_END_OUT * CORE_R).toFixed(3)};
  gm *= clamp((r - ce) / (co - ce), 0.0, 1.0); // laneCoreFade: gone inside LANE_END_IN core radii, whole from LANE_END_OUT
  laneG *= gm; laneL *= clamp((${R0.toFixed(1)} - r) / ${(R0 * (1 - LANE_FULL)).toFixed(3)}, 0.0, 1.0); // the line's mask: full to LANE_FULL of R0, nothing at R0
}`;
// a path's three fields on a T x T grid over +-RT round the core, world units: [line signed, line, glow]
function lglFields(path) {
  const T = LGL_T, tx = 2 * LGL_RT / T, D = LGL_DMAX, pts = path.pts, ls = new Float32Array(T * T).fill(LGL_LMAX), line = new Float32Array(T * T).fill(D), glow = new Float32Array(T * T).fill(D);
  const seg = (f, sg, ax, ay, bx, by) => {
    const ex = bx - ax, ey = by - ay, ll = ex * ex + ey * ey, R = sg ? LGL_LMAX + tx : D;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R + LGL_RT) / tx)), i1 = Math.min(T - 1, Math.ceil((Math.max(ax, bx) + R + LGL_RT) / tx));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - R + LGL_RT) / tx)), j1 = Math.min(T - 1, Math.ceil((Math.max(ay, by) + R + LGL_RT) / tx));
    for (let j = j0; j <= j1; j++) {
      const y = -LGL_RT + (j + 0.5) * tx;
      for (let i = i0; i <= i1; i++) {
        const x = -LGL_RT + (i + 0.5) * tx, h = ll ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / ll)) : 0, dx = x - ax - ex * h, dy = y - ay - ey * h, d = Math.sqrt(dx * dx + dy * dy), k = j * T + i;
        if (d < f[k]) { f[k] = d; if (sg) sg[k] = ex * dy - ey * dx < 0 ? -d : d; } // (the side of its nearest segment)
      }
    }
  };
  const off = p => [p.x - CX, p.y - CY];
  // the line: lit2d's points (every other one, and the last), on into the core
  const lp = pts.filter((p, k) => k === 0 || k % 2 === 0 || k === pts.length - 1).map(off); lp.push([0, 0]);
  for (let k = 1; k < lp.length; k++) seg(line, ls, lp[k - 1][0], lp[k - 1][1], lp[k][0], lp[k][1]);
  // the glow: glow2d's runs of points inside GLOW_PATH_R, the last on into the core
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k];
    if (Math.hypot(a.x - CX, a.y - CY) <= GLOW_PATH_R && Math.hypot(b.x - CX, b.y - CY) <= GLOW_PATH_R) seg(glow, null, a.x - CX, a.y - CY, b.x - CX, b.y - CY);
  }
  const e = pts[pts.length - 1]; seg(glow, null, e.x - CX, e.y - CY, 0, 0);
  return [ls, line, glow];
}
// one path a frame (a frame's worth of work, not a stall at the first), its tile sent as it is built; ready when all twelve are
function lglBuild(gl) {
  if (lgl.gl !== gl) { lgl.gl = gl; lgl.tex = null; lgl.built = 0; lgl.ready = false; }
  if (!lgl.tex) {
    lgl.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, lgl.tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4 * LGL_T, 3 * LGL_T, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  } else gl.bindTexture(gl.TEXTURE_2D, lgl.tex);
  if (lgl.ready || lgl.built >= N_PATHS) return;
  const i = lgl.built++, T = LGL_T, [ls, l, g] = lglFields(PATHS[i]), buf = lgl.buf ||= new Uint8Array(T * T * 4), L = LGL_LMAX, q = 255 / LGL_DMAX;
  for (let k = 0; k < T * T; k++) { buf[4 * k] = Math.round((ls[k] / L * 0.5 + 0.5) * 255); buf[4 * k + 1] = Math.round(Math.min(1, l[k] / L) * 255); buf[4 * k + 2] = Math.round(g[k] * q); buf[4 * k + 3] = 255; }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); // (data, not a picture)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, (i % 4) * T, Math.floor(i / 4) * T, T, T, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
  if (lgl.built >= N_PATHS) { lgl.ready = true; lgl.buf = null; }
}
// THE LANES UNDER THE INK (WARP_FS): the board is its flat bg fill plus ink, so a pixel's ink is how far it is from bg - x LANE_INK_K, so a
// difference of 1/LANE_INK_K (labels, rim circles) covers the lanes in full and the faint grid lets them through
const LANE_INK_K = 3;
const laneGlOn = () => LANE_GL && lgl.ready && typeof warp !== "undefined" && warp.inFrame === true && !(typeof DIAG === "string" && DIAG.includes("nolanegl")); // in a 3D frame only (warp3d: the 2D view keeps the 2D lanes); diag nolanegl: the 2D lanes, to compare
// texture unit 4 and the lit lanes' uniforms, every frame (warpDraw): groups in the order strokeSoft lays them (plain lanes' then boss lanes'), each group's lanes together
const lglA = new Float32Array(4 * LGL_N), lglB = new Float32Array(4 * LGL_N), lglC = new Float32Array(4 * LGL_N);
function laneGlBind(gl, u) {
  gl.activeTexture(gl.TEXTURE4); lglBuild(gl); gl.uniform1i(u("laneT"), 4);
  let n = 0;
  if (laneGlOn()) {
    const groups = new Map();
    for (const v of litLanes()) { if (!(v.a > 0)) continue; const g = v.color + ":" + (v.star ? 1 : 0) + ":" + laneLitK(v) + ":" + v.a.toFixed(3); (groups.get(g) || groups.set(g, []).get(g)).push(v); }
    const order = [...groups.values()].sort((a, b) => (a[0].star ? 1 : 0) - (b[0].star ? 1 : 0));
    let gi = 0;
    for (const us of order) {
      const v = us[0], rgb = warpGridRgb(v.color), ga = Math.min(1, (v.star ? 0.22 * BOSS_LANE_K : LIT_GLOW_A) * v.a) * laneLitK(v), la = (v.star ? BOSS_LANE_K * v.a : v.a) * laneLitK(v); /* laneLitK: a non-boss lane at LANE_PLAIN_K (aspira-lanes.js) */
      for (const w of us) {
        if (n >= LGL_N) break;
        lglA.set([Math.cos(w.ang), Math.sin(w.ang), (w.pi % 4) / 4, Math.floor(w.pi / 4) / 3], 4 * n); lglB.set([rgb[0], rgb[1], rgb[2], gi], 4 * n); lglC.set([ga, la, v.star ? 1 : 0, 0], 4 * n); n++;
      }
      gi++;
    }
    if (n) { gl.uniform4fv(u("laneA"), lglA); gl.uniform4fv(u("laneB"), lglB); gl.uniform4fv(u("laneC"), lglC); }
    const tc = warp.texCam || cam, [shx, shy] = warp.shake || [0, 0];
    gl.uniform1f(u("laneTime"), (performance.now() / 1000) % 1000); gl.uniform1f(u("laneK"), tc.k); gl.uniform2f(u("laneSh"), shx / tc.k, shy / tc.k); // (the board's px per world unit: one of them of antialiasing; the shake, as the board's)
  }
  gl.uniform1f(u("laneN"), n);
}
