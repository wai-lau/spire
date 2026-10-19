// /spire sims - TIERS ARE BOUGHT BY STOP (owner, 2026-10-19: "there are only 4 tiers now, tier 4 is the capstone / don't sim the
// intermediate tiers - update everywhere"): an axis sits at 0, 1, 3, 5 or 6 (SKILL_STOPS, aspira-capstone.js; shown 0, I .. IV), never
// 2 or 4. Every script that sets a tower's skills by hand spends its points through these.
export const STOPS = [0, 1, 3, 5, 6];
// the highest stop at or under v
export const snapStop = v => STOPS.filter(s => s <= v).pop() ?? 0;
// POINTS spread over the axes a STOP at a time, round-robin (each next stop costs its gap in points); what cannot buy a whole
// stop is left over
export function spreadStops(axes, points) {
  const sk = {}; let left = points, moved = true;
  while (moved) {
    moved = false;
    for (const a of axes) {
      const cur = sk[a] || 0, next = STOPS.find(s => s > cur);
      if (next !== undefined && next - cur <= left) { sk[a] = next; left -= next - cur; moved = true; }
    }
  }
  return sk;
}
// one axis as deep as POINTS allow (snapped to a stop, capped at the capstone), the rest spread over the others
export function focusStops(axes, build, points) {
  const k = snapStop(Math.min(points, STOPS[STOPS.length - 1]));
  return { ...spreadStops(axes.filter(a => a !== build), points - k), ...(k ? { [build]: k } : {}) };
}
