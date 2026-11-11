import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { installFakeBrowser } from "./fake-browser.js";
import { APPS, DEFAULT_4X4_EXTRA_IDS, DEFAULT_APP_IDS, MAX_APPS } from "../src/apps.js";
import {
  DEFAULT_GRID_SIZE,
  DEFAULT_ICON,
  DEFAULT_OPEN_MODE,
  DEFAULT_THEME,
  GRID_SIZES,
  ICONS,
  OPEN_MODES,
  SETTINGS_VERSION,
  THEMES,
  cleanAppIds,
  defaultAppIds,
  gridCapacity,
  gridColumns,
  loadAppIds,
  loadGridSize,
  loadIcon,
  loadOpenMode,
  loadTheme,
  moveItem,
  onAppIdsChanged,
  onGridSizeChanged,
  onIconChanged,
  onOpenModeChanged,
  onThemeChanged,
  resetSettings,
  saveAppIds,
  saveGridSize,
  saveIcon,
  saveOpenMode,
  saveTheme,
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

  test(`caps the list at MAX_APPS (${MAX_APPS}), or at a given limit`, () => {
    assert.deepEqual(cleanAppIds(ALL_IDS), ALL_IDS.slice(0, MAX_APPS));
    assert.deepEqual(cleanAppIds(ALL_IDS, 9), ALL_IDS.slice(0, 9));
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

  test("keeps the saved theme", async () => {
    fake.data.set(KEY, { version: 1, theme: "light" });
    await saveAppIds(["google-drive"]);
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, theme: "light", apps: ["google-drive"] });
  });

  test("saving an empty or all-invalid list restores the default apps but keeps the theme", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-gmail"], theme: "dark" });
    assert.deepEqual(await saveAppIds(["bogus"]), [...DEFAULT_APP_IDS]);
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, theme: "dark" });
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
  });

  test("rejects when storage fails, so the caller can report it", async () => {
    fake.failNext = "set";
    await assert.rejects(saveAppIds(["google-gmail"]));
  });

  test("rejects without writing when the current settings can't be read", async () => {
    fake.data.set(KEY, { version: 1, theme: "dark" });
    fake.failNext = "get";
    await assert.rejects(saveAppIds(["google-gmail"]));
    assert.deepEqual(fake.data.get(KEY), { version: 1, theme: "dark" });
  });
});

describe("loadTheme", () => {
  test("returns auto when nothing is saved", async () => {
    assert.equal(DEFAULT_THEME, "auto");
    assert.equal(await loadTheme(), "auto");
  });

  test("returns the saved theme", async () => {
    for (const theme of ["light", "dark"]) {
      fake.data.set(KEY, { version: 1, theme });
      assert.equal(await loadTheme(), theme);
    }
  });

  test("returns auto for an unknown or malformed theme", async () => {
    for (const value of [{ theme: "purple" }, { theme: 1 }, "dark", null]) {
      fake.data.set(KEY, value);
      assert.equal(await loadTheme(), "auto");
    }
  });

  test("returns auto instead of throwing when storage fails", async () => {
    fake.failNext = "get";
    assert.equal(await loadTheme(), "auto");
  });
});

describe("saveTheme", () => {
  test("saves light and dark, keeping the apps", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"] });
    assert.equal(await saveTheme("dark"), "dark");
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, apps: ["google-drive"], theme: "dark" });
    await saveTheme("light");
    assert.equal(await loadTheme(), "light");
    assert.deepEqual(await loadAppIds(), ["google-drive"]);
  });

  test("auto is stored by leaving the field out", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"], theme: "dark" });
    await saveTheme("auto");
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, apps: ["google-drive"] });
  });

  test("stores nothing but the version, app list and theme", async () => {
    await saveTheme("dark");
    await saveAppIds(["google-gmail"]);
    assert.deepEqual([...fake.data.keys()], [KEY]);
    assert.deepEqual(Object.keys(fake.data.get(KEY)).sort(), ["apps", "theme", "version"]);
  });

  test("accepts every theme in THEMES", async () => {
    for (const theme of THEMES) assert.equal(await saveTheme(theme), theme);
  });

  test("rejects an unknown theme without writing", async () => {
    await assert.rejects(saveTheme("purple"));
    assert.equal(fake.data.has(KEY), false);
  });

  test("rejects when storage fails", async () => {
    fake.failNext = "set";
    await assert.rejects(saveTheme("dark"));
  });
});

