// -----------------------------------------------------------------------------
// Popup: shows the user's apps as a grid. Click a tile to open the app in a
// new tab; drag a tile onto another to reorder.
// -----------------------------------------------------------------------------
import { APPS } from "../apps.js";
import { loadAppIds, moveItem, onAppIdsChanged, saveAppIds } from "../settings.js";

const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]));
// Custom drag type, so a tile dropped outside the popup carries nothing usable.
const DRAG_TYPE = "application/x-wafflelauncher-tile";

const grid = document.getElementById("grid");
let appIds = [];
let dragFrom = null;

// The one place apps are opened. Later: Ctrl/middle-click and a
// new-tab/current-tab setting hook in here.
function openApp(app) {
  browser.tabs.create({ url: app.url }).finally(() => window.close());
}

function createTile(app, index) {
  const tile = document.createElement("li");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.index = String(index);

  const link = document.createElement("a");
  link.className = "tile-link";
  link.href = app.url;
  link.title = app.name;
  link.draggable = false; // drag the whole tile, not the link
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openApp(app);
  });

  const icon = document.createElement("img");
  icon.className = "tile-icon";
  icon.src = browser.runtime.getURL(app.icon);
  icon.alt = ""; // the label below names the link
  icon.draggable = false;

  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = app.shortName;

  link.append(icon, label);
  tile.append(link);
  return tile;
}

function render(ids) {
  appIds = ids.filter((id) => APP_BY_ID.has(id));
  grid.replaceChildren(...appIds.map((id, index) => createTile(APP_BY_ID.get(id), index)));
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

// --- Drag and drop ----------------------------------------------------------
function tileFrom(event) {
  return event.target instanceof Element ? event.target.closest(".tile") : null;
}

function clearDropTargets() {
  for (const tile of grid.querySelectorAll(".is-drop-target")) {
    tile.classList.remove("is-drop-target");
  }
}

grid.addEventListener("dragstart", (event) => {
  const tile = tileFrom(event);
  if (!tile) return;
  dragFrom = Number(tile.dataset.index);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(DRAG_TYPE, appIds[dragFrom]);
  tile.classList.add("is-dragging");
});

grid.addEventListener("dragover", (event) => {
  const tile = tileFrom(event);
  if (dragFrom === null || !tile) return;
  event.preventDefault(); // allow dropping here
  event.dataTransfer.dropEffect = "move";
  if (!tile.classList.contains("is-drop-target")) {
    clearDropTargets();
    if (Number(tile.dataset.index) !== dragFrom) tile.classList.add("is-drop-target");
  }
});

grid.addEventListener("dragleave", (event) => {
  const tile = tileFrom(event);
  if (tile && !tile.contains(event.relatedTarget)) tile.classList.remove("is-drop-target");
});

grid.addEventListener("drop", (event) => {
  const tile = tileFrom(event);
  if (dragFrom === null || !tile) return;
  event.preventDefault();
  const from = dragFrom;
  const to = Number(tile.dataset.index);
  if (from !== to) reorder(from, to);
});

grid.addEventListener("dragend", () => {
  dragFrom = null;
  clearDropTargets();
  for (const tile of grid.querySelectorAll(".is-dragging")) {
    tile.classList.remove("is-dragging");
  }
});

// --- Start ------------------------------------------------------------------
render(await loadAppIds());
onAppIdsChanged(render);
