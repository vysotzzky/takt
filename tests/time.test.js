import assert from "node:assert/strict";
import test from "node:test";
import { elapsed } from "../src/shift.js";

test("Licznik uwzględnia pełną dobę i zmianę czasu w Warszawie", () => {
  assert.equal(elapsed(0, 26 * 3600000 + 7000), "26:00:07");
  assert.equal(elapsed(Date.parse("2026-10-25T02:30:00+02:00"), Date.parse("2026-10-25T02:30:00+01:00")), "01:00:00");
  assert.equal(elapsed(1000, 500), "00:00:00");
});
