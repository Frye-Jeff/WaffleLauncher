// -----------------------------------------------------------------------------
// Options page: choose which apps appear (checkboxes grouped by service), their
// order (drag in the grid preview), how apps open, the theme and the grid size.
// Every change saves immediately.
// -----------------------------------------------------------------------------
import { APPS } from "../apps.js";
import { catalog } from "../catalog.js";
import {
  DEFAULT_GRID_SIZE,
  gridCapacity,
  loadAppIds,
  loadGridSize,
  loadIcon,
  loadOpenMode,
  loadTheme,
  moveItem,
  onAppIdsChanged,
  onGridSizeChanged,
  onIconChanged,
  onOpenModeChanged,
  onThemeChanged,
  resetSettings,
  saveAppIds,
  saveGridSize,
  saveIcon,
  saveOpenMode,
  saveTheme,
} from "../settings.js";
import {
  IS_MAC,
  MOVE_KEY_LABEL,
  createTile,
  enableDragReorder,
  enableKeyboardReorder,
  syncGrid,
} from "../grid/grid.js";
import { applyTheme } from "../theme.js";

const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]));
const STATUS_MS = 2000;

const grid = document.getElementById("grid");
const count = document.getElementById("count");
const limitHint = document.getElementById("limit-hint");
const orderHint = document.getElementById("order-hint");
const fullNote = document.getElementById("full-note");
const services = document.getElementById("services");
const restore = document.getElementById("restore");
const status = document.getElementById("status");
const backgroundNote = document.getElementById("background-note");
const removedNote = document.getElementById("removed-note");
const removedText = document.getElementById("removed-text");
const undo = document.getElementById("undo");
const gridInputs = [...document.querySelectorAll('input[name="grid"]')];

const checkboxes = new Map(); // app id -> <input type="checkbox">
let appIds = [];
let gridSize = DEFAULT_GRID_SIZE;
let capacity = gridCapacity(gridSize);
let undoState; // { size, apps } to restore with Undo
let statusTimer;

// --- Drawing ----------------------------------------------------------------
function buildPickerItem(app) {
  const item = document.createElement("li");

  const label = document.createElement("label");
  label.className = "picker-item";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = app.id;
  input.addEventListener("change", () => toggleApp(app.id, input.checked));
  checkboxes.set(app.id, input);

  const icon = document.createElement("img");
  icon.className = "picker-icon";
  icon.src = browser.runtime.getURL(app.icon);
  icon.alt = "";

  const name = document.createElement("span");
  name.textContent = app.name;

  label.append(input, icon, name);
  item.append(label);
  return item;
}

// One heading per service, then one alphabetized list per group.
function buildPicker() {
  for (const service of catalog()) {
    const heading = document.createElement("h3");
    heading.textContent = service.name;
    services.append(heading);

    for (const section of service.sections) {
      if (section.name) {
        const subheading = document.createElement("h4");
        subheading.textContent = section.name;
        services.append(subheading);
      }
      const list = document.createElement("ul");
      list.className = "picker";
      list.setAttribute("aria-label",
        section.name ? `${service.name}: ${section.name}` : `${service.name} apps`);
      list.append(...section.apps.map(buildPickerItem));
      services.append(list);
    }
  }
}

function render(ids) {
  appIds = ids.filter((id) => APP_BY_ID.has(id));

  grid.replaceChildren(
    ...appIds.map((id, index) => createTile(APP_BY_ID.get(id), index, { count: appIds.length }))
  );
  syncGrid(grid);
  count.textContent = `${appIds.length} of ${capacity} apps.`;

  const full = appIds.length >= capacity;
  const onlyOne = appIds.length === 1;
  fullNote.hidden = !full;
  for (const [id, input] of checkboxes) {
    input.checked = appIds.includes(id);
    // Full grid: can't add more. One app left: can't remove it (never empty).
    input.disabled = (full && !input.checked) || (onlyOne && input.checked);
    input.title = input.disabled
      ? input.checked ? "Your grid needs at least one app." : "Your grid is full."
      : "";
  }
}

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  if (!isError) statusTimer = setTimeout(() => { status.textContent = ""; }, STATUS_MS);
}

// Shows a grid size without saving it: the radio buttons, the preview's
// columns and the app limit. Call render() afterwards to update the count.
function showGridSize(size) {
  gridSize = size;
  capacity = gridCapacity(size);
  grid.dataset.size = size;
  for (const input of gridInputs) input.checked = input.value === size;
  limitHint.textContent = `Pick up to ${capacity} apps. New apps are added to the end of your grid.`;
}

// After a switch to a smaller grid: names the removed apps and offers Undo,
// which saves `before` ({ size, apps }) again.
function showRemoved(removed, before) {
  if (!removed.length) {
    hideRemoved();
    return;
  }
  const names = removed.map((id) => APP_BY_ID.get(id).name);
  const list = new Intl.ListFormat("en", { type: "conjunction" }).format(names);
  removedText.textContent = `Removed ${list} from your grid.`;
  undoState = before;
  removedNote.hidden = false;
}

