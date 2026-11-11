// -----------------------------------------------------------------------------
// Settings: the only code that reads or writes storage.
//
// The add-on stores exactly one setting object:
//   storage.sync  "settings" = { version: 1, apps: [...], theme: "dark", open: "smart", grid: "4x4" }
//   - apps   the user's chosen apps, in grid order (absent = the defaults)
//   - theme  "light" or "dark" (absent = "auto", follow Firefox)
//   - open   "smart" (absent = "new-tab"): how a normal click opens an app
//   - grid   "4x4" (absent = "3x3"): the grid size
// Nothing about browsing, clicks or usage is ever stored.
//
// Each save updates only its own field and keeps the rest, so saving one
// setting never loses another. Every app list going in or out is cleaned the
// same way (known IDs only, no duplicates, no more than the grid holds), so
// the popup and options page always agree.
// -----------------------------------------------------------------------------
import { APPS, DEFAULT_APP_IDS, MAX_APPS } from "./apps.js";

const STORAGE_KEY = "settings";
export const SETTINGS_VERSION = 1;

export const THEMES = Object.freeze(["auto", "light", "dark"]);
export const DEFAULT_THEME = "auto";

export const OPEN_MODES = Object.freeze(["new-tab", "smart"]);
export const DEFAULT_OPEN_MODE = "new-tab";

// Grid sizes. The grid is square: "4x4" has 4 columns and holds 16 apps.
export const GRID_SIZES = Object.freeze(["3x3", "4x4"]);
export const DEFAULT_GRID_SIZE = "3x3";

export function gridColumns(size) {
  return size === "4x4" ? 4 : 3;
}

export function gridCapacity(size) {
  return gridColumns(size) ** 2;
}

const KNOWN_IDS = new Set(APPS.map((app) => app.id));

// Returns a valid app list: known IDs only, first occurrence wins, capped at
// `max` (the largest grid by default). Anything that isn't an array becomes an
// empty list.
export function cleanAppIds(ids, max = MAX_APPS) {
  const clean = [];
  if (!Array.isArray(ids)) return clean;
  for (const id of ids) {
    if (clean.length === max) break;
    if (typeof id === "string" && KNOWN_IDS.has(id) && !clean.includes(id)) {
      clean.push(id);
    }
  }
  return clean;
}

// Turns a stored settings object into the list to show. Falls back to the
// defaults when nothing usable is stored. Unknown IDs (for example, apps added
// by a newer WaffleLauncher on another synced device) are skipped here but left
// untouched in storage until the user saves a change on this device. Only as
// many apps as the stored grid size holds are shown.
function appIdsFrom(stored) {
  const ids = cleanAppIds(stored?.apps, gridCapacity(gridSizeFrom(stored)));
  return ids.length ? ids : [...DEFAULT_APP_IDS];
}

// Turns a stored settings object into a valid grid size, defaulting to "3x3".
function gridSizeFrom(stored) {
  return GRID_SIZES.includes(stored?.grid) ? stored.grid : DEFAULT_GRID_SIZE;
}

// Turns a stored settings object into a valid theme, defaulting to "auto".
function themeFrom(stored) {
  return THEMES.includes(stored?.theme) ? stored.theme : DEFAULT_THEME;
}

// Turns a stored settings object into a valid open mode, defaulting to "new-tab".
function openModeFrom(stored) {
  return OPEN_MODES.includes(stored?.open) ? stored.open : DEFAULT_OPEN_MODE;
}

// Reads the stored settings object for an update. Rejects if storage fails, so
// a save never overwrites settings it couldn't read. Keeps fields it doesn't
// know (from a newer version on another synced device).
async function readForUpdate() {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  const stored = result?.[STORAGE_KEY];
  return stored && typeof stored === "object" && !Array.isArray(stored) ? { ...stored } : {};
}

async function write(settings) {
  await browser.storage.sync.set({
    [STORAGE_KEY]: { ...settings, version: SETTINGS_VERSION },
  });
}

// Loads the user's apps. Never throws: on any storage problem the defaults are
// returned, so the popup always has something to show.
export async function loadAppIds() {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    return appIdsFrom(result?.[STORAGE_KEY]);
  } catch {
    return [...DEFAULT_APP_IDS];
  }
}

// Puts a cleaned app list into `settings`, capped at what its grid size
// holds, and returns the list to show. An empty list means the defaults.
function setAppIds(settings, ids) {
  const clean = cleanAppIds(ids, gridCapacity(gridSizeFrom(settings)));
  if (clean.length) settings.apps = clean;
  else delete settings.apps;
  return clean.length ? clean : [...DEFAULT_APP_IDS];
}

