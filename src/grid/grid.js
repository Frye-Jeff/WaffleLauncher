// -----------------------------------------------------------------------------
// App grid: tile building, drag-to-reorder and keyboard navigation, shared by
// the popup and the options page preview so the two always look and behave
// the same.
// -----------------------------------------------------------------------------
import { gridKeyAction } from "./keys.js";

// Custom drag type, so a tile dropped outside the grid carries nothing usable.
const DRAG_TYPE = "application/x-wafflelauncher-tile";

// Read locally to pick keyboard shortcuts; never stored or sent anywhere.
export const IS_MAC = /^Mac/i.test(navigator.platform);

// The reorder modifier, for hint text: "Ctrl" or "Ctrl or Option".
export const MOVE_KEY_LABEL = IS_MAC ? "Ctrl or Option" : "Ctrl";

// Per-grid keyboard state: which tile is the Tab stop, whether to put focus
// back on it after the next redraw, and the screen-reader announcement area.
const gridState = new WeakMap();

function stateFor(grid) {
  let state = gridState.get(grid);
  if (!state) {
    const live = document.createElement("div");
    live.className = "wl-sr-only";
    live.setAttribute("aria-live", "polite");
    grid.after(live);
    // focused: the keyboard is in this grid, so a redraw (which replaces the
    // focused element) must put focus back.
    state = { current: 0, refocus: false, focused: false, live };
    gridState.set(grid, state);
  }
  return state;
}

// Builds one <li> tile. With `onOpen`, the tile is a link that calls
// onOpen(app, event) when clicked, middle-clicked or activated with Enter
// (popup). Without it, the tile is display-only
// (options preview). `count` is the number of tiles, for the position that
// screen readers announce ("Gmail, 1 of 9").
export function createTile(app, index, { onOpen, count } = {}) {
  const tile = document.createElement("li");
  tile.className = "tile";
  tile.draggable = true;
  tile.dataset.index = String(index);
  tile.dataset.appId = app.id;
  tile.dataset.name = app.name;

  const body = document.createElement(onOpen ? "a" : "div");
  body.className = "tile-link";
  body.title = app.name;
  body.tabIndex = -1; // syncGrid() makes one tile the Tab stop
  if (count) body.setAttribute("aria-label", `${app.name}, ${index + 1} of ${count}`);
  body.draggable = false; // drag the whole tile, not the link
  if (onOpen) {
    body.href = app.url;
    body.addEventListener("click", (event) => {
      event.preventDefault();
      onOpen(app, event);
    });
    // Middle-click arrives as "auxclick", not "click".
    body.addEventListener("auxclick", (event) => {
      if (event.button !== 1) return;
      event.preventDefault();
      onOpen(app, event);
    });
    // Stop middle-button autoscroll from starting on a tile.
    body.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault();
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

// Call after every redraw of `grid`. Makes the current tile the grid's single
// Tab stop ("roving tabindex"), and puts focus back on it after a keyboard move.
export function syncGrid(grid) {
  const state = stateFor(grid);
  const links = [...grid.querySelectorAll(".tile-link")];
  if (!links.length) return;
  state.current = Math.min(state.current, links.length - 1);
  links.forEach((link, i) => { link.tabIndex = i === state.current ? 0 : -1; });
  const lostFocus = state.focused && !grid.contains(document.activeElement);
  if (state.refocus || lostFocus) {
    state.refocus = false;
    links[state.current].focus();
  }
}

function announce(grid, message) {
  const { live } = stateFor(grid);
  live.textContent = "";
  live.textContent = message;
}

// Arrow keys, Home and End move between tiles; with Ctrl (or Option on Mac)
// they move the focused tile. Calls onMove(fromIndex, toIndex) to reorder;
// the caller redraws (calling syncGrid) and may return a promise that settles
// once the change is saved.
export function enableKeyboardReorder(grid, onMove) {
  const state = stateFor(grid);
  const columns = () => getComputedStyle(grid).gridTemplateColumns.split(" ").length || 3;
  const tileFrom = (event) =>
    event.target instanceof Element ? event.target.closest(".tile") : null;

  // Clicking or tabbing to a tile makes it the Tab stop.
  grid.addEventListener("focusin", (event) => {
    const tile = tileFrom(event);
    if (!tile) return;
    state.focused = true;
    state.current = Number(tile.dataset.index);
    syncGrid(grid);
  });

  // Leaving the grid (Tab away, click elsewhere) ends focus tracking.
  grid.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !grid.contains(event.relatedTarget)) state.focused = false;
  });
  document.addEventListener("pointerdown", (event) => {
    if (!grid.contains(event.target)) state.focused = false;
  });

  grid.addEventListener("keydown", (event) => {
    const tile = tileFrom(event);
    if (!tile) return;
    const index = Number(tile.dataset.index);
    const count = grid.querySelectorAll(".tile").length;
    const action = gridKeyAction(event, index, count, columns(), IS_MAC);
    if (!action) return;
    event.preventDefault();

    state.current = action.to;
    state.refocus = true;
    if (action.type === "focus") {
      syncGrid(grid);
      return;
    }

    const { appId, name } = tile.dataset;
    Promise.resolve(onMove(index, action.to)).finally(() => {
      // Report where the tile actually ended up (it snaps back if saving failed).
      const tiles = [...grid.querySelectorAll(".tile")];
      const position = tiles.findIndex((t) => t.dataset.appId === appId);
      if (position < 0) return;
      announce(grid, position === action.to
        ? `${name} moved to position ${position + 1} of ${tiles.length}.`
        : `Couldn't move ${name}.`);
      state.current = position;
      syncGrid(grid);
    });
  });
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
