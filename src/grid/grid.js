// -----------------------------------------------------------------------------
// App grid: tile building and drag-to-reorder, shared by the popup and the
// options page preview so the two always look and behave the same.
// -----------------------------------------------------------------------------

// Custom drag type, so a tile dropped outside the grid carries nothing usable.
const DRAG_TYPE = "application/x-wafflelauncher-tile";

// Builds one <li> tile. With `onOpen`, the tile is a link that calls
// onOpen(app) when activated (popup). Without it, the tile is display-only
// (options preview).
export function createTile(app, index, { onOpen } = {}) {
  const tile = document.createElement("li");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.index = String(index);
  tile.dataset.appId = app.id;

  const body = document.createElement(onOpen ? "a" : "div");
  body.className = "tile-link";
  body.title = app.name;
  body.draggable = false; // drag the whole tile, not the link
  if (onOpen) {
    body.href = app.url;
    body.addEventListener("click", (event) => {
      event.preventDefault();
      onOpen(app);
    });
  }

  const icon = document.createElement("img");
  icon.className = "tile-icon";
  icon.src = browser.runtime.getURL(app.icon);
  icon.alt = ""; // the label below names the tile
  icon.draggable = false;

  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = app.shortName;

  body.append(icon, label);
  tile.append(body);
  return tile;
}

// Lets the user drag a tile in `grid` onto another tile. Calls
// onMove(fromIndex, toIndex) on a drop; the caller reorders and redraws.
export function enableDragReorder(grid, onMove) {
  let dragFrom = null;

  const tileFrom = (event) =>
    event.target instanceof Element ? event.target.closest(".tile") : null;

  const clearDropTargets = () => {
    for (const tile of grid.querySelectorAll(".is-drop-target")) {
      tile.classList.remove("is-drop-target");
    }
  };

  grid.addEventListener("dragstart", (event) => {
    const tile = tileFrom(event);
    if (!tile) return;
    dragFrom = Number(tile.dataset.index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_TYPE, tile.dataset.appId);
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
    if (from !== to) onMove(from, to);
  });

  grid.addEventListener("dragend", () => {
    dragFrom = null;
    clearDropTargets();
    for (const tile of grid.querySelectorAll(".is-dragging")) {
      tile.classList.remove("is-dragging");
    }
  });
}
