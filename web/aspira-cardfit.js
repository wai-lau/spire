// /aspira - WHERE THE CARDS SIT (split out of aspira-ui.js 2026-11-05, the 500-line cap): the tower / core card bottom centre, lifted
// clear of the wave list and build buttons (cardLift), sized to the room it has (fitPop) and placed (placePop). UI only - the simulator
// never loads it. Same global scope; loaded right BEFORE aspira-ui.js - its last lines (resize, refreshPanels, the first frame) call placePop
// at load: after it, the page threw "Can't find variable: placePop" and the frame loop never ran (7.6.11, caught by the WebKit pytest).

// the tower's / core's card sits BOTTOM CENTRE and stays there (owner: it no
// longer follows the tower, which now moves); where it would cover the wave
// list or the build buttons it lifts above whichever it overlaps
// how far above the board's bottom a centred box of width w must sit to clear
// the wave list and build buttons beneath it (the tower card and the upgrade
// cards share it, so they sit in the same place - owner)
const CARD_GAP = 8;
function cardLift(w) {
  const cr = cv.getBoundingClientRect(), x = Math.max(CARD_GAP, (cr.width - w) / 2);
  let lift = CARD_GAP;
  for (const sel of [".asp-buildcol", ".asp-powerdock", ".asp-foot"]) { // the build buttons + the title under them (the wave list moved to the top, 2026-10-27)
    const r = document.querySelector(sel).getBoundingClientRect();
    if (!r.height || r.right - cr.left <= x || r.left - cr.left >= x + w) continue; // beside it, not under it
    lift = Math.max(lift, cr.bottom - r.top + CARD_GAP);
  }
  return { x, lift };
}
const POP_MIN_H = 160, CHART_MIN = 140, CHART_FLOOR = 80, TOWER_CARD_H = 520; // the chart's floor: the triangle is the card's focus (owner); CHART_FLOOR only when the WINDOW itself is too short
const towerWide = () => matchMedia("(orientation: landscape) and (min-width: 700px)").matches; // the two-half card (aspira.css)
// fit the card to `room` WITHOUT scrolling (owner): wide, the chart fills its
// half's height (aspira.css) and the card stands TOWER_CARD_H tall when the room
// allows; stacked, the chart is shrunk until the card fits, and at the chart's
// floor the card grows past the bar rather than clip. Runs when the content or
// the room changed, not every frame
// winRoom: from the card's highest top to the window's bottom
function fitPop(pop, room, winRoom) {
  pop.__fitRoom = room; pop.__fitDirty = false; fitDesc(pop); // a description over five lines shrinks to fit (aspira-sliders.js)
  pop.style.maxHeight = room + "px";
  const chart = pop.querySelector(".asp-chart");
  pop.style.minHeight = ""; // (a forced TOWER_CARD_H left empty bands - owner)
  if (!chart) return;
  chart.style.width = "";
  if (towerWide()) return;
  // narrowing the chart by the overflow does not cut the card by as much (labels, gaps): iterate
  const shrink = floor => {
    for (let i = 0; i < 6; i++) {
      const over = pop.scrollHeight - pop.clientHeight;
      if (over <= 0) return true;
      const w = chart.getBoundingClientRect().width, nw = Math.max(floor, w - over);
      if (nw >= w) return false;
      chart.style.width = nw + "px";
    }
    return pop.scrollHeight <= pop.clientHeight;
  };
  if (shrink(CHART_MIN)) return;
  // at the chart's floor and still over the room: the card runs past the bar rather than
  // clip, but never past the WINDOW - against the window the chart may go down to CHART_FLOOR
  pop.style.maxHeight = Math.max(room, winRoom) + "px";
  shrink(CHART_FLOOR);
}
function placePop() {
  const pop = $("asp-pop");
  if (pop.hidden) return;
  const { x } = cardLift(pop.offsetWidth);
  // ...but never up over the speed row (a short phone: it then sits over the wave list)
  const cr = cv.getBoundingClientRect(), top = document.querySelector(".asp-head").getBoundingClientRect().bottom - cr.top + CARD_GAP + CRED_ROOM; // room for the credits above
  // CENTRED between that and the bottom bar less the close button's room (owner, 2026-10-07)
  // the tower card carries its own cancel / close (aspira-sliders.js), so the spend bar's
  // button under it is hidden (aspira.css) and its room (BTN_ROOM) goes to the card
  const bottom = cr.height - spendRoom() + (pop.classList.contains("asp-tower") ? BTN_ROOM : 0);
  // a short screen: the card is CAPPED to that room and NEVER scrolls (owner,
  // 2026-10-07) - the chart gives way instead (fitPop), so the buttons stay on screen
  const room = Math.max(POP_MIN_H, bottom - top);
  if (pop.__fitRoom !== room || pop.__fitDirty) fitPop(pop, room, cr.height - top - CARD_GAP);
  const h2 = pop.offsetHeight; // after the fit
  pop.style.left = x + "px"; pop.style.top = Math.max(top, (top + bottom - h2) / 2) + "px";
  placeCred(); // the credits ride above the card (aspira-chooser.js)
}
