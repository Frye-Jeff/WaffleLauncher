// -----------------------------------------------------------------------------
// Popup: shows the user's apps as a grid. Click a tile to open the app in a
// new tab; drag a tile onto another to reorder.
// -----------------------------------------------------------------------------
import { APPS } from "../apps.js";
import {
  loadAppIds,
  loadGridSize,
  loadOpenMode,
  loadTheme,
  moveItem,
  onAppIdsChanged,
  onGridSizeChanged,
  onOpenModeChanged,
  onThemeChanged,
  saveAppIds,
} from "../settings.js";
import {
  IS_MAC,
  createTile,
  enableDragReorder,
  enableKeyboardReorder,
  syncGrid,
} from "../grid/grid.js";
import { clickKind, normalClickTarget } from "../open.js";
import { applyTheme } from "../theme.js";

const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]));

const grid = document.getElementById("grid");
let appIds = [];
let openMode = "new-tab";

// The active tab's URL, only needed for the "smart" setting. Readable thanks
// to the activeTab permission while the popup is open; used once for the
// comparison in normalClickTarget() and never stored or sent.
async function activeTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch {
    return undefined;
  }
}

// The one place apps are opened.
async function openApp(app, event) {
  if (clickKind(event, IS_MAC) === "background") {
    // Ctrl/Cmd/middle-click: open behind, keep the popup open for more.
    await browser.tabs.create({ url: app.url, active: false });
    return;
  }
  try {
    const tab = openMode === "smart" ? await activeTab() : undefined;
    if (tab && normalClickTarget(openMode, tab.url) === "current") {
      await browser.tabs.update(tab.id, { url: app.url });
    } else {
      await browser.tabs.create({ url: app.url });
    }
  } finally {
    window.close();
  }
}

function render(ids) {
  appIds = ids.filter((id) => APP_BY_ID.has(id));
  grid.replaceChildren(
    ...appIds.map((id, index) =>
      createTile(APP_BY_ID.get(id), index, { onOpen: openApp, count: appIds.length }))
  );
  syncGrid(grid);
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

// The grid's column count comes from its size (see grid.css).
function applyGridSize(size) {
  grid.dataset.size = size;
}

enableDragReorder(grid, reorder);
enableKeyboardReorder(grid, reorder);
const [ids, theme, mode, size] =
  await Promise.all([loadAppIds(), loadTheme(), loadOpenMode(), loadGridSize()]);
applyTheme(theme); // before drawing, so the grid appears in the right theme
applyGridSize(size);
openMode = mode;
render(ids);
onAppIdsChanged(render);
onThemeChanged(applyTheme);
onOpenModeChanged((next) => { openMode = next; });
onGridSizeChanged(applyGridSize);
