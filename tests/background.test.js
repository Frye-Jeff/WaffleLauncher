import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

// A stand-in for the parts of `browser` that background.js uses. It records
// listeners so tests can fire events, and records the calls made.
function fakeBrowser() {
  const listeners = { installed: [], startup: [], clicked: [] };
  const calls = { create: [], removeAll: 0, openOptionsPage: 0 };
  return {
    listeners,
    calls,
    runtime: {
      onInstalled: { addListener: (fn) => listeners.installed.push(fn) },
      onStartup: { addListener: (fn) => listeners.startup.push(fn) },
      openOptionsPage: async () => { calls.openOptionsPage++; },
    },
    menus: {
      removeAll: async () => { calls.removeAll++; calls.create = []; },
      create: (item) => { calls.create.push(item); },
      onClicked: { addListener: (fn) => listeners.clicked.push(fn) },
    },
  };
}

// background.js registers itself on import, so give it a fake first.
globalThis.browser = fakeBrowser();
const { MENU_ID, MENU_TITLE, register } = await import("../src/background.js");

let api;
beforeEach(() => {
  api = fakeBrowser();
  register(api);
});

const fire = async (name, arg) => {
  for (const fn of api.listeners[name]) await fn(arg);
};

describe("background: right-click menu", () => {
  const expected = { id: MENU_ID, title: "WaffleLauncher settings", contexts: ["action"] };

  test("is created on install, update and Firefox startup", async () => {
    assert.equal(MENU_TITLE, "WaffleLauncher settings");
    for (const [event, arg] of [["installed", { reason: "install" }], ["installed", { reason: "update" }], ["startup"]]) {
      api.calls.create = [];
      await fire(event, arg);
      assert.deepEqual(api.calls.create, [expected], event);
    }
  });

  test("never ends up with duplicates", async () => {
    await fire("installed", { reason: "install" });
    await fire("startup");
    await fire("startup");
    assert.equal(api.calls.create.length, 1);
  });

  test("only lives on the toolbar button's menu", async () => {
    await fire("startup");
    assert.deepEqual(api.calls.create[0].contexts, ["action"]);
  });

  test("clicking it opens the settings page", async () => {
    await fire("clicked", { menuItemId: MENU_ID });
    assert.equal(api.calls.openOptionsPage, 1);
  });

  test("ignores clicks on other items", async () => {
    await fire("clicked", { menuItemId: "something-else" });
    assert.equal(api.calls.openOptionsPage, 0);
  });
});

describe("background: first install", () => {
  test("opens the settings page once after a fresh install", async () => {
    await fire("installed", { reason: "install" });
    assert.equal(api.calls.openOptionsPage, 1);
  });

  test("does not open it on update, browser update or startup", async () => {
    await fire("installed", { reason: "update" });
    await fire("installed", { reason: "browser_update" });
    await fire("startup");
    assert.equal(api.calls.openOptionsPage, 0);
  });
});
