// -----------------------------------------------------------------------------
// Settings: the only code that reads or writes storage.
//
// The add-on stores exactly one thing, the user's chosen apps in grid order:
//   storage.sync  "settings" = { version: 1, apps: ["google-gmail", ...] }
// Nothing about browsing, clicks or usage is ever stored.
//
// Every list going in or out is cleaned the same way (known IDs only, no
// duplicates, at most GRID_SIZE), so the popup and options page always agree.
// -----------------------------------------------------------------------------
import { APPS, DEFAULT_APP_IDS, GRID_SIZE } from "./apps.js";

const STORAGE_KEY = "settings";
export const SETTINGS_VERSION = 1;

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

// Saves the user's apps and returns the list that was actually saved. Saving an
// empty list resets to the defaults. Rejects if storage fails, so the caller can
// tell the user the change wasn't saved.
export async function saveAppIds(ids) {
  const clean = cleanAppIds(ids);
  if (!clean.length) return resetAppIds();
  await browser.storage.sync.set({
    [STORAGE_KEY]: { version: SETTINGS_VERSION, apps: clean },
  });
  return clean;
}

// Removes the saved setting so the defaults apply, and returns the defaults.
// Rejects if storage fails.
export async function resetAppIds() {
  await browser.storage.sync.remove(STORAGE_KEY);
  return [...DEFAULT_APP_IDS];
}

// Calls `callback(ids)` with the cleaned list whenever the setting changes,
// whether from this device's popup or options page or from another synced
// device. Returns a function that stops listening.
export function onAppIdsChanged(callback) {
  const listener = (changes, areaName) => {
    if (areaName === "sync" && Object.hasOwn(changes, STORAGE_KEY)) {
      callback(appIdsFrom(changes[STORAGE_KEY].newValue));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
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
