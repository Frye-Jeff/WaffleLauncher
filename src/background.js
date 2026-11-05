// -----------------------------------------------------------------------------
// Background (an event page: Firefox only wakes it for the events below).
//   - Adds "WaffleLauncher settings" to the toolbar button's right-click menu
//     (the `menus` permission, used for nothing else).
//   - Opens the settings page once, right after a fresh install.
// It stores nothing, logs nothing and makes no network requests.
// -----------------------------------------------------------------------------

export const MENU_ID = "wafflelauncher-settings";
export const MENU_TITLE = "WaffleLauncher settings";

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
}

register();
