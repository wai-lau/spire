// /aspira - the CORE POWERS as BUTTONS above the title (owner, 2026-10-08: "move
// powers to buttons above game title showing cooldown"; was a dial of arcs round the
// core). One button per OWNED power, in its colour: a bar that fills as it recharges
// and the seconds left, "online" (flashing) when it can go, and while it RUNS the
// seconds it has left. Temporal: a tap fires it. Relay: a tap on it with a tower
// selected relays that tower; with none it ARMS - the next tower tapped takes it, a
// tap anywhere else disarms (onTap, aspira-ui.js). The core's own gestures (hold /
// drag, aspira-camera.js) still work. UI only; loaded after aspira-core-fx.js (DIAL)
// and before aspira-ui.js, whose HUD tick calls updatePowers.
// each power's word when it can go (owner, 2026-10-08): TEMPORAL DRIVE online, ORBITAL RELAY ready
const POWER_READY = { temporal: "online", relay: "ready" };
function powerTap(d) {
  if (otherRunning(d.id)) return; // the other power is running: this one waits (aspira-core.js)
  if (d.id === "temporal") { if (temporalFreeze()) refreshPanels(); return; }
  // the Relay ALWAYS arms and waits for a tower (owner, 2026-10-08: "keep waiting for tower selection"),
  // whatever is selected; a second tap on the button disarms
  setRelayArm(!ui.relayArm && cooldownLeft("relay") <= 0); // armed: every tower FLASHES a white ring (drawRelayArm), no banner (owner, 2026-10-08)
}
// an armed Relay PAUSES the game while the player picks a tower (owner, 2026-10-10: "clicking orbital relay should
// pause game for tower selection"); disarming puts back whatever pause state there was
const relayPause = { was: false };
function setRelayArm(on) {
  if (on && !ui.relayArm) { relayPause.was = ui.paused; ui.paused = true; }
  else if (!on && ui.relayArm) ui.paused = relayPause.was;
  ui.relayArm = on;
}
// while the Relay is armed, a flashing white HEXAGON round every tower's base says "tap one" - on the
// same 0.7s beat as the online buttons (aspira.css asp-flash); the flat board only (3D: drawRelayHex3d)
function drawRelayArm() {
  if (!ui.relayArm || q3d()) return; // (3D: drawRelayHex3d, the same base hexagon on the floor - aspira-core-fx.js)
  const a = 0.3 + 0.7 * blinkWave(); // the one blink, a touch softer (was 0.15 + 0.85)
  ctx.strokeStyle = COL.white; ctx.lineWidth = 3; ctx.shadowColor = COL.white; ctx.shadowBlur = 14 * cam.k * a;
  for (const t of G.towers) {
    const c0 = CELLS[t.cell], x = t.x ?? c0.x, y = t.y ?? c0.y; // the tower's base HEXAGON, like a Relayed one (owner, 2026-10-16: "the orbital relay target selector flashing should get the same treatment")
    ctx.globalAlpha = a; ctx.beginPath(); c0.pts.forEach((q, i) => { const px = x + (q.x - c0.x) * TOWER_K * RELAY_HEX_OUT, py = y + (q.y - c0.y) * TOWER_K * RELAY_HEX_OUT; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}
// from onTap: an armed Relay goes to the tower tapped (even with a build pending); a tap on anything else
// only disarms it (owner, 2026-10-08) - the tap is used up either way
function relayArmTap(hit) {
  if (!ui.relayArm) return false;
  setRelayArm(false);
  if (G.towers.includes(hit)) relay(hit);
  return true;
}
// a power's button FLASHES, quick, when it comes online (granted or off cooldown) - POWER_FLASH_MS of the .pop animation
const POWER_FLASH_MS = 4000 /* longer (owner, 2026-10-14; was 900) */, powerFlashAt = {};
function flashPower(id) { powerFlashAt[id] = performance.now() + POWER_FLASH_MS; }
function updatePowers() {
  const box = $("asp-powers"), c = G.core, owned = DIAL.filter(d => powerLvl(d.id));
  box.hidden = !owned.length;
  for (const d of owned) {
    let b = box.querySelector('[data-pw="' + d.id + '"]');
    if (!b) { b = button(box, "asp-power " + d.color, "", () => powerTap(d)); b.dataset.pw = d.id; }
    const lv = powerLvl(d.id), cd = cooldownLeft(d.id), full = d.tab()[lv].cd, run = d.active(c);
    const wait = run <= 0 && otherRunning(d.id); // the other power runs: this one waits (owner, 2026-10-15)
    const state = run > 0 ? Math.ceil(run) + "s on" : cd > 0 ? wavesLeft(cd) : wait ? "wait" : POWER_READY[d.id]; // the cooldown in waves (2026-10-11) // (owner, 2026-10-08: "should say temporal drive online"; was TIME STOP / ready)
    setHtml(b, "<span>" + d.label + "</span><b>" + state + '</b><i style="width:' + Math.round(100 * (run > 0 ? 1 : 1 - Math.min(1, cd / full))) + '%"></i>');
    b.classList.toggle("ready", run <= 0 && cd <= 0 && !wait); b.classList.toggle("run", run > 0); b.classList.toggle("wait", wait);
    b.classList.toggle("armed", d.id === "relay" && !!ui.relayArm);
    // a power coming off cooldown pops "<NAME> ONLINE" where the interest pops up, under the core (was the dial's)
    if (c.flashAt && c.flashAt[d.id] && G.wave >= c.flashAt[d.id]) { flashPower(d.id); delete c.flashAt[d.id]; } // won from a boss: flashes as the next wave starts (grantPowers)
    const was = (c.cdSeen ||= {})[d.id];
    if (was > 0 && cd <= 0) flashPower(d.id); // back online: its button flashes, quick (owner, 2026-10-12; was a pop-up under the core)
    b.classList.toggle("pop", (powerFlashAt[d.id] || 0) > performance.now());
    c.cdSeen[d.id] = cd;
  }
}
