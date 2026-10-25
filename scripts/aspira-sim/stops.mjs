// /spire sims - TIERS ARE PURCHASES (owner, 2026-10-19: "there are only 4 tiers now, tier 4 is the capstone / don't sim the
// intermediate tiers - update everywhere"; 2026-10-23: "drop all the god damn levels between that can not be bought"): an axis sits at
// tier 0, 1, 2, 3 or 4 (SKILL_TIERS, aspira-capstone.js; shown 0, I .. IV), and a sim that sets a tower's skills by hand spends its
// POINTS through these. A POINT is the sims' old budget unit (t.lvl = 1 + points, the capstone's second ladder step not counted): a
// tier takes TIER_POINTS of them, so the same points buy the same towers as when the tiers were levels 0 1 3 5 6.
// SIX TIERS (tier redesign, owner 2026-10-24): 0 I II III IV V, V the capstone, and a POINT is now ONE PURCHASE (was 0..IV on the old
// 1 2 2 1 point table)
export const STOPS = [0, 1, 2, 3, 4, 5];
export const TIER_POINTS = [1, 1, 1, 1, 1];
// the points a tower stands on at tier k (the old level of that tier: 0 1 3 5 6)
export const POINTS_AT = [0, 1, 2, 3, 4, 5];
// the highest tier POINTS reach
export const snapStop = v => STOPS.filter(s => POINTS_AT[s] <= v).pop() ?? 0;
// POINTS spread over the axes a TIER at a time, round-robin (each next tier costs its TIER_POINTS); what cannot buy a whole
// tier is left over
export function spreadStops(axes, points) {
  const sk = {}; let left = points, moved = true;
  while (moved) {
    moved = false;
    for (const a of axes) {
      const cur = sk[a] || 0;
      if (cur < STOPS.length - 2 && TIER_POINTS[cur] <= left) /* a spread build stops at IV: V is the capstone, one a tower */ { sk[a] = cur + 1; left -= TIER_POINTS[cur]; moved = true; }
    }
  }
  return sk;
}
// one axis as deep as POINTS allow (a whole tier, capped at the capstone), the rest spread over the others
export function focusStops(axes, build, points) {
  const k = snapStop(Math.min(points, POINTS_AT[POINTS_AT.length - 1]));
  return { ...spreadStops(axes.filter(a => a !== build), points - POINTS_AT[k]), ...(k ? { [build]: k } : {}) };
}
