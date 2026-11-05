import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { clickKind, isBlankTabUrl, normalClickTarget } from "../src/open.js";

const click = (mods = {}) => ({ button: 0, ctrlKey: false, metaKey: false, ...mods });

describe("clickKind", () => {
  test("a plain click or Enter is normal", () => {
    assert.equal(clickKind(click()), "normal");
    assert.equal(clickKind(click(), true), "normal");
  });

  test("middle-click is a background click everywhere", () => {
    assert.equal(clickKind(click({ button: 1 })), "background");
    assert.equal(clickKind(click({ button: 1 }), true), "background");
  });

  test("Ctrl-click (or Ctrl+Enter) is a background click on Windows/Linux", () => {
    assert.equal(clickKind(click({ ctrlKey: true })), "background");
    assert.equal(clickKind(click({ metaKey: true })), "normal");
  });

  test("Cmd-click is a background click on Mac; Ctrl-click is not", () => {
    assert.equal(clickKind(click({ metaKey: true }), true), "background");
    assert.equal(clickKind(click({ ctrlKey: true }), true), "normal");
  });
});

describe("isBlankTabUrl", () => {
  test("Firefox's new-tab and blank pages", () => {
    for (const url of ["about:newtab", "about:home", "about:blank", "about:privatebrowsing", "about:newtab#search"]) {
      assert.equal(isBlankTabUrl(url), true, url);
    }
  });

  test("anything else, including a missing URL", () => {
    for (const url of ["https://mail.google.com/", "about:addons", "about:newtabs", "", undefined, null]) {
      assert.equal(isBlankTabUrl(url), false, String(url));
    }
  });
});

describe("normalClickTarget", () => {
  test("new-tab always opens a new tab", () => {
    assert.equal(normalClickTarget("new-tab", "about:newtab"), "new");
    assert.equal(normalClickTarget("new-tab", "https://example.com/"), "new");
  });

  test("smart reuses a new or blank tab, otherwise opens a new tab", () => {
    assert.equal(normalClickTarget("smart", "about:newtab"), "current");
    assert.equal(normalClickTarget("smart", "about:blank"), "current");
    assert.equal(normalClickTarget("smart", "https://example.com/"), "new");
  });

  test("smart opens a new tab when Firefox doesn't share the URL", () => {
    assert.equal(normalClickTarget("smart", undefined), "new");
  });
});
