// /spire sims - TIERS ARE PURCHASES (owner, 2026-10-19 / 2026-10-23: "drop all the god damn levels between that can not be bought"),
// SIX of them since the tier redesign (owner, 2026-10-24): an axis sits at tier 0, I, II, III, IV or V (SKILL_TIERS, aspira-capstone.js;
// V the capstone, one a tower), and a POINT is ONE PURCHASE - a tower holds 13 (SKILL_POINTS: V + IV + IV). A sim that sets a tower's
// skills by hand spends its points through these.
export const STOPS = [0, 1, 2, 3, 4, 5];
export const TIER_POINTS = [1, 1, 1, 1, 1];
// the points a tower stands on at tier k (one a tier)
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
