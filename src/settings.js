// -----------------------------------------------------------------------------
// Settings: the only code that reads or writes storage.
//
// The add-on stores exactly one setting object:
//   storage.sync  "settings" = { version: 1, apps: ["google-gmail", ...], theme: "dark" }
//   - apps   the user's chosen apps, in grid order (absent = the defaults)
//   - theme  "light" or "dark" (absent = "auto", follow Firefox)
// Nothing about browsing, clicks or usage is ever stored.
//
// Each save updates only its own field and keeps the rest, so saving apps never
// loses the theme and vice versa. Every app list going in or out is cleaned the
// same way (known IDs only, no duplicates, at most GRID_SIZE), so the popup and
// options page always agree.
// -----------------------------------------------------------------------------
import { APPS, DEFAULT_APP_IDS, GRID_SIZE } from "./apps.js";

const STORAGE_KEY = "settings";
export const SETTINGS_VERSION = 1;

export const THEMES = Object.freeze(["auto", "light", "dark"]);
export const DEFAULT_THEME = "auto";

const KNOWN_IDS = new Set(APPS.map((app) => app.id));

// Returns a valid app list: known IDs only, first occurrence wins, capped at
// GRID_SIZE. Anything that isn't an array becomes an empty list.
export function cleanAppIds(ids) {
  const clean = [];
  if (!Array.isArray(ids)) return clean;
  for (const id of ids) {
    if (clean.length === GRID_SIZE) break;
    if (typeof id === "string" && KNOWN_IDS.has(id) && !clean.includes(id)) {
      clean.push(id);
    }
  }
  return clean;
}

// Turns a stored settings object into the list to show. Falls back to the
// defaults when nothing usable is stored. Unknown IDs (for example, apps added
// by a newer WaffleLauncher on another synced device) are skipped here but left
// untouched in storage until the user saves a change on this device.
function appIdsFrom(stored) {
  const ids = cleanAppIds(stored?.apps);
  return ids.length ? ids : [...DEFAULT_APP_IDS];
}

// Turns a stored settings object into a valid theme, defaulting to "auto".
function themeFrom(stored) {
  return THEMES.includes(stored?.theme) ? stored.theme : DEFAULT_THEME;
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

// Saves the user's apps (keeping the theme) and returns the list that was
// actually saved. An empty list restores the default apps. Rejects if storage
// fails, so the caller can tell the user the change wasn't saved.
export async function saveAppIds(ids) {
  const clean = cleanAppIds(ids);
  const settings = await readForUpdate();
  if (clean.length) settings.apps = clean;
  else delete settings.apps;
  await write(settings);
  return clean.length ? clean : [...DEFAULT_APP_IDS];
}

// Loads the user's theme: "auto", "light" or "dark". Never throws: on any
// storage problem it returns "auto".
export async function loadTheme() {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    return themeFrom(result?.[STORAGE_KEY]);
  } catch {
    return DEFAULT_THEME;
  }
}

// Saves the user's theme (keeping the apps) and returns it. "auto" is stored
// by leaving the field out. Rejects on an unknown theme or a storage failure.
export async function saveTheme(theme) {
  if (!THEMES.includes(theme)) throw new Error(`Unknown theme: ${theme}`);
  const settings = await readForUpdate();
  if (theme === DEFAULT_THEME) delete settings.theme;
  else settings.theme = theme;
  await write(settings);
  return theme;
}

// Removes all saved settings, so the default apps and the "auto" theme apply.
// Returns the defaults. Rejects if storage fails.
export async function resetSettings() {
  await browser.storage.sync.remove(STORAGE_KEY);
  return { apps: [...DEFAULT_APP_IDS], theme: DEFAULT_THEME };
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