describe("loadOpenMode / saveOpenMode", () => {
  test("defaults to new-tab", async () => {
    assert.equal(DEFAULT_OPEN_MODE, "new-tab");
    assert.equal(await loadOpenMode(), "new-tab");
  });

  test("saves smart, keeping the apps and theme", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"], theme: "dark" });
    assert.equal(await saveOpenMode("smart"), "smart");
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, apps: ["google-drive"], theme: "dark", open: "smart" });
    assert.equal(await loadOpenMode(), "smart");
  });

  test("new-tab is stored by leaving the field out", async () => {
    fake.data.set(KEY, { version: 1, open: "smart" });
    await saveOpenMode("new-tab");
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION });
  });

  test("saving apps or the theme keeps the open mode", async () => {
    await saveOpenMode("smart");
    await saveAppIds(["google-gmail"]);
    await saveTheme("light");
    assert.equal(await loadOpenMode(), "smart");
  });

  test("returns new-tab for an unknown value or a storage failure", async () => {
    fake.data.set(KEY, { version: 1, open: "current-tab" });
    assert.equal(await loadOpenMode(), "new-tab");
    fake.failNext = "get";
    assert.equal(await loadOpenMode(), "new-tab");
  });

  test("accepts every mode in OPEN_MODES and rejects others without writing", async () => {
    for (const mode of OPEN_MODES) assert.equal(await saveOpenMode(mode), mode);
    fake.data.clear();
    await assert.rejects(saveOpenMode("current-tab"));
    assert.equal(fake.data.has(KEY), false);
  });

  test("onOpenModeChanged reports the mode", async () => {
    const seen = [];
    onOpenModeChanged((mode) => seen.push(mode));
    await saveOpenMode("smart");
    await resetSettings();
    assert.deepEqual(seen, ["smart", "new-tab"]);
  });
});

describe("grid size", () => {
  // 16 apps that aren't the defaults (ALL_IDS starts with the 9 defaults)
  const SIXTEEN = ALL_IDS.slice(9, 25);

  test("3x3 holds 9 apps in 3 columns, 4x4 holds 16 in 4", () => {
    assert.deepEqual(GRID_SIZES, ["3x3", "4x4"]);
    assert.equal(DEFAULT_GRID_SIZE, "3x3");
    assert.deepEqual([gridColumns("3x3"), gridCapacity("3x3")], [3, 9]);
    assert.deepEqual([gridColumns("4x4"), gridCapacity("4x4")], [4, 16]);
    assert.equal(gridCapacity(DEFAULT_GRID_SIZE), DEFAULT_APP_IDS.length);
  });

  test("defaults to 3x3, also for an unknown value or a storage failure", async () => {
    assert.equal(await loadGridSize(), "3x3");
    fake.data.set(KEY, { version: 1, grid: "5x5" });
    assert.equal(await loadGridSize(), "3x3");
    fake.failNext = "get";
    assert.equal(await loadGridSize(), "3x3");
  });

  test("saves 4x4, keeping the other settings, and allows 16 apps", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"], theme: "dark" });
    assert.deepEqual(await saveGridSize("4x4"), { size: "4x4", apps: ["google-drive"], removed: [] });
    assert.deepEqual(fake.data.get(KEY),
      { version: SETTINGS_VERSION, apps: ["google-drive"], theme: "dark", grid: "4x4" });
    assert.deepEqual(await saveAppIds(ALL_IDS.slice(9)), SIXTEEN);
    assert.deepEqual(await loadAppIds(), SIXTEEN);
  });

  test("a 3x3 grid still holds only 9 apps", async () => {
    assert.deepEqual(await saveAppIds(SIXTEEN), SIXTEEN.slice(0, 9));
  });

  test("switching to 3x3 removes apps 10 to 16 in the same write and reports them", async () => {
    fake.data.set(KEY, { version: 1, apps: SIXTEEN, grid: "4x4", open: "smart" });
    const result = await saveGridSize("3x3");
    assert.deepEqual(result, { size: "3x3", apps: SIXTEEN.slice(0, 9), removed: SIXTEEN.slice(9) });
    // 3x3 is stored by leaving the field out
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, apps: SIXTEEN.slice(0, 9), open: "smart" });
  });

  test("switching to 3x3 with 9 or fewer apps removes nothing", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"], grid: "4x4" });
    assert.deepEqual(await saveGridSize("3x3"), { size: "3x3", apps: ["google-drive"], removed: [] });
  });

  test("undo: saving the old size with the old list restores both", async () => {
    fake.data.set(KEY, { version: 1, apps: SIXTEEN, grid: "4x4" });
    await saveGridSize("3x3");
    assert.deepEqual(await saveGridSize("4x4", SIXTEEN), { size: "4x4", apps: SIXTEEN, removed: [] });
    assert.deepEqual(await loadAppIds(), SIXTEEN);
    assert.equal(await loadGridSize(), "4x4");
  });

  test("shows only what the grid holds if more apps are stored", async () => {
    fake.data.set(KEY, { version: 1, apps: SIXTEEN });
    assert.deepEqual(await loadAppIds(), SIXTEEN.slice(0, 9));
  });

  test("rejects an unknown size, or a storage failure, without writing", async () => {
    fake.data.set(KEY, { version: 1, apps: SIXTEEN, grid: "4x4" });
    await assert.rejects(saveGridSize("5x5"));
    fake.failNext = "set";
    await assert.rejects(saveGridSize("3x3"));
    assert.deepEqual(fake.data.get(KEY), { version: 1, apps: SIXTEEN, grid: "4x4" });
  });

  test("onGridSizeChanged reports the size", async () => {
    const seen = [];
    onGridSizeChanged((size) => seen.push(size));
    await saveGridSize("4x4");
    await resetSettings();
    assert.deepEqual(seen, ["4x4", "3x3"]);
  });
});

