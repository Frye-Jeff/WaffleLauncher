// -----------------------------------------------------------------------------
// Popup: shows the user's apps as a grid. Click a tile to open the app in a
// new tab; drag a tile onto another to reorder.
// -----------------------------------------------------------------------------
import { APPS } from "../apps.js";
import { loadAppIds, moveItem, onAppIdsChanged, saveAppIds } from "../settings.js";
import { createTile, enableDragReorder } from "../grid/grid.js";

const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]));

const grid = document.getElementById("grid");
let appIds = [];

// The one place apps are opened. Later: Ctrl/middle-click and a
// new-tab/current-tab setting hook in here.
function openApp(app) {
  browser.tabs.create({ url: app.url }).finally(() => window.close());
}

function render(ids) {
  appIds = ids.filter((id) => APP_BY_ID.has(id));
  grid.replaceChildren(
    ...appIds.map((id, index) => createTile(APP_BY_ID.get(id), index, { onOpen: openApp }))
  );
}

async function reorder(from, to) {
  const saved = appIds;
  const next = moveItem(appIds, from, to);
  render(next);
  try {
    await saveAppIds(next);
  } catch {
    render(saved); // not saved: show the order that's actually stored
  }
}

enableDragReorder(grid, reorder);
render(await loadAppIds());
onAppIdsChanged(render);
