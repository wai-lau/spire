// /spire GPU BENCH (2026-10-16): the owner's Radeon laptop sat at ~55 ms a frame with the GPU process saturated and ~3 ms of
// our JS. Each case below builds the layer stack of the 3D view in a different way and times the real frame interval
// (requestAnimationFrame to requestAnimationFrame) for 3 s: the one that jumps is the culprit. Sizes follow the window at the
// device pixel ratio capped at 2, like the game's canvases.
const out = document.getElementById("out"), hzEl = document.getElementById("hz"), stage = document.getElementById("stage");
const dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.round(stage.clientWidth * dpr), H = Math.round(stage.clientHeight * dpr);
const W2 = Math.round(W * 0.75), H2 = Math.round(H * 0.75);
const log = s => { out.textContent += s + "\n"; };
const canvas = (w, h, id) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%"; if (id) c.id = id; stage.appendChild(c); return c; };
function glOf(c, attrs) {
  const gl = c.getContext("webgl", attrs); if (!gl) return null;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 a; varying vec2 uv; void main(){ uv=a*0.5+0.5; gl_Position=vec4(a,0.,1.); }"));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, "precision mediump float; varying vec2 uv; uniform float t; void main(){ gl_FragColor=vec4(uv.x*0.5, uv.y*0.4+0.1*sin(t+uv.x*40.), 0.3, 1.); }"));
  gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  return { gl, t: gl.getUniformLocation(pr, "t"), draw(t) { gl.viewport(0, 0, c.width, c.height); gl.uniform1f(this.t, t); gl.drawArrays(gl.TRIANGLES, 0, 6); } };
}
const noise = (x, n) => { for (let i = 0; i < n; i++) { x.globalAlpha = 0.3; x.fillRect((i * 97) % (x.canvas.width - 40), (i * 53) % (x.canvas.height - 40), 30 + (i % 20), 20 + (i % 15)); } x.globalAlpha = 1; };
const CASES = [
  ["empty page, rAF only", () => ({ frame() {} })],
  ["GL canvas, MSAA (antialias:true), clear + full-screen quad", () => { const g = glOf(canvas(W, H), { antialias: true, premultipliedAlpha: true }); return { frame(t) { g.draw(t / 1000); } }; }],
  ["GL canvas, antialias:false, clear + full-screen quad", () => { const g = glOf(canvas(W, H), { antialias: false, premultipliedAlpha: true }); return { frame(t) { g.draw(t / 1000); } }; }],
  ["GL canvas, alpha:false", () => { const g = glOf(canvas(W, H), { antialias: false, alpha: false }); return { frame(t) { g.draw(t / 1000); } }; }],
  ["GL canvas, preserveDrawingBuffer:true", () => { const g = glOf(canvas(W, H), { antialias: false, preserveDrawingBuffer: true }); return { frame(t) { g.draw(t / 1000); } }; }],
  ["2D canvas (0.75 density), clear + 300 translucent rects", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); noise(x, 300); } }; }],
  ["2D canvas (full density), clear + 300 translucent rects", () => { const x = canvas(W, H).getContext("2d"); return { frame() { x.clearRect(0, 0, W, H); noise(x, 300); } }; }],
  ["GL (MSAA) + 2D overlay, no copy (the game now)", () => { const g = glOf(canvas(W2, H2), { antialias: true }); const x = canvas(W2, H2).getContext("2d"); return { frame(t) { g.draw(t / 1000); x.clearRect(0, 0, W2, H2); noise(x, 300); } }; }],
  ["GL (MSAA) + 2D overlay with drawImage(GL canvas) copy each frame (the game before)", () => { const g = glOf(canvas(W2, H2), { antialias: true }); const x = canvas(W2, H2).getContext("2d"); return { frame(t) { g.draw(t / 1000); x.globalCompositeOperation = "copy"; x.drawImage(g.gl.canvas, 0, 0); x.globalCompositeOperation = "source-over"; noise(x, 300); } }; }],
  ["GL (no MSAA) + 2D overlay with drawImage(GL canvas) copy each frame", () => { const g = glOf(canvas(W2, H2), { antialias: false }); const x = canvas(W2, H2).getContext("2d"); return { frame(t) { g.draw(t / 1000); x.globalCompositeOperation = "copy"; x.drawImage(g.gl.canvas, 0, 0); x.globalCompositeOperation = "source-over"; noise(x, 300); } }; }],
  ["2D canvas uploaded to a GL texture every frame (texSubImage2D, 1024 square)", () => { const src = document.createElement("canvas"); src.width = src.height = 1024; const sx = src.getContext("2d"); const g = glOf(canvas(W2, H2), { antialias: false }); const gl = g.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return { frame(tm) { sx.clearRect(0, 0, 1024, 1024); noise(sx, 200); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src); g.draw(tm / 1000); } }; }],
  ["getImageData 1x1 from a 2D canvas every frame", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); noise(x, 300); x.getImageData(0, 0, 1, 1); } }; }],
  /* PER-DRAW-CALL cost (the owner's Radeon ran every layer case at the display rate but the game at ~55 ms): thousands of small ops a frame, in the ways the game draws them */
  ["2D: 2000 small arcs, each its OWN path + fill", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 2000; i++) { x.beginPath(); x.arc((i * 97) % W2, (i * 53) % H2, 3, 0, 6.283); x.fill(); } } }; }],
  ["2D: the same 2000 arcs in ONE path, one fill", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); x.beginPath(); for (let i = 0; i < 2000; i++) { const cx = (i * 97) % W2, cy = (i * 53) % H2; x.moveTo(cx + 3, cy); x.arc(cx, cy, 3, 0, 6.283); } x.fill(); } }; }],
  ["2D: 300 small fills each with its OWN gradient", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 300; i++) { const cx = (i * 97) % W2, cy = (i * 53) % H2, g = x.createRadialGradient(cx, cy, 0, cx, cy, 20); g.addColorStop(0, "white"); g.addColorStop(1, "transparent"); x.fillStyle = g; x.fillRect(cx - 20, cy - 20, 40, 40); } } }; }],
  ["2D: 300 small fills, one flat colour each, save/setTransform/restore around each", () => { const x = canvas(W2, H2).getContext("2d"); return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 300; i++) { x.save(); x.setTransform(1, 0, 0, 1, (i * 97) % W2, (i * 53) % H2); x.globalAlpha = 0.5; x.fillRect(0, 0, 30, 20); x.restore(); } } }; }],
  ["2D: 300 text stamps, each from its OWN canvas (drawImage)", () => { const x = canvas(W2, H2).getContext("2d"), st = []; for (let i = 0; i < 300; i++) { const c = document.createElement("canvas"); c.width = 40; c.height = 24; const y = c.getContext("2d"); y.font = "bold 16px sans-serif"; y.fillText(String(1000 + i), 2, 18); st.push(c); } return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 300; i++) x.drawImage(st[i], (i * 97) % W2, (i * 53) % H2); } }; }],
  ["2D: the same 300 stamps cut from ONE atlas canvas", () => { const x = canvas(W2, H2).getContext("2d"), at = document.createElement("canvas"); at.width = 1024; at.height = 256; const y = at.getContext("2d"); y.font = "bold 16px sans-serif"; for (let i = 0; i < 300; i++) y.fillText(String(1000 + i), (i % 20) * 50 + 2, Math.floor(i / 20) * 26 + 18); return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 300; i++) x.drawImage(at, (i % 20) * 50, Math.floor(i / 20) * 26, 40, 24, (i * 97) % W2, (i * 53) % H2, 40, 24); } }; }],
  ["2D: 300 short stroked paths (beams), one stroke each", () => { const x = canvas(W2, H2).getContext("2d"); x.lineWidth = 2; return { frame() { x.clearRect(0, 0, W2, H2); for (let i = 0; i < 300; i++) { x.beginPath(); x.moveTo((i * 97) % W2, (i * 53) % H2); x.lineTo((i * 97) % W2 + 80, (i * 53) % H2 + 30); x.stroke(); } } }; }],
  ["2D: 300 short stroked paths in ONE path, one stroke", () => { const x = canvas(W2, H2).getContext("2d"); x.lineWidth = 2; return { frame() { x.clearRect(0, 0, W2, H2); x.beginPath(); for (let i = 0; i < 300; i++) { x.moveTo((i * 97) % W2, (i * 53) % H2); x.lineTo((i * 97) % W2 + 80, (i * 53) % H2 + 30); } x.stroke(); } }; }],
  ["three stacked 2D canvases (full, 0.75, full), 300 rects each", () => { const a = canvas(W, H).getContext("2d"), b = canvas(W2, H2).getContext("2d"), c = canvas(W, H).getContext("2d"); return { frame() { for (const [x, w, h] of [[a, W, H], [b, W2, H2], [c, W, H]]) { x.clearRect(0, 0, w, h); noise(x, 300); } } }; }],
];
let runId = 0;
function run(def, ms) {
  const my = ++runId;
  return new Promise(res => {
    stage.replaceChildren(); const c = def(); const gaps = []; let last = 0, start = 0;
    const loop = t => { if (!start) start = t; if (last) gaps.push(t - last); last = t; const t0 = performance.now(); c.frame(t); c.cpu = (c.cpu || 0) + performance.now() - t0; if (t - start < ms && my === runId) requestAnimationFrame(loop); else { gaps.sort((a, b) => a - b); res({ n: gaps.length, med: gaps[gaps.length >> 1], p90: gaps[Math.floor(gaps.length * 0.9)], cpu: c.cpu / Math.max(1, gaps.length) }); } };
    requestAnimationFrame(loop);
  });
}
const goBtn = document.getElementById("go");
goBtn.onclick = async () => {
  if (goBtn.disabled) return; goBtn.disabled = true;
  out.textContent = ""; log("window " + innerWidth + "x" + innerHeight + " dpr " + devicePixelRatio + " -> canvas " + W + "x" + H + " (overlay " + W2 + "x" + H2 + ")");
  const c = document.createElement("canvas"), gl = c.getContext("webgl"), x = gl && gl.getExtension("WEBGL_debug_renderer_info"); log("gpu " + (x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : "unknown"));
  log("case | median ms | p90 ms | js ms/frame | frames");
  for (const [name, def] of CASES) { try { const r = await run(def, 3000);
    if (name.startsWith("empty")) { const hz = 1000 / r.med; hzEl.textContent = "DISPLAY REFRESH: about " + hz.toFixed(0) + " Hz (an empty page's frame interval is " + r.med.toFixed(1) + " ms)" + (hz < 45 ? " - a SLOW screen: frames near " + (1000 / hz).toFixed(0) + " ms are the display, not the game" : ""); log(hzEl.textContent); }
    log(name + " | " + r.med.toFixed(1) + " | " + r.p90.toFixed(1) + " | " + r.cpu.toFixed(2) + " | " + r.n); } catch (e) { log(name + " | failed: " + e); } }
  stage.replaceChildren(); log("done"); goBtn.disabled = false;
};