describe("4x4 default apps", () => {
  const DEFAULT_16 = [...DEFAULT_APP_IDS, ...DEFAULT_4X4_EXTRA_IDS];

  test("are the 9 defaults plus YouTube, Translate, Slides, Messages, Duck.ai, Meet and DuckDuckGo", () => {
    assert.deepEqual(defaultAppIds("3x3"), [...DEFAULT_APP_IDS]);
    assert.deepEqual(defaultAppIds("4x4").slice(9), [
      "google-youtube", "google-translate", "google-slides", "google-messages",
      "other-duckai", "google-meet", "other-duckduckgo",
    ]);
    assert.equal(new Set(defaultAppIds("4x4")).size, 16);
  });

  test("an unchanged grid gets all 16 when switching to 4x4, still stored by omission", async () => {
    fake.data.set(KEY, { version: 1, theme: "dark" });
    assert.deepEqual(await saveGridSize("4x4"), { size: "4x4", apps: DEFAULT_16, removed: [] });
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, theme: "dark", grid: "4x4" });
    assert.deepEqual(await loadAppIds(), DEFAULT_16);
  });

  test("a customized grid keeps its apps and gets empty spaces", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-keep", "google-gmail"] });
    const result = await saveGridSize("4x4");
    assert.deepEqual(result.apps, ["google-keep", "google-gmail"]);
  });

  test("picking exactly the defaults counts as unchanged", async () => {
    await saveAppIds([...DEFAULT_APP_IDS]);
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION });
    assert.deepEqual((await saveGridSize("4x4")).apps, DEFAULT_16);
  });

  test("changing any app makes the grid customized", async () => {
    await saveGridSize("4x4");
    const fifteen = DEFAULT_16.slice(0, 15);
    assert.deepEqual(await saveAppIds(fifteen), fifteen);
    assert.deepEqual(fake.data.get(KEY).apps, fifteen);
  });

  test("going back to 3x3 reports the 7 extras as removed, and Undo restores all 16", async () => {
    await saveGridSize("4x4");
    const result = await saveGridSize("3x3");
    assert.deepEqual(result, { size: "3x3", apps: [...DEFAULT_APP_IDS], removed: [...DEFAULT_4X4_EXTRA_IDS] });
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION });
    assert.deepEqual((await saveGridSize("4x4", DEFAULT_16)).apps, DEFAULT_16);
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION, grid: "4x4" });
  });
});

