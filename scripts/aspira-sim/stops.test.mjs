// stops.mjs on the six-tier ladder (tier redesign, owner 2026-10-24): a POINT is one purchase, tier V the capstone - a spread build
// never takes it, a focused build takes it on its one axis.  run: node --test scripts/aspira-sim/stops.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spreadStops, focusStops, snapStop } from "./stops.mjs";

const AX = ["a", "b", "c"];
test("6 points spread two tiers on every axis", () => assert.deepEqual(spreadStops(AX, 6), { a: 2, b: 2, c: 2 }));
test("13 points spread stop at IV everywhere, one left over", () => assert.deepEqual(spreadStops(AX, 13), { a: 4, b: 4, c: 4 }));
test("13 points focused: the capstone on that axis, IV on the others", () => assert.deepEqual(focusStops(AX, "a", 13), { a: 5, b: 4, c: 4 }));
test("5 points snap to tier V", () => assert.equal(snapStop(5), 5));
