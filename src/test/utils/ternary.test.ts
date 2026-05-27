import "../_setup/global-hooks";
import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { findTopLevelTernary } from "../../utils/ternary";

describe("findTopLevelTernary", () => {
  test("returns null when the line has no ternary", () => {
    assert.equal(findTopLevelTernary("Dim x As Integer"), null);
  });

  test("finds the outermost `?` and `:` in a simple ternary", () => {
    const r = findTopLevelTernary("Dim x = a ? b : c");
    assert.ok(r);
    assert.equal(r.questionAt, 10);
    assert.equal(r.colonAt, 14);
  });

  test('ignores `?` and `:` inside a regular `"..."` string literal', () => {
    assert.equal(findTopLevelTernary(`Dim x = "what?":`), null);
    assert.equal(findTopLevelTernary(`Dim x = "a ? b : c"`), null);
  });

  test('ignores `?` and `:` inside a `$"..."` interpolated string literal', () => {
    assert.equal(findTopLevelTernary(`Dim x = $"a ? {b} : c"`), null);
  });

  test("ignores `?` and `:` after a `'` line comment", () => {
    assert.equal(findTopLevelTernary("x = 1 ' was a ? b : c"), null);
  });

  test("ignores `?` at depth > 0 (inside parens)", () => {
    assert.equal(findTopLevelTernary("Foo((cond ? a : b))"), null);
    assert.equal(findTopLevelTernary("Dim x = arr[i ? 0 : 1]"), null);
  });

  test("pairs the OUTER `:` with the OUTER `?` for nested ternaries", () => {
    // `a ? b ? c : d : e` — the outer `?` is at index 2, the inner `?` at
    // index 6, the inner `:` at index 10, the OUTER `:` at index 14.
    const r = findTopLevelTernary("a ? b ? c : d : e");
    assert.ok(r);
    assert.equal(r.questionAt, 2);
    assert.equal(r.colonAt, 14);
  });

  test("returns null when only `?` is present (no `:`)", () => {
    assert.equal(findTopLevelTernary("Dim x = cond ? a"), null);
  });

  test("returns null when only `:` is present (no `?`)", () => {
    assert.equal(findTopLevelTernary("Dim x : Integer"), null);
  });
});