// Saves the user's apps (keeping the other settings) and returns the list that
// was actually saved. An empty list restores the default apps. Rejects if
// storage fails, so the caller can tell the user the change wasn't saved.
export async function saveAppIds(ids) {
  const settings = await readForUpdate();
  const saved = setAppIds(settings, ids);
  await write(settings);
  return saved;
}

// Loads one choice-type setting. Never throws: on any storage problem it
// returns `fallback`.
async function loadChoice(read, fallback) {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    return read(result?.[STORAGE_KEY]);
  } catch {
    return fallback;
  }
}

// Saves one choice-type setting (keeping the others) and returns it. The
// default value is stored by leaving the field out. Rejects on an unknown
// value or a storage failure.
async function saveChoice(field, value, allowed, fallback) {
  if (!allowed.includes(value)) throw new Error(`Unknown ${field}: ${value}`);
  const settings = await readForUpdate();
  if (value === fallback) delete settings[field];
  else settings[field] = value;
  await write(settings);
  return value;
}

// The user's theme: "auto", "light" or "dark".
export function loadTheme() {
  return loadChoice(themeFrom, DEFAULT_THEME);
}

export function saveTheme(theme) {
  return saveChoice("theme", theme, THEMES, DEFAULT_THEME);
}

// How a normal click opens an app: "new-tab" or "smart".
export function loadOpenMode() {
  return loadChoice(openModeFrom, DEFAULT_OPEN_MODE);
}

export function saveOpenMode(mode) {
  return saveChoice("open", mode, OPEN_MODES, DEFAULT_OPEN_MODE);
}

// The grid size: "3x3" or "4x4".
export function loadGridSize() {
  return loadChoice(gridSizeFrom, DEFAULT_GRID_SIZE);
}

// Saves the grid size and, in the same write, the app list to go with it, so
// the two can never disagree. `ids` defaults to the saved apps; apps past what
// the new size holds are removed. Returns { size, apps, removed }: the apps to
// show, and the IDs that were removed (so the caller can offer Undo by saving
// the old size and list again). Rejects on an unknown size or a storage
// failure, without writing.
export async function saveGridSize(size, ids) {
  if (!GRID_SIZES.includes(size)) throw new Error(`Unknown grid: ${size}`);
  const settings = await readForUpdate();
  const before = cleanAppIds(ids ?? settings.apps);
  if (size === DEFAULT_GRID_SIZE) delete settings.grid;
  else settings.grid = size;
  const apps = setAppIds(settings, before);
  await write(settings);
  return { size, apps, removed: before.filter((id) => !apps.includes(id)) };
}

// Removes all saved settings, so every default applies again. Returns the
// defaults. Rejects if storage fails.
export async function resetSettings() {
  await browser.storage.sync.remove(STORAGE_KEY);
  return {
    apps: [...DEFAULT_APP_IDS],
    theme: DEFAULT_THEME,
    open: DEFAULT_OPEN_MODE,
    grid: DEFAULT_GRID_SIZE,
  };
}

// Calls `callback(value)` whenever the settings change, whether from this
// device's popup or options page or from another synced device. Returns a
// function that stops listening.
function onSettingsChanged(read, callback) {
  const listener = (changes, areaName) => {
    if (areaName === "sync" && Object.hasOwn(changes, STORAGE_KEY)) {
      callback(read(changes[STORAGE_KEY].newValue));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

// Calls `callback(ids)` with the cleaned app list when the settings change.
export function onAppIdsChanged(callback) {
  return onSettingsChanged(appIdsFrom, callback);
}

// Calls `callback(theme)` with the theme when the settings change.
export function onThemeChanged(callback) {
  return onSettingsChanged(themeFrom, callback);
}

// Calls `callback(mode)` with the open mode when the settings change.
export function onOpenModeChanged(callback) {
  return onSettingsChanged(openModeFrom, callback);
}

// Calls `callback(size)` with the grid size when the settings change.
export function onGridSizeChanged(callback) {
  return onSettingsChanged(gridSizeFrom, callback);
}

// Returns a copy of `list` with the item at index `from` moved to index `to`.
// Out-of-range or non-integer positions return an unchanged copy. Used by
// drag-and-drop, and later by keyboard reordering.
export function moveItem(list, from, to) {
  const copy = [...list];
  const inRange = (i) => Number.isInteger(i) && i >= 0 && i < copy.length;
  if (!inRange(from) || !inRange(to) || from === to) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
