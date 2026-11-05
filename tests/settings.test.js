import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { installFakeBrowser } from "./fake-browser.js";
import { APPS, DEFAULT_APP_IDS, GRID_SIZE } from "../src/apps.js";
import {
  SETTINGS_VERSION,
  cleanAppIds,
  loadAppIds,
  moveItem,
  onAppIdsChanged,
  resetAppIds,
  saveAppIds,
} from "../src/settings.js";

const KEY = "settings";
const ALL_IDS = APPS.map((app) => app.id);
let fake;

beforeEach(() => {
  fake = installFakeBrowser();
});

describe("cleanAppIds", () => {
  test("keeps known IDs in order", () => {
    assert.deepEqual(cleanAppIds(["google-drive", "google-gmail"]), ["google-drive", "google-gmail"]);
  });

  test("drops unknown, non-string and duplicate entries", () => {
    const messy = ["google-drive", "nope", 42, null, " google-gmail", "google-drive", "google-gmail"];
    assert.deepEqual(cleanAppIds(messy), ["google-drive", "google-gmail"]);
  });

  test(`caps the list at GRID_SIZE (${GRID_SIZE})`, () => {
    assert.deepEqual(cleanAppIds(ALL_IDS), ALL_IDS.slice(0, GRID_SIZE));
  });

  test("returns an empty list for anything that isn't an array", () => {
    for (const value of [undefined, null, "google-gmail", 7, { apps: [] }]) {
      assert.deepEqual(cleanAppIds(value), []);
    }
  });
});

describe("loadAppIds", () => {
  test("returns the defaults when nothing is saved", async () => {
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });

  test("returns the saved list, cleaned", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-keep", "bogus", "google-keep", "google-maps"] });
    assert.deepEqual(await loadAppIds(), ["google-keep", "google-maps"]);
  });

  test("returns the defaults when the saved list has no usable apps", async () => {
    fake.data.set(KEY, { version: 1, apps: ["bogus"] });
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });

  test("returns the defaults when the saved value is malformed", async () => {
    for (const value of ["google-gmail", 42, null, { apps: "google-gmail" }]) {
      fake.data.set(KEY, value);
      assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
    }
  });

  test("returns the defaults instead of throwing when storage fails", async () => {
    fake.failNext = "get";
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });

  test("returns a copy, not the frozen defaults", async () => {
    const ids = await loadAppIds();
    assert.equal(Object.isFrozen(ids), false);
    ids.push("x");
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });
});

describe("saveAppIds", () => {
  test("saves the cleaned list with the settings version", async () => {
    const saved = await saveAppIds(["google-maps", "bogus", "google-maps", "google-docs"]);
    assert.deepEqual(saved, ["google-maps", "google-docs"]);
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, apps: ["google-maps", "google-docs"] });
  });

  test("stores nothing but the version and the app list", async () => {
    await saveAppIds(["google-gmail"]);
    assert.deepEqual([...fake.data.keys()], [KEY]);
    assert.deepEqual(Object.keys(fake.data.get(KEY)).sort(), ["apps", "version"]);
  });

  test("round-trips through loadAppIds", async () => {
    await saveAppIds(["google-youtube", "google-gmail"]);
    assert.deepEqual(await loadAppIds(), ["google-youtube", "google-gmail"]);
  });

  test("saving an empty or all-invalid list resets to the defaults", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-gmail"] });
    assert.deepEqual(await saveAppIds(["bogus"]), [...DEFAULT_APP_IDS]);
    assert.equal(fake.data.has(KEY), false);
  });

  test("rejects when storage fails, so the caller can report it", async () => {
    fake.failNext = "set";
    await assert.rejects(saveAppIds(["google-gmail"]));
  });
});

describe("resetAppIds", () => {
  test("removes the saved setting and returns the defaults", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-gmail"] });
    assert.deepEqual(await resetAppIds(), [...DEFAULT_APP_IDS]);
    assert.equal(fake.data.has(KEY), false);
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });

  test("rejects when storage fails", async () => {
    fake.failNext = "remove";
    await assert.rejects(resetAppIds());
  });
});

describe("sync safety", () => {
  test("loading never writes, so a newer version's data is left alone", async () => {
    const newer = { version: SETTINGS_VERSION + 1, apps: ["proton-mail", "google-gmail"], extra: true };
    fake.data.set(KEY, structuredClone(newer));
    assert.deepEqual(await loadAppIds(), ["google-gmail"]);
    assert.deepEqual(fake.data.get(KEY), newer);
  });
});

describe("onAppIdsChanged", () => {
  test("reports the cleaned list when the setting changes", async () => {
    const seen = [];
    onAppIdsChanged((ids) => seen.push(ids));
    await saveAppIds(["google-drive", "bogus"]);
    await resetAppIds();
    assert.deepEqual(seen, [["google-drive"], [...DEFAULT_APP_IDS]]);
  });

  test("ignores other storage areas and other keys", () => {
    const seen = [];
    onAppIdsChanged((ids) => seen.push(ids));
    fake.emit(KEY, undefined, { version: 1, apps: ["google-drive"] }, "local");
    fake.emit("something-else", undefined, 1);
    assert.deepEqual(seen, []);
  });

  test("returns a function that stops listening", async () => {
    const seen = [];
    const stop = onAppIdsChanged((ids) => seen.push(ids));
    stop();
    assert.equal(fake.storage.onChanged.count, 0);
    await saveAppIds(["google-drive"]);
    assert.deepEqual(seen, []);
  });
});

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  test("moves an item forward and backward", () => {
    assert.deepEqual(moveItem(list, 0, 2), ["b", "c", "a", "d"]);
    assert.deepEqual(moveItem(list, 3, 0), ["d", "a", "b", "c"]);
  });

  test("returns a copy and leaves the original unchanged", () => {
    const moved = moveItem(list, 0, 1);
    assert.notEqual(moved, list);
    assert.deepEqual(list, ["a", "b", "c", "d"]);
  });

  test("returns an unchanged copy for same, out-of-range or non-integer positions", () => {
    for (const [from, to] of [[1, 1], [-1, 2], [0, 4], [1.5, 2], [0, "1"]]) {
      assert.deepEqual(moveItem(list, from, to), list);
    }
  });
});
