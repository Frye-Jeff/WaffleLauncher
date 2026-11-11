// -----------------------------------------------------------------------------
// Background (an event page: Firefox only wakes it for the events below).
//   - Adds "WaffleLauncher settings" to the toolbar button's right-click menu
//     (the `menus` permission, used for nothing else).
//   - Opens the settings page once, right after a fresh install.
//   - Shows the toolbar icon the user chose (the grid or the waffle logo).
// It stores nothing, logs nothing and makes no network requests.
// -----------------------------------------------------------------------------
import { loadIcon, onIconChanged } from "./settings.js";

export const MENU_ID = "wafflelauncher-settings";
export const MENU_TITLE = "WaffleLauncher settings";
export const WAFFLE_ICON = "icons/waffle.svg";

// Sets the toolbar icon. "grid" resets it to the manifest's icon, which
// follows light and dark Firefox themes; the waffle logo has its own colors.
async function applyIcon(api, icon) {
  try {
    await api.action.setIcon(icon === "waffle" ? { path: WAFFLE_ICON } : {});
  } catch {
    // Keep whatever icon is showing; the setting is still saved.
  }
}

// (Re)creates the right-click item. removeAll() first, so waking up again
// never fails on a duplicate ID.
async function createMenu(api) {
  await api.menus.removeAll();
  api.menus.create({ id: MENU_ID, title: MENU_TITLE, contexts: ["action"] });
}

export function register(api = globalThis.browser) {
  api.runtime.onInstalled.addListener(async ({ reason }) => {
    await createMenu(api);
    // Only a brand-new install, not updates or Firefox restarts.
    if (reason === "install") await api.runtime.openOptionsPage();
  });

  api.runtime.onStartup.addListener(() => createMenu(api));

  api.menus.onClicked.addListener((info) => {
    if (info.menuItemId === MENU_ID) api.runtime.openOptionsPage();
  });

  // A set icon lasts until Firefox closes, so apply the saved one every time
  // this page loads (startup, install, or re-enabling the add-on), and again
  // whenever the setting changes.
  onIconChanged((icon) => applyIcon(api, icon));
  return loadIcon().then((icon) => applyIcon(api, icon));
}

register();
