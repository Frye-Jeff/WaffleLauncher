import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { installFakeBrowser } from "./fake-browser.js";

// A stand-in for the parts of `browser` that background.js uses: fake storage
// (for the icon setting, read through settings.js) plus menus, runtime and
// action. It records listeners so tests can fire events, and the calls made.
function fakeBrowser() {
  const listeners = { installed: [], startup: [], clicked: [] };
  const calls = { create: [], removeAll: 0, openOptionsPage: 0, setIcon: [] };
  return Object.assign(installFakeBrowser(), {
    listeners,
    calls,
    action: {
      setIcon: async (details) => { calls.setIcon.push(details); },
    },
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
  });
}

// background.js registers itself on import, so give it a fake first.
fakeBrowser();
const { MENU_ID, MENU_TITLE, WAFFLE_ICON, register } = await import("../src/background.js");
const { saveIcon, resetSettings } = await import("../src/settings.js");

let api;
beforeEach(async () => {
  api = fakeBrowser(); // also the global `browser`, so settings.js uses it
  await register(api);
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

describe("background: toolbar icon", () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  test("keeps the manifest's grid icon by default", () => {
    assert.deepEqual(api.calls.setIcon, [{}]);
  });

  test("shows the saved waffle icon when it loads", async () => {
    api.data.set("settings", { version: 1, icon: "waffle" });
    api.calls.setIcon = [];
    await register(api);
    assert.deepEqual(api.calls.setIcon.at(-1), { path: WAFFLE_ICON });
    assert.equal(WAFFLE_ICON, "icons/waffle.svg");
  });

  test("switches right away when the setting changes, and back on reset", async () => {
    await saveIcon("waffle");
    await settle();
    assert.deepEqual(api.calls.setIcon.at(-1), { path: WAFFLE_ICON });
    await resetSettings();
    await settle();
    assert.deepEqual(api.calls.setIcon.at(-1), {});
  });

  test("a failed icon change doesn't throw", async () => {
    api.action.setIcon = async () => { throw new Error("no"); };
    await saveIcon("waffle");
    await settle();
    await assert.doesNotReject(register(api));
  });
});