function hideRemoved() {
  undoState = undefined;
  removedNote.hidden = true;
}

// --- Changes (each saves immediately) -----------------------------------------
async function commit(next) {
  hideRemoved(); // Undo would bring back the old list, losing this change
  const previous = appIds;
  render(next);
  try {
    render(await saveAppIds(next));
    showStatus("Saved");
  } catch {
    render(previous); // not saved: show what's actually stored
    showStatus("Couldn't save. Please try again.", true);
  }
}

function toggleApp(id, checked) {
  const next = checked ? [...appIds, id] : appIds.filter((appId) => appId !== id);
  commit(next);
}

// A group of radio buttons for one setting (`name`): saves a change
// immediately, and calls `apply(value)` whenever the shown value changes.
// Returns a function that shows a value without saving it.
function radioSetting(name, save, apply = () => {}) {
  const inputs = [...document.querySelectorAll(`input[name="${name}"]`)];
  let value;
  const show = (next) => {
    value = next;
    apply(value);
    for (const input of inputs) input.checked = input.value === value;
  };
  for (const input of inputs) {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      const previous = value;
      show(input.value);
      try {
        show(await save(input.value));
        showStatus("Saved");
      } catch {
        show(previous); // not saved: show what's actually stored
        showStatus("Couldn't save. Please try again.", true);
      }
    });
  }
  return show;
}

const showOpenMode = radioSetting("open", saveOpenMode);
const showTheme = radioSetting("theme", saveTheme, applyTheme);
const showIcon = radioSetting("icon", saveIcon); // background.js updates the button

// Saves a grid size (with `ids`, or the saved apps if omitted) and shows the
// result. Returns what was saved, or undefined if it couldn't be saved.
async function changeGridSize(size, ids) {
  const before = { size: gridSize, apps: appIds };
  try {
    const saved = await saveGridSize(size, ids);
    showGridSize(saved.size);
    render(saved.apps);
    showStatus("Saved");
    return { saved, before };
  } catch {
    showGridSize(before.size); // not saved: show what's actually stored
    render(before.apps);
    showStatus("Couldn't save. Please try again.", true);
    return undefined;
  }
}

// Restores the size and apps from before the last switch to a smaller grid.
async function undoGridSize() {
  if (!undoState) return;
  if (await changeGridSize(undoState.size, undoState.apps)) hideRemoved();
}

for (const input of gridInputs) {
  input.addEventListener("change", async () => {
    if (!input.checked) return;
    // Picking the larger size again while Undo is offered is the same as Undo,
    // so the removed apps come back instead of empty spaces.
    if (undoState && input.value === undoState.size) {
      await undoGridSize();
      return;
    }
    const result = await changeGridSize(input.value);
    if (result) showRemoved(result.saved.removed, result.before);
  });
}

undo.addEventListener("click", undoGridSize);

// Resets everything: the default apps, opening in a new tab, the Automatic
// theme, the 3×3 grid and the grid toolbar icon.
async function restoreDefaults() {
  try {
    const defaults = await resetSettings();
    hideRemoved();
    showGridSize(defaults.grid);
    render(defaults.apps);
    showOpenMode(defaults.open);
    showTheme(defaults.theme);
    showIcon(defaults.icon);
    showStatus("Saved");
  } catch {
    showStatus("Couldn't save. Please try again.", true);
  }
}

// --- Start ------------------------------------------------------------------
buildPicker();
const reorder = (from, to) => commit(moveItem(appIds, from, to));
enableDragReorder(grid, reorder);
enableKeyboardReorder(grid, reorder);
orderHint.textContent =
  `Drag apps to change their order. With the keyboard, use the arrow keys to pick an app and ${MOVE_KEY_LABEL} + arrow keys to move it.`;
backgroundNote.textContent =
  `${IS_MAC ? "Cmd" : "Ctrl"}-click or middle-click an app to open it in a background tab ` +
  "and keep the popup open, whichever setting you choose.";
restore.addEventListener("click", restoreDefaults);
const [ids, savedOpenMode, savedTheme, savedGridSize, savedIcon] =
  await Promise.all([loadAppIds(), loadOpenMode(), loadTheme(), loadGridSize(), loadIcon()]);
showTheme(savedTheme);
showIcon(savedIcon);
showOpenMode(savedOpenMode);
showGridSize(savedGridSize);
render(ids);
// A grid size change also changes the app list, so the size is shown first
// and the list (which follows in the same event) redraws the count.
onGridSizeChanged(showGridSize);
onAppIdsChanged(render);
onOpenModeChanged(showOpenMode);
onThemeChanged(showTheme);
onIconChanged(showIcon);