describe("loadIcon / saveIcon", () => {
  test("defaults to the grid", async () => {
    assert.deepEqual(ICONS, ["grid", "waffle"]);
    assert.equal(DEFAULT_ICON, "grid");
    assert.equal(await loadIcon(), "grid");
  });

  test("saves waffle, keeping the other settings", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-drive"], theme: "dark" });
    assert.equal(await saveIcon("waffle"), "waffle");
    assert.deepEqual(fake.data.get(KEY),
      { version: SETTINGS_VERSION, apps: ["google-drive"], theme: "dark", icon: "waffle" });
    assert.equal(await loadIcon(), "waffle");
  });

  test("grid is stored by leaving the field out", async () => {
    fake.data.set(KEY, { version: 1, icon: "waffle" });
    await saveIcon("grid");
    assert.deepEqual(fake.data.get(KEY), { version: SETTINGS_VERSION });
  });

  test("returns grid for an unknown value or a storage failure", async () => {
    fake.data.set(KEY, { version: 1, icon: "pancake" });
    assert.equal(await loadIcon(), "grid");
    fake.failNext = "get";
    assert.equal(await loadIcon(), "grid");
  });

  test("rejects an unknown icon without writing", async () => {
    await assert.rejects(saveIcon("pancake"));
    assert.equal(fake.data.has(KEY), false);
  });

  test("onIconChanged reports the icon", async () => {
    const seen = [];
    onIconChanged((icon) => seen.push(icon));
    await saveIcon("waffle");
    await resetSettings();
    assert.deepEqual(seen, ["waffle", "grid"]);
  });
});

describe("resetSettings", () => {
  test("removes all saved settings and returns every default", async () => {
    fake.data.set(KEY, { version: 1, apps: ["google-gmail"], theme: "dark", open: "smart", grid: "4x4" });
    assert.deepEqual(await resetSettings(),
      { apps: [...DEFAULT_APP_IDS], theme: "auto", open: "new-tab", grid: "3x3", icon: "grid" });
    assert.equal(fake.data.has(KEY), false);
    assert.deepEqual(await loadAppIds(), [...DEFAULT_APP_IDS]);
    assert.equal(await loadTheme(), "auto");
    assert.equal(await loadOpenMode(), "new-tab");
    assert.equal(await loadGridSize(), "3x3");
    assert.equal(await loadIcon(), "grid");
  });

  test("rejects when storage fails", async () => {
    fake.failNext = "remove";
    await assert.rejects(resetSettings());
  });
});

describe("sync safety", () => {
  test("loading never writes, so a newer version's data is left alone", async () => {
    const newer = { version: SETTINGS_VERSION + 1, apps: ["futureservice-mail", "google-gmail"], extra: true };
    fake.data.set(KEY, structuredClone(newer));
    assert.deepEqual(await loadAppIds(), ["google-gmail"]);
    await loadTheme();
    assert.deepEqual(fake.data.get(KEY), newer);
  });

  test("saving keeps fields from a newer version that this one doesn't know", async () => {
    fake.data.set(KEY, { version: SETTINGS_VERSION + 1, apps: ["google-gmail"], extra: true });
    await saveTheme("dark");
    assert.equal(fake.data.get(KEY).extra, true);
  });
});

describe("onAppIdsChanged", () => {
  test("reports the cleaned list when the setting changes", async () => {
    const seen = [];
    onAppIdsChanged((ids) => seen.push(ids));
    await saveAppIds(["google-drive", "bogus"]);
    await resetSettings();
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

describe("onThemeChanged", () => {
  test("reports the theme when the setting changes", async () => {
    const seen = [];
    onThemeChanged((theme) => seen.push(theme));
    await saveTheme("dark");
    await saveAppIds(["google-drive"]);
    await resetSettings();
    assert.deepEqual(seen, ["dark", "dark", "auto"]);
  });

  test("returns a function that stops listening", async () => {
    const seen = [];
    const stop = onThemeChanged((theme) => seen.push(theme));
    stop();
    await saveTheme("dark");
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
