import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { gridKeyAction } from "../src/grid/keys.js";

const key = (name, mods = {}) => ({
  key: name, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...mods,
});
const focus = (to) => ({ type: "focus", to });
const move = (to) => ({ type: "move", to });

// A 4×4 grid with 14 apps:  0 1 2 3 / 4 5 6 7 / 8 9 10 11 / 12 13
describe("gridKeyAction in a 4-column grid", () => {
  test("arrows move by one tile or one row of 4", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight"), 5, 14, 4), focus(6));
    assert.deepEqual(gridKeyAction(key("ArrowDown"), 5, 14, 4), focus(9));
    assert.deepEqual(gridKeyAction(key("ArrowUp"), 5, 14, 4), focus(1));
    assert.deepEqual(gridKeyAction(key("End"), 0, 14, 4), focus(13));
  });

  test("down from the row above a short last row lands on its last tile", () => {
    assert.deepEqual(gridKeyAction(key("ArrowDown"), 11, 14, 4), focus(13));
  });

  test("Ctrl + arrows move a tile by one row of 4", () => {
    assert.deepEqual(gridKeyAction(key("ArrowDown", { ctrlKey: true }), 2, 14, 4), move(6));
    assert.deepEqual(gridKeyAction(key("ArrowUp", { ctrlKey: true }), 13, 14, 4), move(9));
  });
});

// A full 3×3 grid:   0 1 2 / 3 4 5 / 6 7 8
describe("gridKeyAction: moving focus", () => {
  test("arrows move one tile or one row", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight"), 4, 9, 3), focus(5));
    assert.deepEqual(gridKeyAction(key("ArrowLeft"), 4, 9, 3), focus(3));
    assert.deepEqual(gridKeyAction(key("ArrowUp"), 4, 9, 3), focus(1));
    assert.deepEqual(gridKeyAction(key("ArrowDown"), 4, 9, 3), focus(7));
  });

  test("Left and Right continue onto the next or previous row", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight"), 2, 9, 3), focus(3));
    assert.deepEqual(gridKeyAction(key("ArrowLeft"), 3, 9, 3), focus(2));
  });

  test("Home and End jump to the first and last tile", () => {
    assert.deepEqual(gridKeyAction(key("Home"), 5, 9, 3), focus(0));
    assert.deepEqual(gridKeyAction(key("End"), 1, 9, 3), focus(8));
  });

  test("does nothing at the edges", () => {
    assert.equal(gridKeyAction(key("ArrowLeft"), 0, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowRight"), 8, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowUp"), 1, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowDown"), 7, 9, 3), null);
    assert.equal(gridKeyAction(key("Home"), 0, 9, 3), null);
    assert.equal(gridKeyAction(key("End"), 8, 9, 3), null);
  });

  test("Down onto a shorter last row lands on its last tile", () => {
    // 7 tiles:   0 1 2 / 3 4 5 / 6
    assert.deepEqual(gridKeyAction(key("ArrowDown"), 5, 7, 3), focus(6));
    assert.deepEqual(gridKeyAction(key("ArrowDown"), 3, 7, 3), focus(6));
    assert.equal(gridKeyAction(key("ArrowDown"), 6, 7, 3), null);
  });

  test("works with a single tile", () => {
    for (const name of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) {
      assert.equal(gridKeyAction(key(name), 0, 1, 3), null);
    }
  });
});

describe("gridKeyAction: moving a tile", () => {
  test("Ctrl + arrows, Home and End move the tile", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight", { ctrlKey: true }), 0, 9, 3), move(1));
    assert.deepEqual(gridKeyAction(key("ArrowDown", { ctrlKey: true }), 0, 9, 3), move(3));
    assert.deepEqual(gridKeyAction(key("ArrowUp", { ctrlKey: true }), 8, 9, 3), move(5));
    assert.deepEqual(gridKeyAction(key("ArrowLeft", { ctrlKey: true }), 8, 9, 3), move(7));
    assert.deepEqual(gridKeyAction(key("Home", { ctrlKey: true }), 4, 9, 3), move(0));
    assert.deepEqual(gridKeyAction(key("End", { ctrlKey: true }), 4, 9, 3), move(8));
  });

  test("Ctrl + arrows works on every platform, including Mac", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight", { ctrlKey: true }), 0, 9, 3, true), move(1));
  });

  test("Option + arrows moves the tile on Mac only", () => {
    assert.deepEqual(gridKeyAction(key("ArrowRight", { altKey: true }), 0, 9, 3, true), move(1));
    assert.equal(gridKeyAction(key("ArrowRight", { altKey: true }), 0, 9, 3, false), null);
  });

  test("Ctrl at the edges does nothing", () => {
    assert.equal(gridKeyAction(key("ArrowLeft", { ctrlKey: true }), 0, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowDown", { ctrlKey: true }), 8, 9, 3), null);
  });
});

describe("gridKeyAction: keys it leaves alone", () => {
  test("other keys", () => {
    for (const name of ["Enter", " ", "Tab", "a", "Escape", "PageDown"]) {
      assert.equal(gridKeyAction(key(name), 4, 9, 3), null);
    }
  });

  test("Shift, Cmd/Meta, and Ctrl+Alt combinations", () => {
    assert.equal(gridKeyAction(key("ArrowRight", { shiftKey: true }), 4, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowRight", { metaKey: true }), 4, 9, 3, true), null);
    assert.equal(gridKeyAction(key("ArrowRight", { ctrlKey: true, altKey: true }), 4, 9, 3, true), null);
  });

  test("an index outside the grid", () => {
    assert.equal(gridKeyAction(key("ArrowRight"), -1, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowLeft"), 9, 9, 3), null);
    assert.equal(gridKeyAction(key("ArrowLeft"), 0, 0, 3), null);
  });
});
